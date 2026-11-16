<?php

namespace App\Actions\Doctors;

use App\Enums\VerificationStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\DoctorProfile;
use App\Models\User;
use App\Notifications\DoctorVerificationRequested;
use App\Notifications\DoctorVerificationResult;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use InvalidArgumentException;

/**
 * Doctor verification lifecycle:
 *   draft|rejected --submit(doctor)--> pending
 *   pending --approve|reject(admin)--> approved|rejected
 *   approved --suspend(admin)--> suspended --reinstate(admin)--> approved
 * A doctor can never review their own application.
 */
final class ReviewDoctorVerification
{
    private const ADMIN_TRANSITIONS = [
        'approve' => [[VerificationStatus::Pending], VerificationStatus::Approved],
        'reject' => [[VerificationStatus::Pending], VerificationStatus::Rejected],
        'suspend' => [[VerificationStatus::Approved, VerificationStatus::Pending], VerificationStatus::Suspended],
        'reinstate' => [[VerificationStatus::Suspended], VerificationStatus::Approved],
    ];

    public function __construct(private readonly AuditLogger $audit) {}

    public function submit(DoctorProfile $doctor): DoctorProfile
    {
        if (! in_array($doctor->verification_status, [VerificationStatus::Draft, VerificationStatus::Rejected], true)) {
            throw BusinessRuleException::conflict('invalid_transition', __('doctors.verification.cannot_submit'));
        }

        $missing = [];
        if (! $doctor->license_number) {
            $missing['license_number'] = [__('doctors.verification.license_required')];
        }
        if (! $doctor->specialties()->exists()) {
            $missing['specialties'] = [__('doctors.verification.specialty_required')];
        }
        if (! $doctor->documents()->where('type', 'license')->exists()) {
            $missing['documents'] = [__('doctors.verification.license_document_required')];
        }
        if ($missing) {
            throw BusinessRuleException::unprocessable('verification_incomplete', __('doctors.verification.incomplete'), $missing);
        }

        DB::transaction(function () use ($doctor) {
            $doctor->forceFill([
                'verification_status' => VerificationStatus::Pending,
                'verification_submitted_at' => now(),
                'verification_notes' => null,
            ])->save();
            $this->audit->log('doctor.verification.submitted', $doctor);
        });

        Notification::send(
            User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->get(),
            new DoctorVerificationRequested($doctor),
        );

        return $doctor;
    }

    public function review(DoctorProfile $doctor, string $decision, User $admin, ?string $notes = null): DoctorProfile
    {
        [$from, $to] = self::ADMIN_TRANSITIONS[$decision] ?? throw new InvalidArgumentException($decision);

        if ($doctor->user_id === $admin->id) {
            throw BusinessRuleException::conflict('self_review', __('doctors.verification.self_review'));
        }
        if (! in_array($doctor->verification_status, $from, true)) {
            throw BusinessRuleException::conflict('invalid_transition', __('doctors.verification.invalid_transition'));
        }
        if ($decision === 'reject' && blank($notes)) {
            throw BusinessRuleException::unprocessable('notes_required', __('doctors.verification.notes_required'),
                ['notes' => [__('doctors.verification.notes_required')]]);
        }

        $previous = $doctor->verification_status;
        DB::transaction(function () use ($doctor, $to, $admin, $notes, $previous, $decision) {
            $doctor->forceFill([
                'verification_status' => $to,
                'verification_notes' => $notes,
                'verified_at' => $to === VerificationStatus::Approved ? now() : $doctor->verified_at,
                'verified_by' => $admin->id,
            ])->save();

            $this->audit->log("doctor.verification.{$decision}", $doctor, [
                'from' => $previous->value, 'to' => $to->value, 'notes' => $notes,
            ], $admin->id);
        });

        $doctor->user->notify(new DoctorVerificationResult($to, $notes));

        return $doctor;
    }
}
