<?php

use App\Actions\Booking\BookAppointment;
use App\Actions\Booking\ExpireStaleHolds;
use App\Actions\Urgent\UrgentRequestActions;
use App\Enums\UrgentStatus;
use App\Exceptions\BusinessRuleException;
use App\Jobs\SendAppointmentReminders;
use App\Models\DoctorProfile;
use App\Models\PatientProfile;
use App\Models\UrgentRequest;
use App\Models\User;
use App\Services\Scheduling\AvailabilityService;
use App\Services\Settings;
use App\Services\Urgent\UrgentDispatcher;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('appointments:expire-holds', function (ExpireStaleHolds $expire) {
    $this->info('Expired '.$expire->all().' stale pending holds.');
})->purpose('Expire manual-confirmation holds that passed their hold window');

Artisan::command('doctors:refresh-availability', function (AvailabilityService $availability) {
    $n = 0;
    DoctorProfile::publiclyVisible()->with('user')->chunkById(100, function ($doctors) use ($availability, &$n) {
        foreach ($doctors as $doctor) {
            $availability->refreshNextAvailable($doctor);
            $n++;
        }
    });
    $this->info("Refreshed {$n} doctors.");
})->purpose('Recompute next_available_at used for discovery sorting');

Artisan::command('urgent:sweep', function (UrgentDispatcher $dispatcher, Settings $settings) {
    // Safety net if delayed queue jobs were lost: finalize requests past their deadline.
    $ids = UrgentRequest::whereIn('status', UrgentStatus::MATCHING)->where('expires_at', '<=', now())->pluck('id');
    $ids->each(fn ($id) => $dispatcher->finalize($id));
    // Windows that started on their own (scheduled / tonight) and any missed trigger: retry waiting requests.
    $dispatcher->matchWaiting();
    // Data minimization: drop exact location details after the retention window.
    $cleared = UrgentRequest::whereNotNull('location_details')
        ->where('created_at', '<', now()->subHours($settings->int('urgent_location_retention_hours')))
        ->update(['location_details' => null]);
    $this->info("Finalized {$ids->count()}, cleared location on {$cleared}.");
})->purpose('Finalize overdue urgent requests, retry waiting ones and expire location data');

Schedule::command('appointments:expire-holds')->everyMinute()->withoutOverlapping();
Schedule::command('urgent:sweep')->everyMinute()->withoutOverlapping();
Schedule::command('doctors:refresh-availability')->everyThirtyMinutes()->withoutOverlapping();
Schedule::job(new SendAppointmentReminders)->everyFifteenMinutes()->withoutOverlapping();

/*
 | Test harness for concurrency tests ONLY (tests/Concurrency). Each invocation is a separate PHP
 | process with its own database connection, calling the real booking action. Not registered
 | outside the testing environment.
 */
if (app()->environment('testing')) {
    Artisan::command('testing:book {patient_user} {doctor} {service} {starts_at} {--at=}', function () {
        if ($at = (float) $this->option('at')) {
            usleep((int) max(0, ($at - microtime(true)) * 1_000_000)); // synchronized start
        }
        $user = User::findOrFail($this->argument('patient_user'));
        try {
            $a = app(BookAppointment::class)->handle(
                PatientProfile::where('user_id', $user->id)->firstOrFail(),
                $this->argument('doctor'), $this->argument('service'),
                CarbonImmutable::parse($this->argument('starts_at')), $user,
            );
            $this->line(json_encode(['ok' => true, 'id' => $a->id]));
        } catch (BusinessRuleException $e) {
            $this->line(json_encode(['ok' => false, 'status' => $e->status, 'code' => $e->errorCode]));
        }
    });

    Artisan::command('testing:urgent-accept {request} {doctor} {--at=}', function () {
        if ($at = (float) $this->option('at')) {
            usleep((int) max(0, ($at - microtime(true)) * 1_000_000));
        }
        try {
            app(UrgentRequestActions::class)->accept(
                UrgentRequest::findOrFail($this->argument('request')),
                DoctorProfile::findOrFail($this->argument('doctor')),
            );
            $this->line(json_encode(['ok' => true]));
        } catch (BusinessRuleException $e) {
            $this->line(json_encode(['ok' => false, 'status' => $e->status, 'code' => $e->errorCode]));
        }
    });
}
