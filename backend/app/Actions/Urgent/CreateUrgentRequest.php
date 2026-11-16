<?php

namespace App\Actions\Urgent;

use App\Enums\UrgentSeverity;
use App\Enums\UrgentStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\Consent;
use App\Models\PatientProfile;
use App\Models\UrgentRequest;
use App\Services\Settings;
use App\Services\Urgent\UrgentDispatcher;
use App\Services\Urgent\VolunteerMatcher;
use Illuminate\Support\Facades\DB;

/**
 * Patient urgent-consultation intake. Every severity, including critical, is routed to live doctors.
 * - Requires consent to share the minimum information with matched doctors (consent recorded).
 * - Optional preferred doctor: must be eligible right now (422 preferred_doctor_unavailable),
 *   using exactly the rules of the directed dispatch step.
 * - Abuse protection: one open request per patient, and a per-hour cap from settings
 *   (plus route-level throttling).
 * - Keep-open deadline (stored): if nobody can take the request it waits for a doctor to become
 *   available until submission + urgent_wait_max_minutes (0 = no waiting).
 */
final class CreateUrgentRequest
{
    public function __construct(
        private readonly Settings $settings,
        private readonly UrgentDispatcher $dispatcher,
        private readonly VolunteerMatcher $matcher,
    ) {}

    /** @param array<string, mixed> $data validated input */
    public function handle(PatientProfile $patient, array $data, ?string $ip): UrgentRequest
    {
        if (! $this->settings->get('urgent_enabled')) {
            throw BusinessRuleException::unprocessable('urgent_disabled', __('urgent.disabled'));
        }

        $request = DB::transaction(function () use ($patient, $data, $ip) {
            // Serialize concurrent submissions from the same patient.
            PatientProfile::whereKey($patient->id)->lockForUpdate()->first();

            if (UrgentRequest::where('patient_profile_id', $patient->id)->whereIn('status', UrgentStatus::OPEN)->exists()) {
                throw BusinessRuleException::conflict('urgent_open_exists', __('urgent.open_exists'));
            }
            $recent = UrgentRequest::where('patient_profile_id', $patient->id)->where('created_at', '>', now()->subHour())->count();
            if ($recent >= $this->settings->int('urgent_requests_per_hour')) {
                throw new BusinessRuleException(__('urgent.rate_limited'), 'rate_limited', 429);
            }

            $consent = Consent::create([
                'user_id' => $patient->user_id, 'type' => 'urgent_data_sharing', 'granted' => true,
                'granted_at' => now(), 'ip_address' => $ip,
            ]);

            $request = new UrgentRequest([
                'patient_profile_id' => $patient->id,
                'severity' => UrgentSeverity::from($data['severity']),
                'preferred_doctor_profile_id' => $data['preferred_doctor_id'] ?? null,
                'specialty_id' => $data['specialty_id'] ?? null,
                'description' => $data['description'],
                'consultation_type' => $data['consultation_type'],
                'governorate_id' => $data['governorate_id'],
                'city_id' => $data['city_id'] ?? null,
                'area_id' => $data['area_id'] ?? null,
                'location_details' => $data['location_details'] ?? null,
                'contact_phone' => $data['contact_phone'],
                'consent_id' => $consent->id,
            ]);
            // Safety net for the sweeper if queued jobs are lost.
            $request->expires_at = now()->addSeconds($this->dispatcher->matchingWindowSeconds($request) + 120)->toImmutable();
            $waitMinutes = $this->settings->int('urgent_wait_max_minutes');
            $request->keep_open_until = $waitMinutes > 0 ? now()->addMinutes($waitMinutes)->toImmutable() : null;
            $request->status = UrgentStatus::Searching;
            $request->save();

            $request->setRelation('patientProfile', $patient);
            if ($request->preferred_doctor_profile_id !== null && $this->matcher->eligible($request, 0)->isEmpty()) {
                throw BusinessRuleException::unprocessable('preferred_doctor_unavailable', __('urgent.preferred_doctor_unavailable'),
                    ['preferred_doctor_id' => [__('urgent.preferred_doctor_unavailable')]]);
            }

            return $request;
        });

        $this->dispatcher->start($request);

        return $request->fresh() ?? $request;
    }
}
