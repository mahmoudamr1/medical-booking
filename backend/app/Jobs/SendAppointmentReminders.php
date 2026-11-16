<?php

namespace App\Jobs;

use App\Models\Appointment;
use App\Notifications\AppointmentNotification;
use App\Services\Settings;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\DB;

/**
 * Reminds patient and doctor about confirmed appointments starting within the configured window.
 * Idempotent: each appointment is claimed atomically via reminded_at before notifying.
 */
class SendAppointmentReminders implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 3;

    public function handle(Settings $settings): void
    {
        $until = now()->addHours($settings->int('reminder_hours_before'));

        Appointment::where('status', 'confirmed')
            ->whereNull('reminded_at')
            ->whereBetween('starts_at', [now(), $until])
            ->orderBy('starts_at')
            ->chunkById(100, function ($appointments) {
                foreach ($appointments as $a) {
                    // Claim first so concurrent workers / retries never double-send.
                    $claimed = DB::table('appointments')->where('id', $a->id)->whereNull('reminded_at')
                        ->update(['reminded_at' => now()]);
                    if (! $claimed) {
                        continue;
                    }
                    $a->load(['patientProfile.user', 'doctorProfile.user']);
                    $a->patientProfile->user->notify(new AppointmentNotification($a, 'reminder'));
                    $a->doctorProfile->user->notify(new AppointmentNotification($a, 'reminder'));
                }
            });
    }
}
