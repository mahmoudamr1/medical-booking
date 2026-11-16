<?php

namespace App\Actions\Booking;

use App\Enums\ActorRole;
use App\Events\AppointmentRescheduled;
use App\Exceptions\BusinessRuleException;
use App\Models\Appointment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

/**
 * Atomic reschedule: one transaction that (1) locks the doctor and the original appointment,
 * (2) cancels the original with reason "rescheduled", (3) books the new period with full
 * revalidation. If ANY step fails the transaction rolls back and the original appointment is
 * untouched — the patient never loses their existing booking.
 */
final class RescheduleAppointment
{
    public function __construct(
        private readonly BookAppointment $book,
        private readonly TransitionAppointment $transition,
    ) {}

    public function handle(Appointment $original, CarbonImmutable $newStartsAt, User $actor, ?string $serviceId = null): Appointment
    {
        $original->loadMissing(['patientProfile', 'doctorProfile']);
        if ($original->patientProfile->user_id !== $actor->id) {
            throw new AuthorizationException;
        }
        if (! $original->status->isBlocking()) {
            throw BusinessRuleException::conflict('invalid_transition', __('booking.cannot_reschedule'));
        }

        $new = DB::transaction(function () use ($original, $newStartsAt, $actor, $serviceId) {
            return $this->book->handle(
                patient: $original->patientProfile,
                doctorId: $original->doctor_profile_id,
                serviceId: $serviceId ?? $original->medical_service_id,
                startsAt: $newStartsAt,
                bookedBy: $actor,
                notes: $original->patient_notes,
                beforeInsert: function () use ($original, $actor) {
                    // Runs after the doctor row lock; applies the patient cancellation policy.
                    $this->transition->handle($original, 'cancel', $actor, 'rescheduled', ActorRole::Patient, notify: false);
                },
                rescheduledFromId: $original->id,
            );
        });

        AppointmentRescheduled::dispatch($original->fresh(), $new);

        return $new;
    }
}
