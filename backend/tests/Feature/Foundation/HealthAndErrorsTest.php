<?php

namespace Tests\Feature\Foundation;

use Tests\TestCase;

class HealthAndErrorsTest extends TestCase
{
    public function test_health_reports_database_ok(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonPath('data.database', 'ok');
    }

    public function test_unknown_route_returns_enveloped_404(): void
    {
        $this->getJson('/api/v1/does-not-exist')
            ->assertNotFound()
            ->assertJson(['success' => false, 'code' => 'not_found']);
    }

    public function test_unauthenticated_returns_401_envelope(): void
    {
        $this->getJson('/api/v1/auth/me')
            ->assertUnauthorized()
            ->assertJson(['success' => false, 'code' => 'unauthenticated']);
    }

    public function test_messages_are_localized_by_accept_language(): void
    {
        $this->getJson('/api/v1/auth/me', ['Accept-Language' => 'ar'])
            ->assertJsonPath('message', 'يجب تسجيل الدخول أولاً');
        $this->getJson('/api/v1/auth/me', ['Accept-Language' => 'en'])
            ->assertJsonPath('message', 'You must be signed in');
    }
}
