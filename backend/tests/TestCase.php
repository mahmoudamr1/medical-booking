<?php

namespace Tests;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    /** Roles/permissions are reference data required by nearly every test. */
    protected bool $seed = true;

    protected string $seeder = RolePermissionSeeder::class;

    protected function setUp(): void
    {
        parent::setUp();
        // Requests come from the first-party SPA origin so Sanctum treats them as stateful
        // (session + CSRF), exactly like the Next.js frontend.
        $this->withHeaders(['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/']);
    }

    /** Authenticate through the stateful (SPA cookie) guard, as the frontend does. */
    protected function actingAsUser(User $user): static
    {
        // The sanctum RequestGuard caches its resolved user for the app's lifetime; in production
        // every request gets a fresh app, so reset guards when switching users inside one test.
        $this->app['auth']->forgetGuards();

        return $this->actingAs($user, 'web');
    }

    /** @param array<string, string> $headers */
    protected function apiHeaders(array $headers = []): array
    {
        return ['Accept' => 'application/json', 'Accept-Language' => 'en'] + $headers;
    }
}
