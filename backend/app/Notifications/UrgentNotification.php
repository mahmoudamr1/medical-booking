<?php

namespace App\Notifications;

use App\Models\UrgentRequest;

/**
 * Urgent events: new_request (to doctors — redacted: no name/phone/exact location),
 * accepted (to patient), taken (to doctors who lost the race), waiting (to patient: no doctor
 * available right now, kept open until :until), redispatched (to patient: a doctor became available
 * and was notified — not a promise of acceptance), unmatched (to patient: honest "no doctor
 * accepted", suggests retrying or booking an appointment), cancelled (to the accepted doctor).
 */
class UrgentNotification extends BaseNotification
{
    public function __construct(public readonly UrgentRequest $request, public readonly string $event)
    {
        parent::__construct();
        $this->onQueue('urgent');
    }

    public function kind(): string
    {
        return 'urgent.'.$this->event;
    }

    protected function payload(object $notifiable): array
    {
        return [
            'urgent_request_id' => $this->request->id,
            'status' => $this->request->status->value,
            'severity' => $this->request->severity->value,
        ];
    }

    protected function lines(object $notifiable): array
    {
        $r = $this->request->loadMissing(['specialty', 'city', 'governorate', 'acceptedDoctor.user']);
        $ar = app()->getLocale() === 'ar';

        return [
            'title' => __("notifications.urgent.{$this->event}.title"),
            'body' => __("notifications.urgent.{$this->event}.body", [
                'specialty' => $r->specialty ? ($ar ? $r->specialty->name_ar : $r->specialty->name_en) : __('urgent.any_specialty'),
                'place' => $r->city ? ($ar ? $r->city->name_ar : $r->city->name_en) : ($ar ? $r->governorate?->name_ar : $r->governorate?->name_en),
                'doctor' => $r->acceptedDoctor?->user->name ?? '',
                'severity' => __("urgent.severity.{$r->severity->value}"),
                'until' => $r->keep_open_until?->setTimezone(config('app.business_timezone'))
                    ->locale(app()->getLocale())->isoFormat('h:mm a') ?? '',
            ]),
        ];
    }
}
