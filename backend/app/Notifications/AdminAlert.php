<?php

namespace App\Notifications;

/** Operational alerts for administrators: review_reported, urgent_flagged, suspicious_activity. */
class AdminAlert extends BaseNotification
{
    /** @param array<string, mixed> $context */
    public function __construct(public readonly string $alert, public readonly array $context = [])
    {
        parent::__construct();
    }

    public function kind(): string
    {
        return 'admin.'.$this->alert;
    }

    protected function payload(object $notifiable): array
    {
        return $this->context;
    }

    protected function lines(object $notifiable): array
    {
        return [
            'title' => __("notifications.admin.{$this->alert}.title"),
            'body' => __("notifications.admin.{$this->alert}.body"),
        ];
    }
}
