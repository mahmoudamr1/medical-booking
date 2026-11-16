<?php

namespace App\Notifications;

use App\Enums\VerificationStatus;

class DoctorVerificationResult extends BaseNotification
{
    public function __construct(public readonly VerificationStatus $status, public readonly ?string $notes)
    {
        parent::__construct();
    }

    public function kind(): string
    {
        return 'doctor.verification.'.$this->status->value;
    }

    protected function payload(object $notifiable): array
    {
        return ['status' => $this->status->value, 'notes' => $this->notes];
    }

    protected function lines(object $notifiable): array
    {
        return [
            'title' => __('notifications.verification.title'),
            'body' => __('notifications.verification.'.$this->status->value).($this->notes ? ' — '.$this->notes : ''),
        ];
    }
}
