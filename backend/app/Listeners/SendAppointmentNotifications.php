<?php

namespace App\Listeners;

use App\Enums\ActorRole;
use App\Enums\AppointmentStatus;
use App\Enums\ClinicPermission;
use App\Enums\MembershipStatus;
use App\Events\AppointmentBooked;
use App\Events\AppointmentRescheduled;
use App\Events\AppointmentStatusChanged;
use App\Models\Appointment;
use App\Models\ClinicMembership;
use App\Notifications\AppointmentNotification;
use App\Services\Scheduling\AvailabilityService;
use Illuminate\Events\Dispatcher;

/**
 * Fans appointment events out to the right recipients (notifications are queued themselves)
 * and keeps the doctor's denormalized next_available_at current for discovery.
 */
class SendAppointmentNotifications
{
    public function __construct(private readonly AvailabilityService $availability) {}

    public function booked(AppointmentBooked $event): void
    {
        $a = $event->appointment->loadMissing(['doctorProfile.user', 'patientProfile.user']);
        $a->patientProfile->user->notify(new AppointmentNotification($a, 'booked_patient'));
        $a->doctorProfile->user->notify(new AppointmentNotification($a, 'booked_doctor'));
        $this->notifyClinicStaff($a, 'booked_clinic');
        $this->availability->refreshNextAvailable($a->doctorProfile);
    }

    public function statusChanged(AppointmentStatusChanged $event): void
    {
        $a = $event->appointment->loadMissing(['doctorProfile.user', 'patientProfile.user']);
        $status = $a->status;
        $eventName = match (true) {
            $status->isCancellation() => 'cancelled',
            default => $status->value,
        };

        // Tell the other party; the actor already knows.
        if ($event->actorRole !== ActorRole::Patient) {
            $a->patientProfile->user->notify(new AppointmentNotification($a, $eventName));
        }
        if (in_array($event->actorRole, [ActorRole::Patient, ActorRole::Clinic, ActorRole::Admin, ActorRole::System], true)
            && in_array($status, [AppointmentStatus::CancelledByPatient, AppointmentStatus::CancelledByClinic,
                AppointmentStatus::CancelledByAdmin, AppointmentStatus::Confirmed], true)) {
            $a->doctorProfile->user->notify(new AppointmentNotification($a, $eventName));
        }

        if (! $status->isBlocking()) {
            $this->availability->refreshNextAvailable($a->doctorProfile);
        }
    }

    public function rescheduled(AppointmentRescheduled $event): void
    {
        $new = $event->replacement->loadMissing(['doctorProfile.user', 'patientProfile.user']);
        $new->doctorProfile->user->notify(new AppointmentNotification($new, 'rescheduled_doctor'));
        $new->patientProfile->user->notify(new AppointmentNotification($new, 'rescheduled_patient'));
        $this->notifyClinicStaff($new, 'rescheduled_doctor');
        $this->availability->refreshNextAvailable($new->doctorProfile);
    }

    private function notifyClinicStaff(Appointment $a, string $eventName): void
    {
        if (! $a->clinic_id) {
            return;
        }
        ClinicMembership::with('user')
            ->where('clinic_id', $a->clinic_id)
            ->where('status', MembershipStatus::Active->value)
            ->get()
            ->filter(fn (ClinicMembership $m) => $m->role->can(ClinicPermission::ViewAppointments)
                && $m->user_id !== $a->doctorProfile->user_id)
            ->each(fn (ClinicMembership $m) => $m->user->notify(new AppointmentNotification($a, $eventName)));
    }

    /** @return array<class-string, string> */
    public function subscribe(Dispatcher $events): array
    {
        return [
            AppointmentBooked::class => 'booked',
            AppointmentStatusChanged::class => 'statusChanged',
            AppointmentRescheduled::class => 'rescheduled',
        ];
    }
}
