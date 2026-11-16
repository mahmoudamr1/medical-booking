<?php

namespace App\Actions\Booking;

use App\Enums\ActorRole;
use App\Enums\AppointmentStatus;
use App\Enums\ClinicPermission;
use App\Events\AppointmentStatusChanged;
use App\Exceptions\BusinessRuleException;
use App\Models\Appointment;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

/**
 * The only way to change an appointment's status.
 *
 * Checks, in order: who the actor is relative to the appointment, whether that actor kind may
 * perform this action, whether the state machine allows it, and time/policy rules. Records
 * a status history row with actor + reason, all under a row lock.
 */
final class TransitionAppointment
{
    /** action => [target status, allowed actor roles] */
    private const ACTIONS = [
        'confirm' => [AppointmentStatus::Confirmed, [ActorRole::Doctor, ActorRole::Clinic]],
        'reject' => [AppointmentStatus::Rejected, [ActorRole::Doctor, ActorRole::Clinic]],
        'complete' => [AppointmentStatus::Completed, [ActorRole::Doctor, ActorRole::Clinic]],
        'no_show' => [AppointmentStatus::NoShow, [ActorRole::Doctor, ActorRole::Clinic]],
        'cancel' => [null, [ActorRole::Patient, ActorRole::Doctor, ActorRole::Clinic, ActorRole::Admin]],
    ];

    /**
     * @param  'confirm'|'reject'|'complete'|'no_show'|'cancel'  $action
     * @param  ActorRole|null  $as  force acting capacity (e.g. admin); otherwise derived from relation to the appointment
     */
    public function handle(Appointment $appointment, string $action, User $actor, ?string $reason = null, ?ActorRole $as = null, bool $notify = true): Appointment
    {
        [$target, $allowedRoles] = self::ACTIONS[$action];

        $result = DB::transaction(function () use ($appointment, $action, $actor, $reason, $as, $target, $allowedRoles) {
            $locked = Appointment::with(['doctorProfile', 'patientProfile'])->lockForUpdate()->findOrFail($appointment->id);

            $role = $as ?? $this->roleOf($locked, $actor, $allowedRoles);
            if ($role === null || ! in_array($role, $allowedRoles, true)) {
                throw new AuthorizationException;
            }

            $to = $target ?? match ($role) {
                ActorRole::Patient => AppointmentStatus::CancelledByPatient,
                ActorRole::Doctor => AppointmentStatus::CancelledByDoctor,
                ActorRole::Clinic => AppointmentStatus::CancelledByClinic,
                ActorRole::Admin => AppointmentStatus::CancelledByAdmin,
            };

            $from = $locked->status;
            if (! $from->canTransitionTo($to)) {
                throw BusinessRuleException::conflict('invalid_transition', __('booking.invalid_transition', [
                    'from' => __('booking.status.'.$from->value), 'to' => __('booking.status.'.$to->value),
                ]));
            }

            $this->checkPolicy($locked, $action, $role, $reason);

            $locked->status = $to;
            match (true) {
                $to === AppointmentStatus::Confirmed => $locked->confirmed_at = now()->toImmutable(),
                $to === AppointmentStatus::Completed => $locked->completed_at = now()->toImmutable(),
                $to->isCancellation() => [$locked->cancelled_at, $locked->cancelled_by_user_id, $locked->cancellation_reason]
                    = [now()->toImmutable(), $actor->id, $reason],
                default => null,
            };
            $locked->save();

            $locked->histories()->create([
                'from_status' => $from,
                'to_status' => $to,
                'actor_user_id' => $actor->id,
                'actor_role' => $role,
                'reason' => $reason,
            ]);

            return [$locked, $from, $role];
        });

        [$updated, $from, $role] = $result;
        if ($notify) {
            AppointmentStatusChanged::dispatch($updated, $from, $role);
        }

        return $updated;
    }

    /** Derive the actor's capacity from their relationship to this appointment. */
    public function roleOf(Appointment $appointment, User $actor, array $preferred = []): ?ActorRole
    {
        $candidates = [];
        if ($appointment->patientProfile?->user_id === $actor->id) {
            $candidates[] = ActorRole::Patient;
        }
        if ($appointment->doctorProfile?->user_id === $actor->id) {
            $candidates[] = ActorRole::Doctor;
        }
        if ($appointment->clinic_id && $actor->hasClinicPermission($appointment->clinic_id, ClinicPermission::ManageAppointments)) {
            $candidates[] = ActorRole::Clinic;
        }
        foreach ($candidates as $candidate) {
            if (in_array($candidate, $preferred, true)) {
                return $candidate;
            }
        }

        return $candidates[0] ?? null;
    }

    private function checkPolicy(Appointment $a, string $action, ActorRole $role, ?string $reason): void
    {
        $started = $a->starts_at->isPast();

        if (in_array($action, ['complete', 'no_show'], true) && ! $started) {
            throw BusinessRuleException::conflict('too_early', __('booking.not_started_yet'));
        }

        if ($action === 'confirm' && $started) {
            throw BusinessRuleException::conflict('too_late', __('booking.already_started'));
        }

        if ($action === 'cancel') {
            if ($started && $role !== ActorRole::Admin) {
                throw BusinessRuleException::conflict('too_late', __('booking.already_started'));
            }
            if (in_array($role, [ActorRole::Doctor, ActorRole::Clinic, ActorRole::Admin], true) && blank($reason)) {
                throw BusinessRuleException::unprocessable('reason_required', __('booking.reason_required'),
                    ['reason' => [__('booking.reason_required')]]);
            }
            // Patient cancellation policy applies to confirmed appointments; pending requests can be withdrawn.
            if ($role === ActorRole::Patient && $a->status === AppointmentStatus::Confirmed) {
                $hours = $a->doctorProfile->min_cancellation_hours;
                if (now()->diffInMinutes($a->starts_at, false) < $hours * 60) {
                    throw BusinessRuleException::conflict('policy_violation', __('booking.cancellation_window', ['hours' => $hours]));
                }
            }
        }

        if ($action === 'reject' && blank($reason)) {
            throw BusinessRuleException::unprocessable('reason_required', __('booking.reason_required'),
                ['reason' => [__('booking.reason_required')]]);
        }
    }
}
