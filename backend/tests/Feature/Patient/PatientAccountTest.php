<?php

namespace Tests\Feature\Patient;

use App\Enums\VerificationStatus;
use App\Models\DoctorProfile;
use App\Models\User;
use App\Notifications\DoctorVerificationResult;
use App\Services\Scheduling\AvailabilityService;
use Carbon\CarbonImmutable;
use Tests\Concerns\BuildsSchedules;
use Tests\TestCase;

class PatientAccountTest extends TestCase
{
    use BuildsSchedules;

    public function test_notifications_are_persisted_listed_and_marked_read(): void
    {
        $user = User::factory()->create(['locale' => 'en']);
        $user->notify(new DoctorVerificationResult(VerificationStatus::Approved, null)); // sync queue in tests
        $other = User::factory()->create();
        $other->notify(new DoctorVerificationResult(VerificationStatus::Rejected, 'x'));

        $this->actingAsUser($user)->getJson('/api/v1/notifications/unread-count', $this->apiHeaders())->assertJsonPath('data.unread', 1);
        $list = $this->getJson('/api/v1/notifications', $this->apiHeaders())->assertOk();
        $list->assertJsonCount(1, 'data')->assertJsonPath('data.0.kind', 'doctor.verification.approved')
            ->assertJsonPath('data.0.title', 'Verification update');
        $id = $list->json('data.0.id');

        // Cannot read someone else's notification.
        $foreign = $other->notifications()->first()->id;
        $this->postJson("/api/v1/notifications/{$foreign}/read", [], $this->apiHeaders())->assertNotFound();

        $this->postJson("/api/v1/notifications/{$id}/read", [], $this->apiHeaders())->assertOk();
        $this->getJson('/api/v1/notifications/unread-count', $this->apiHeaders())->assertJsonPath('data.unread', 0);
    }

    public function test_notifications_render_in_recipient_locale(): void
    {
        $user = User::factory()->create(['locale' => 'ar']);
        $user->notify(new DoctorVerificationResult(VerificationStatus::Approved, null));
        $this->assertSame('تحديث حالة التوثيق', $user->notifications()->first()->data['title']);

        // The API serves the viewer's current language, not the language at send time.
        $this->actingAsUser($user)->getJson('/api/v1/notifications', ['Accept-Language' => 'en'])
            ->assertJsonPath('data.0.title', 'Verification update');
        $this->getJson('/api/v1/notifications', ['Accept-Language' => 'ar'])
            ->assertJsonPath('data.0.title', 'تحديث حالة التوثيق');
    }

    public function test_patient_profile_and_consents(): void
    {
        $user = $this->patientUser();
        $this->actingAsUser($user)->putJson('/api/v1/patient/profile', ['gender' => 'female', 'date_of_birth' => '1990-05-01'], $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.gender', 'female');
        $this->putJson('/api/v1/patient/profile', ['date_of_birth' => '2999-01-01'], $this->apiHeaders())->assertUnprocessable();

        $this->putJson('/api/v1/consents/marketing', ['granted' => true], $this->apiHeaders())->assertOk();
        $this->putJson('/api/v1/consents/marketing', ['granted' => false], $this->apiHeaders())->assertOk();
        $this->assertDatabaseCount('consents', 2); // history kept
        $consents = collect($this->getJson('/api/v1/consents', $this->apiHeaders())->json('data'))->keyBy('type');
        $this->assertFalse($consents['marketing']['granted']);
        $this->putJson('/api/v1/consents/terms', ['granted' => false], $this->apiHeaders())->assertNotFound();
    }

    public function test_home_uses_real_data(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-16 08:00:00', 'UTC'));
        [$doctor] = $this->bookableDoctor();
        app(AvailabilityService::class)->refreshNextAvailable($doctor);
        DoctorProfile::factory()->create(); // unverified, must not appear

        $res = $this->getJson('/api/v1/home')->assertOk();
        $this->assertSame([$doctor->id], array_column($res->json('data.recommended_doctors'), 'id'));
        $this->assertSame([$doctor->id], array_column($res->json('data.available_soon'), 'id'));
        // Spec 002: urgent payloads carry no emergency number (the stored setting is not exposed).
        $res->assertJsonPath('data.stats.doctors', 1)->assertJsonPath('data.urgent.enabled', true)
            ->assertJsonMissingPath('data.urgent.emergency_number');
        $this->getJson('/api/v1/settings/public')->assertJsonPath('data.urgent_enabled', true)
            ->assertJsonMissingPath('data.emergency_number');
    }
}
