<?php

namespace Tests\Feature\Clinic;

use App\Enums\ClinicRole;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\User;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    private function member(Clinic $clinic, ClinicRole $role, string $status = 'active'): User
    {
        $user = User::factory()->create();
        ClinicMembership::create([
            'clinic_id' => $clinic->id, 'user_id' => $user->id, 'role' => $role, 'status' => $status,
        ]);

        return $user;
    }

    public function test_user_can_create_clinic_and_becomes_owner(): void
    {
        $user = User::factory()->patient()->create();

        $id = $this->actingAsUser($user)->postJson('/api/v1/clinics', [
            'name_ar' => 'عيادة النور', 'name_en' => 'Al Noor Clinic',
        ], $this->apiHeaders())->assertCreated()->json('data.id');

        $this->assertDatabaseHas('clinic_memberships', ['clinic_id' => $id, 'user_id' => $user->id, 'role' => 'owner']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'clinic.created', 'subject_id' => $id]);
        $this->getJson('/api/v1/my/clinics', $this->apiHeaders())->assertJsonPath('data.0.role', 'owner');
    }

    public function test_member_of_clinic_a_cannot_read_or_update_clinic_b(): void
    {
        $clinicA = Clinic::factory()->create();
        $clinicB = Clinic::factory()->create(['name_ar' => 'سري']);
        $receptionistA = $this->member($clinicA, ClinicRole::Receptionist);

        $this->actingAsUser($clinicA->owner)
            ->getJson("/api/v1/clinics/{$clinicB->id}/manage", $this->apiHeaders())
            ->assertNotFound()
            ->assertJsonMissing(['name_ar' => 'سري']);

        $this->actingAsUser($clinicA->owner)
            ->putJson("/api/v1/clinics/{$clinicB->id}/manage", ['name_ar' => 'hijack'], $this->apiHeaders())
            ->assertNotFound();
        $this->assertSame('سري', $clinicB->fresh()->name_ar);

        $this->actingAsUser($receptionistA)
            ->getJson("/api/v1/clinics/{$clinicB->id}/manage", $this->apiHeaders())
            ->assertNotFound();
    }

    public function test_unknown_and_foreign_clinics_are_indistinguishable(): void
    {
        $clinicB = Clinic::factory()->create();
        $outsider = User::factory()->create();

        $foreign = $this->actingAsUser($outsider)->getJson("/api/v1/clinics/{$clinicB->id}/manage", $this->apiHeaders());
        $unknown = $this->actingAsUser($outsider)->getJson('/api/v1/clinics/01jzzzzzzzzzzzzzzzzzzzzzzz/manage', $this->apiHeaders());

        $foreign->assertNotFound();
        $unknown->assertNotFound();
        $this->assertSame($foreign->json(), $unknown->json());
    }

    public function test_role_permissions_inside_own_clinic(): void
    {
        $clinic = Clinic::factory()->create();
        $receptionist = $this->member($clinic, ClinicRole::Receptionist);
        $manager = $this->member($clinic, ClinicRole::Manager);

        $this->actingAsUser($receptionist)->getJson("/api/v1/clinics/{$clinic->id}/manage", $this->apiHeaders())->assertOk();
        $this->actingAsUser($receptionist)->putJson("/api/v1/clinics/{$clinic->id}/manage", ['name_ar' => 'x y'], $this->apiHeaders())
            ->assertForbidden();
        $this->actingAsUser($manager)->putJson("/api/v1/clinics/{$clinic->id}/manage", ['name_ar' => 'x y'], $this->apiHeaders())
            ->assertForbidden();
        $this->actingAsUser($clinic->owner)->putJson("/api/v1/clinics/{$clinic->id}/manage", ['name_ar' => 'اسم جديد'], $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.name_ar', 'اسم جديد');
    }

    public function test_suspended_membership_loses_access(): void
    {
        $clinic = Clinic::factory()->create();
        $suspended = $this->member($clinic, ClinicRole::Manager, 'suspended');

        $this->actingAsUser($suspended)->getJson("/api/v1/clinics/{$clinic->id}/manage", $this->apiHeaders())->assertNotFound();
    }

    public function test_guest_cannot_access_clinic_management(): void
    {
        $clinic = Clinic::factory()->create();
        $this->getJson("/api/v1/clinics/{$clinic->id}/manage", $this->apiHeaders())->assertUnauthorized();
    }
}
