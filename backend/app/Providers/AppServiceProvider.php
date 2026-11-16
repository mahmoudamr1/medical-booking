<?php

namespace App\Providers;

use App\Listeners\SendAppointmentNotifications;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // Surface N+1 queries and mass-assignment mistakes during development and tests.
        Model::shouldBeStrict(! $this->app->isProduction());

        // One password policy for register, reset and change (Form Requests use Password::defaults()).
        Password::defaults(fn () => Password::min(8)->letters()->numbers());

        $this->configureRateLimiting();

        Event::subscribe(SendAppointmentNotifications::class);

        ResetPassword::createUrlUsing(fn ($user, string $token) => rtrim((string) config('app.frontend_url'), '/')
            .'/auth/reset-password?token='.$token.'&email='.urlencode($user->getEmailForPasswordReset()));
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute((int) config('app.api_rate_limit'))
            ->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('login', fn (Request $request) => [
            Limit::perMinute(5)->by(mb_strtolower((string) $request->input('email')).'|'.$request->ip()),
            Limit::perMinute(20)->by($request->ip()),
        ]);

        RateLimiter::for('register', fn (Request $request) => Limit::perHour(10)->by($request->ip()));

        RateLimiter::for('password-reset', fn (Request $request) => Limit::perMinute(3)->by($request->ip()));

        // Abuse protection for urgent requests (the action also enforces a per-hour cap from settings).
        RateLimiter::for('urgent', fn (Request $request) => [
            Limit::perMinute(3)->by('urgent|'.($request->user()?->id ?: $request->ip())),
            Limit::perHour((int) config('app.urgent_ip_rate_limit'))->by('urgent-ip|'.$request->ip()),
        ]);
    }
}
