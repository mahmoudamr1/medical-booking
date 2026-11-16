<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Database-persisted + emailed notifications, queued and dispatched after the surrounding
 * transaction commits. Messages are rendered in the recipient's locale.
 *
 * Subclasses implement kind(), payload() and lines().
 */
abstract class BaseNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [10, 60, 300];

    public function __construct()
    {
        $this->afterCommit();
    }

    /** Stable machine identifier used by the frontend, e.g. "appointment.booked". */
    abstract public function kind(): string;

    /** @return array<string, mixed> structured, non-sensitive data for the UI */
    abstract protected function payload(object $notifiable): array;

    /** @return array{title:string, body:string} already localized */
    abstract protected function lines(object $notifiable): array;

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (config('mail.default') !== 'array' && ($notifiable->email ?? null)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toArray(object $notifiable): array
    {
        // Store both languages so the UI can show the viewer's current language, not the one at send time.
        $render = function (string $locale) use ($notifiable) {
            $previous = app()->getLocale();
            app()->setLocale($locale);
            try {
                return $this->lines($notifiable);
            } finally {
                app()->setLocale($previous);
            }
        };
        $ar = $render('ar');
        $en = $render('en');
        $primary = ($notifiable->locale ?? 'ar') === 'en' ? $en : $ar;

        return ['kind' => $this->kind()] + $primary + [
            'i18n' => ['ar' => $ar, 'en' => $en],
            'data' => $this->payload($notifiable),
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return $this->inLocale($notifiable, function () use ($notifiable) {
            ['title' => $title, 'body' => $body] = $this->lines($notifiable);

            return (new MailMessage)->subject($title)->line($body)
                ->action(__('notifications.open_platform'), (string) config('app.frontend_url'));
        });
    }

    private function inLocale(object $notifiable, callable $fn): mixed
    {
        $previous = app()->getLocale();
        app()->setLocale($notifiable->locale ?? 'ar');
        try {
            return $fn();
        } finally {
            app()->setLocale($previous);
        }
    }
}
