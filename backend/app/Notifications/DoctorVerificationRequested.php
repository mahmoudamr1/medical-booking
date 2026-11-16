<?php

namespace App\Notifications;

use App\Models\DoctorProfile;

/** Sent to administrators when a doctor submits documents for review. */
class DoctorVerificationRequested extends BaseNotification
{
    public function __construct(public readonly DoctorProfile $doctor)
    {
        parent::__construct();
    }

    public function kind(): string
    {
        return 'admin.verification.requested';
    }

    protected function payload(object $notifiable): array
    {
        return ['doctor_id' => $this->doctor->id];
    }

    protected function lines(object $notifiable): array
    {
        return [
            'title' => __('notifications.verification_requested.title'),
            'body' => __('notifications.verification_requested.body', ['name' => $this->doctor->user->name]),
        ];
    }
}
