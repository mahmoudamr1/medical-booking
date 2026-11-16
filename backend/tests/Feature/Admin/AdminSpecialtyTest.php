<?php

namespace Tests\Feature\Admin;

use App\Models\DoctorProfile;
use App\Models\Specialty;
use App\Models\User;
use Tests\TestCase;

class AdminSpecialtyTest extends TestCase
{
    public function test_admin_manages_specialties_and_public_cache_is_invalidated(): void
    {
        $admin = User::factory()->admin()->create();
        $this->getJson('/api/v1/specialties')->assertOk()->assertJsonCount(0, 'data');

        $id = $this->actingAsUser($admin)->postJson('/api/v1/admin/specialties', [
            'slug' => 'nephrology', 'name_ar' => 'الكلى', 'name_en' => 'Nephrology', 'icon' => 'droplet',
        ])->assertCreated()->json('data.id');
        $this->assertDatabaseHas('audit_logs', ['action' => 'specialty.created', 'subject_id' => $id]);

        $this->getJson('/api/v1/specialties')->assertJsonCount(1, 'data');
        $this->putJson("/api/v1/admin/specialties/{$id}", ['is_active' => false])->assertOk();
        $this->getJson('/api/v1/specialties')->assertJsonCount(0, 'data');

        $this->postJson('/api/v1/admin/specialties', ['slug' => 'Bad Slug!', 'name_ar' => 'x', 'name_en' => 'x'])
            ->assertUnprocessable()->assertJsonValidationErrors(['slug']);
    }

    public function test_specialty_in_use_cannot_be_deleted(): void
    {
        $admin = User::factory()->admin()->create();
        $doctor = DoctorProfile::factory()->withSpecialty()->create();
        $specialty = $doctor->specialties()->first();

        $this->actingAsUser($admin)->deleteJson("/api/v1/admin/specialties/{$specialty->id}")
            ->assertStatus(409)->assertJsonPath('code', 'specialty_in_use');
        $unused = Specialty::factory()->create();
        $this->deleteJson("/api/v1/admin/specialties/{$unused->id}")->assertNoContent();
    }

    public function test_non_admin_cannot_manage_specialties(): void
    {
        $doctor = DoctorProfile::factory()->verified()->create();
        $this->actingAsUser($doctor->user)->postJson('/api/v1/admin/specialties', [
            'slug' => 'x', 'name_ar' => 'x', 'name_en' => 'x',
        ])->assertForbidden();
    }
}
