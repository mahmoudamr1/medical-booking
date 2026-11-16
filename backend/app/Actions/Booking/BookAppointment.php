<?php

namespace App\Actions\Booking;

use App\Enums\ActorRole;
use App\Enums\AppointmentStatus;
use App\Enums\BookingMode;
use App\Events\AppointmentBooked;
use App\Exceptions\BusinessRuleException;
use App\Models\Appointment;
use App\Models\DoctorProfile;
use App\Models\MedicalService;
use App\Models\PatientProfile;
use App\Models\User;
use App\Services\Scheduling\AvailabilityService;
use App\Services\Settings;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Creates an appointment safely under concurrency.
 *
 * Inside ONE transaction:
 *  1. lock the doctor's row (serializes bookings for that doctor → deterministic 409s),
 *  2. expire stale pending holds for that doctor,
 *  3. revalidate the requested slot with the same engine that produced the availability,
 *  4. insert + record history.
 * The PostgreSQL exclusion constraint (appointments_no_doctor_overlap) is the final guarantee;
 * its violation (SQLSTATE 23P01) is translated to a 409 conflict.
 * Side effects (notifications, search denormalization) run after commit.
 */
final class BookAppointment
{
    public function __construct(
        private readonly AvailabilityService $availability,
        private readonly ExpireStaleHolds $expireHolds,
        private readonly Settings $settings,
    ) {}

    /**
     * @param  'patient'|'clinic_staff'|'admin'  $via
     * @param  callable(DoctorProfile):void|null  $beforeInsert  hook used by rescheduling; runs inside the
     *                                                           transaction after the doctor lock, before revalidation
     */
    public function handle(
        PatientProfile $patient,
        string $doctorId,
        string $serviceId,
        CarbonImmutable $startsAt,
        User $bookedBy,
        string $via = 'patient',
        ?string $notes = null,
        ?callable $beforeInsert = null,
        ?string $rescheduledFromId = null,
    ): Appointment {
        try {
            $appointment = DB::transaction(function () use ($patient, $doctorId, $serviceId, $startsAt, $bookedBy, $via, $notes, $beforeInsert, $rescheduledFromId) {
                $doctor = DoctorProfile::with('user')->lockForUpdate()->find($doctorId)
                    ?? throw BusinessRuleException::unprocessable('doctor_unavailable', __('booking.doctor_unavailable'));

                if ($doctor->user_id === $patient->user_id) {
                    throw BusinessRuleException::unprocessable('self_booking', __('booking.self_booking'));
                }

                $service = MedicalService::with('branch.clinic')->where('doctor_profile_id', $doctor->id)->find($serviceId)
                    ?? throw BusinessRuleException::unprocessable('service_invalid', __('booking.service_invalid'),
                        ['service_id' => [__('booking.service_invalid')]]);

                if (! $this->availability->isBookable($doctor, $service)) {
                    throw BusinessRuleException::unprocessable('doctor_unavailable', __('booking.doctor_unavailable'));
                }

                $this->expireHolds->forDoctor($doctor->id);

                if ($beforeInsert !== null) {
                    $beforeInsert($doctor);
                }

                if (! $this->availability->isSlotAvailable($doctor, $service, $startsAt)) {
                    throw BusinessRuleException::conflict('booking_conflict', __('booking.slot_unavailable'),
                        ['starts_at' => [__('booking.slot_unavailable')]]);
                }

                $endsAt = $startsAt->addMinutes($service->duration_minutes);
                $manual = $doctor->booking_mode === BookingMode::Manual;
                $status = $manual ? AppointmentStatus::PendingConfirmation : AppointmentStatus::Confirmed;
                $holdUntil = $manual
                    ? CarbonImmutable::now()->addMinutes($this->settings->int('pending_hold_minutes'))->min($startsAt)
                    : null;

                $appointment = new Appointment([
                    'reference' => $this->reference(),
                    'doctor_profile_id' => $doctor->id,
                    'patient_profile_id' => $patient->id,
                    'medical_service_id' => $service->id,
                    'clinic_branch_id' => $service->clinic_branch_id,
                    'clinic_id' => $service->clinic_id,
                    'consultation_type' => $service->consultation_type,
                    'starts_at' => $startsAt,
                    'ends_at' => $endsAt,
                    'blocked_until' => $endsAt->addMinutes($doctor->buffer_minutes),
                    'price' => $service->price,
                    'hold_expires_at' => $holdUntil,
                    'booked_by_user_id' => $bookedBy->id,
                    'booked_via' => $via,
                    'patient_notes' => $notes,
                    'rescheduled_from_id' => $rescheduledFromId,
                ]);
                $appointment->status = $status;
                $appointment->confirmed_at = $manual ? null : now()->toImmutable();
                $appointment->save();

                $appointment->histories()->create([
                    'from_status' => null,
                    'to_status' => $status,
                    'actor_user_id' => $bookedBy->id,
                    'actor_role' => match ($via) {
                        'clinic_staff' => ActorRole::Clinic,
                        'admin' => ActorRole::Admin,
                        default => ActorRole::Patient,
                    },
                    'metadata' => $rescheduledFromId ? ['rescheduled_from' => $rescheduledFromId] : null,
                ]);

                return $appointment;
            });
        } catch (QueryException $e) {
            if ($e->getCode() === '23P01') { // exclusion_violation: concurrent overlapping booking won
                throw BusinessRuleException::conflict('booking_conflict', __('booking.slot_unavailable'),
                    ['starts_at' => [__('booking.slot_unavailable')]]);
            }
            throw $e;
        }

        if ($rescheduledFromId === null) {
            AppointmentBooked::dispatch($appointment);
        }

        return $appointment;
    }

    private function reference(): string
    {
        do {
            $ref = 'MB-'.strtoupper(Str::random(7));
            $ref = strtr($ref, ['0' => '2', 'O' => '3', 'I' => '4', 'L' => '5', '1' => '6']);
        } while (Appointment::where('reference', $ref)->exists());

        return $ref;
    }
}
