<?php

namespace App\Enums;

/**
 * Appointment lifecycle. Transitions are explicit; everything else is rejected.
 *
 *   pending_confirmation → confirmed | rejected | expired | cancelled_by_*
 *   confirmed            → completed | no_show | cancelled_by_*
 *   all others           → terminal
 */
enum AppointmentStatus: string
{
    use HasValues;

    case PendingConfirmation = 'pending_confirmation';
    case Confirmed = 'confirmed';
    case Completed = 'completed';
    case CancelledByPatient = 'cancelled_by_patient';
    case CancelledByDoctor = 'cancelled_by_doctor';
    case CancelledByClinic = 'cancelled_by_clinic';
    case CancelledByAdmin = 'cancelled_by_admin';
    case Rejected = 'rejected';
    case Expired = 'expired';
    case NoShow = 'no_show';

    /** Statuses that occupy the doctor's time (enforced by the DB exclusion constraint). */
    public const BLOCKING = ['pending_confirmation', 'confirmed'];

    /** @return list<self> */
    public function allowedTransitions(): array
    {
        $cancellations = [self::CancelledByPatient, self::CancelledByDoctor, self::CancelledByClinic, self::CancelledByAdmin];

        return match ($this) {
            self::PendingConfirmation => [self::Confirmed, self::Rejected, self::Expired, ...$cancellations],
            self::Confirmed => [self::Completed, self::NoShow, ...$cancellations],
            default => [],
        };
    }

    public function canTransitionTo(self $to): bool
    {
        return in_array($to, $this->allowedTransitions(), true);
    }

    public function isBlocking(): bool
    {
        return in_array($this->value, self::BLOCKING, true);
    }

    public function isTerminal(): bool
    {
        return $this->allowedTransitions() === [];
    }

    public function isCancellation(): bool
    {
        return str_starts_with($this->value, 'cancelled_by_');
    }

    /** Dashboard grouping used by the patient UI. */
    public function group(): string
    {
        return match (true) {
            $this === self::PendingConfirmation => 'pending',
            $this === self::Confirmed => 'upcoming',
            $this === self::Completed => 'completed',
            default => 'cancelled', // cancelled_*, rejected, expired, no_show
        };
    }
}
