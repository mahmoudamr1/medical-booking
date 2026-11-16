<?php

namespace App\Notifications;

use App\Models\Appointment;
use Carbon\CarbonImmutable;

/**
 * One notification class for appointment events, parameterized by $event:
 *   booked_patient, booked_doctor, booked_clinic, confirmed, rejected, cancelled, completed,
 *   no_show, expired, rescheduled_doctor, rescheduled_patient, reminder
 * Body text comes from lang/{ar,en}/notifications.php → appointment.{event}.
 */
class AppointmentNotification extends BaseNotification
{
    public function __construct(public readonly Appointment $appointment, public readonly string $event)
    {
        parent::__construct();
    }

    public function kind(): string
    {
        return 'appointment.'.$this->event;
    }

    protected function payload(object $notifiable): array
    {
        return [
            'appointment_id' => $this->appointment->id,
            'reference' => $this->appointment->reference,
            'status' => $this->appointment->status->value,
            'starts_at' => $this->appointment->starts_at->toIso8601String(),
        ];
    }

    protected function lines(object $notifiable): array
    {
        $a = $this->appointment->loadMissing(['doctorProfile.user', 'patientProfile.user']);
        $tz = $a->doctorProfile->timezone;
        $when = CarbonImmutable::parse($a->starts_at)->setTimezone($tz)->locale(app()->getLocale())->isoFormat('dddd D MMMM YYYY - h:mm a');

        return [
            'title' => __("notifications.appointment.{$this->event}.title"),
            'body' => __("notifications.appointment.{$this->event}.body", [
                'reference' => $a->reference,
                'doctor' => $a->doctorProfile->user->name,
                'patient' => $a->patientProfile->user->name,
                'when' => $when,
                'reason' => $a->cancellation_reason ?? '',
            ]),
        ];
    }
}
