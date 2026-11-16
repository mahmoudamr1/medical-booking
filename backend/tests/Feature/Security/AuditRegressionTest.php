<?php

namespace Tests\Feature\Security;

use App\Enums\ClinicRole;
use App\Enums\ClinicStatus;
use App\Models\Appointment;
use App\Models\Review;
use App\Models\User;

/** One regression test per finding fixed by the T100 audit (each failed before its fix). */
class AuditRegressionTest extends SecurityTestCase
{
    /**
     * Finding 1: suspending a clinic closed /clinics/{clinic}/... (tenant middleware) but its staff kept
     * reading and transitioning the clinic's appointments through the shared /appointments/{id} endpoints.
     */
    public function test_staff_of_a_suspended_clinic_lose_access_through_the_shared_appointment_endpoints(): void
    {
        [$doctor, $service, $branch] = $this->bookableDoctor(['booking_mode' => 'manual']);
        $clinic = $branch->clinic;
        $receptionist = $this->member($clinic, ClinicRole::Receptionist);
        $id = $this->book($this->patientUser(), $doctor, $service, '2026-11-18 10:00')->assertCreated()->json('data.id');

        // Sanity: while the clinic is active the receptionist is a legitimate viewer.
        $this->actingAsUser($receptionist)->getJson("/api/v1/appointments/{$id}", $this->apiHeaders())->assertOk();

        $clinic->forceFill(['status' => ClinicStatus::Suspended])->save();

        // fresh(): a new request never reuses the relations cached on these instances by the call above.
        foreach ([$receptionist->fresh(), $clinic->owner->fresh()] as $staff) {
            $this->actingAsUser($staff)->getJson("/api/v1/appointments/{$id}", $this->apiHeaders())
                ->assertForbidden()->assertJsonMissingPath('data');
            $this->actingAsUser($staff)->postJson("/api/v1/appointments/{$id}/confirm", [], $this->apiHeaders())->assertForbidden();
            $this->actingAsUser($staff)->postJson("/api/v1/appointments/{$id}/cancel", ['reason' => 'closing'], $this->apiHeaders())->assertForbidden();
        }
        $this->assertSame('pending_confirmation', Appointment::findOrFail($id)->status->value);

        // The treating doctor and the patient are unaffected by the clinic's suspension.
        $this->actingAsUser($doctor->user)->getJson("/api/v1/appointments/{$id}", $this->apiHeaders())->assertOk();
    }

    /** Finding 2: an unvalidated per_page let a guest switch pagination off (negative values drop the SQL LIMIT). */
    public function test_public_review_list_enforces_page_size_bounds(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        foreach (['2026-11-16 11:00', '2026-11-16 12:00', '2026-11-16 13:00'] as $at) {
            [$id, $patient] = $this->completedVisit($doctor, $service, $at);
            $this->actingAsUser($patient)->postJson("/api/v1/appointments/{$id}/review", ['rating' => 5], $this->apiHeaders())->assertCreated();
        }
        $this->assertSame(3, Review::count());
        $this->app['auth']->forgetGuards();

        $url = "/api/v1/doctors/{$doctor->id}/reviews";
        $this->getJson("{$url}?per_page=2", $this->apiHeaders())->assertOk()->assertJsonCount(2, 'data');
        foreach (['-1', '0', '51', '100000', 'abc'] as $perPage) {
            $this->getJson("{$url}?per_page={$perPage}", $this->apiHeaders())
                ->assertUnprocessable()->assertJsonPath('code', 'validation_failed');
        }
    }

    /**
     * Finding 3: the private disk (verification documents) registered Laravel's signed file-serving
     * routes (GET|PUT /storage/{path}). Nothing uses them, so the private disk must expose no URL at all.
     */
    public function test_private_disk_has_no_file_serving_routes(): void
    {
        $doctor = $this->doctorUser(verified: false);
        $this->actingAsUser($doctor)->post('/api/v1/doctor/documents', ['type' => 'license', 'file' => $this->pdf()], $this->apiHeaders())->assertCreated();
        $path = $doctor->doctorProfile->documents()->firstOrFail()->path;
        $this->app['auth']->forgetGuards();

        $this->assertFalse($this->app['router']->has('storage.local'));
        $this->assertFalse($this->app['router']->has('storage.local.upload'));
        $this->get("/storage/{$path}")->assertNotFound();
        $this->put("/storage/{$path}", [], $this->apiHeaders())->assertNotFound();
    }

    /**
     * Finding 4: behind a reverse proxy (the Next.js /api rewrite) every user shared the proxy's IP, so
     * one client could exhaust the per-IP login/register limits for everybody. TRUSTED_PROXIES
     * (config/trustedproxy.php) restores per-client keys without letting clients spoof their IP.
     */
    public function test_per_ip_limits_follow_the_client_ip_only_behind_a_trusted_proxy(): void
    {
        $this->assertTrue(config()->has('trustedproxy.proxies'), 'TRUSTED_PROXIES must be wired into config.');
        $attempt = fn (string $clientIp, string $email) => $this->postJson('/api/v1/auth/login',
            ['email' => $email, 'password' => 'wrong-password'], $this->apiHeaders(['X-Forwarded-For' => $clientIp]));

        // Untrusted: the header is ignored, so a spoofed X-Forwarded-For cannot dodge the 20/min IP limit.
        config(['trustedproxy.proxies' => null]);
        foreach (range(1, 20) as $i) {
            $attempt("198.51.100.{$i}", "spoof{$i}@example.test")->assertUnprocessable();
        }
        $attempt('198.51.100.99', 'spoof99@example.test')->assertStatus(429);

        // Trusted proxy: limits are keyed by the real client, so one noisy client cannot lock out another.
        $this->travel(2)->minutes();
        config(['trustedproxy.proxies' => '127.0.0.1']);
        foreach (range(1, 20) as $i) {
            $attempt('203.0.113.7', "noisy{$i}@example.test")->assertUnprocessable();
        }
        $attempt('203.0.113.7', 'noisy99@example.test')->assertStatus(429);
        $attempt('203.0.113.8', 'bystander@example.test')->assertUnprocessable();
    }

    /**
     * Finding 5: session endpoints called from outside the first-party SPA origin (no session) crashed with a
     * 500 after doing their work: valid credentials were distinguishable and register left an account behind.
     */
    public function test_session_endpoints_refuse_callers_outside_the_spa_origin_before_doing_anything(): void
    {
        User::factory()->create(['email' => 'victim@example.test']);
        $registration = [
            'name' => 'Outside Caller', 'email' => 'outside@example.test', 'password' => 'secret123',
            'password_confirmation' => 'secret123', 'account_type' => 'patient', 'accept_terms' => true,
        ];

        foreach ([['Origin' => '', 'Referer' => ''], ['Origin' => 'https://evil.example', 'Referer' => 'https://evil.example/']] as $origin) {
            $this->withHeaders($origin);
            foreach (['password', 'wrong-password'] as $password) {
                $this->postJson('/api/v1/auth/login', ['email' => 'victim@example.test', 'password' => $password], $this->apiHeaders())
                    ->assertForbidden()->assertJsonPath('code', 'forbidden');
            }
            $this->postJson('/api/v1/auth/register', $registration, $this->apiHeaders())->assertForbidden();
        }
        $this->assertDatabaseMissing('users', ['email' => 'outside@example.test']);

        // The SPA origin still works.
        $this->withHeaders(['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/']);
        $this->postJson('/api/v1/auth/login', ['email' => 'victim@example.test', 'password' => 'password'], $this->apiHeaders())->assertOk();
    }
}
