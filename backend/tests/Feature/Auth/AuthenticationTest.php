<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    private function registerPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Test Patient',
            'email' => 'new.patient@example.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'account_type' => 'patient',
            'accept_terms' => true,
        ], $overrides);
    }

    public function test_patient_can_register_and_is_logged_in(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/auth/register', $this->registerPayload(), $this->apiHeaders())
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.roles', ['patient'])
            ->assertJsonPath('data.doctor_profile', null);

        $user = User::where('email', 'new.patient@example.test')->firstOrFail();
        $this->assertTrue(Hash::check('secret123', $user->password));
        $this->assertNotSame('secret123', $user->password);
        $this->assertNotNull($user->patientProfile);
        $this->assertAuthenticatedAs($user, 'web');
        $this->assertDatabaseHas('consents', ['user_id' => $user->id, 'type' => 'terms', 'granted' => true]);
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_doctor_registration_creates_draft_unverified_profile(): void
    {
        $this->postJson('/api/v1/auth/register', $this->registerPayload([
            'email' => 'new.doctor@example.test', 'account_type' => 'doctor',
        ]), $this->apiHeaders())
            ->assertCreated()
            ->assertJsonPath('data.doctor_profile.verification_status', 'draft');

        $user = User::where('email', 'new.doctor@example.test')->firstOrFail();
        $this->assertTrue($user->hasRole('doctor'));
        $this->assertTrue($user->hasRole('patient'));
    }

    public function test_registration_validates_input(): void
    {
        User::factory()->create(['email' => 'taken@example.test']);

        $this->postJson('/api/v1/auth/register', $this->registerPayload([
            'email' => 'taken@example.test', 'password' => 'short', 'password_confirmation' => 'nope',
            'account_type' => 'admin', 'accept_terms' => false,
        ]), $this->apiHeaders())
            ->assertUnprocessable()
            ->assertJsonPath('code', 'validation_failed')
            ->assertJsonValidationErrors(['email', 'password', 'account_type', 'accept_terms']);
    }

    public function test_cannot_self_register_as_admin(): void
    {
        $this->postJson('/api/v1/auth/register', $this->registerPayload(['account_type' => 'admin']), $this->apiHeaders())
            ->assertUnprocessable();
        $this->assertDatabaseMissing('users', ['email' => 'new.patient@example.test']);
    }

    public function test_login_logout_and_me(): void
    {
        $user = User::factory()->patient()->create(['email' => 'p@example.test']);

        $this->postJson('/api/v1/auth/login', ['email' => 'P@example.test', 'password' => 'password'], $this->apiHeaders())
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.permissions', fn ($p) => in_array('appointments.book', $p, true));
        $this->assertAuthenticatedAs($user, 'web');

        $this->getJson('/api/v1/auth/me', $this->apiHeaders())->assertOk()->assertJsonPath('data.email', 'p@example.test');

        $this->postJson('/api/v1/auth/logout', [], $this->apiHeaders())->assertOk();
        $this->assertGuest('web');
    }

    public function test_login_rejects_wrong_password_without_disclosing_which_field(): void
    {
        User::factory()->create(['email' => 'p@example.test']);

        $this->postJson('/api/v1/auth/login', ['email' => 'p@example.test', 'password' => 'wrong'], $this->apiHeaders())
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Incorrect email or password');
        $this->assertGuest('web');
    }

    public function test_login_is_rate_limited(): void
    {
        User::factory()->create(['email' => 'p@example.test']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'p@example.test', 'password' => 'wrong'], $this->apiHeaders())
                ->assertUnprocessable();
        }
        $this->postJson('/api/v1/auth/login', ['email' => 'p@example.test', 'password' => 'password'], $this->apiHeaders())
            ->assertStatus(429)
            ->assertJsonPath('code', 'rate_limited');
    }

    public function test_suspended_user_cannot_login_or_use_session(): void
    {
        $user = User::factory()->suspended()->create(['email' => 's@example.test']);

        $this->postJson('/api/v1/auth/login', ['email' => 's@example.test', 'password' => 'password'], $this->apiHeaders())
            ->assertForbidden()
            ->assertJsonPath('code', 'account_suspended');

        $this->actingAsUser($user)->getJson('/api/v1/auth/me', $this->apiHeaders())
            ->assertForbidden()
            ->assertJsonPath('code', 'account_suspended');
    }

    public function test_password_reset_flow(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'p@example.test']);

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'p@example.test'], $this->apiHeaders())->assertOk();
        // Unknown email yields the same response (no account enumeration).
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.test'], $this->apiHeaders())->assertOk();

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $n) use (&$token, $user) {
            $token = $n->token;
            $this->assertStringContainsString('/auth/reset-password?token=', $n->toMail($user)->actionUrl);

            return true;
        });

        $this->postJson('/api/v1/auth/reset-password', [
            'token' => $token, 'email' => 'p@example.test',
            'password' => 'newpass123', 'password_confirmation' => 'newpass123',
        ], $this->apiHeaders())->assertOk();

        $this->assertTrue(Hash::check('newpass123', $user->fresh()->password));
    }

    public function test_password_reset_rejects_invalid_token(): void
    {
        User::factory()->create(['email' => 'p@example.test']);
        $this->postJson('/api/v1/auth/reset-password', [
            'token' => 'invalid', 'email' => 'p@example.test',
            'password' => 'newpass123', 'password_confirmation' => 'newpass123',
        ], $this->apiHeaders())->assertUnprocessable();
    }

    public function test_change_password_requires_current_password(): void
    {
        $user = User::factory()->create();

        $this->actingAsUser($user)->putJson('/api/v1/auth/password', [
            'current_password' => 'wrong', 'password' => 'another123', 'password_confirmation' => 'another123',
        ], $this->apiHeaders())->assertUnprocessable()->assertJsonValidationErrors(['current_password']);
    }

    public function test_email_verification_link_marks_verified(): void
    {
        $user = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute('verification.verify', now()->addHour(), [
            'id' => $user->id, 'hash' => sha1($user->email),
        ]);

        $this->get($url)->assertRedirect();
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_password_broker_uses_hashed_tokens(): void
    {
        $user = User::factory()->create();
        $token = Password::createToken($user);
        $stored = DB::table('password_reset_tokens')->where('email', $user->email)->value('token');
        $this->assertNotSame($token, $stored);
    }
}
