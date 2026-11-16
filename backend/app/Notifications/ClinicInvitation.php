<?php

namespace App\Notifications;

use App\Models\Clinic;
use App\Models\ClinicMembership;

class ClinicInvitation extends BaseNotification
{
    public function __construct(public readonly Clinic $clinic, public readonly ClinicMembership $membership)
    {
        parent::__construct();
    }

    public function kind(): string
    {
        return 'clinic.invitation';
    }

    protected function payload(object $notifiable): array
    {
        return ['clinic_id' => $this->clinic->id, 'membership_id' => $this->membership->id, 'role' => $this->membership->role->value];
    }

    protected function lines(object $notifiable): array
    {
        return [
            'title' => __('notifications.clinic_invitation.title'),
            'body' => __('notifications.clinic_invitation.body', [
                'clinic' => app()->getLocale() === 'ar' ? $this->clinic->name_ar : $this->clinic->name_en,
                'role' => __('clinic.roles.'.$this->membership->role->value),
            ]),
        ];
    }
}
