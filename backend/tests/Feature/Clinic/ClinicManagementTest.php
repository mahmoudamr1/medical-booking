<?php

namespace Tests\Feature\Clinic;

use App\Enums\ClinicRole;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\DoctorProfile;
use App\Models\MedicalService;
use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Factories\ClinicBranchFactory;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsSchedules;
use Tests\TestCase;

class ClinicManagementTest extends TestCase
{
    use BuildsSchedules;

    private Clinic $clinicA;

    private Clinic $clinicB;

    private DoctorProfile $doctorA;

    private MedicalService $serviceA;

    private string $appointmentB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2026-11-16 08:00:00', 'UTC'));
        Notification::fake();

        [$this->doctorA, $this->serviceA, $branchA] = $this->bookableDoctor();
        [$doctorB, $serviceB, $branchB] = $this->bookableDoctor();
        $this->clinicA = $branchA->clinic;
        $this->clinicB = $branchB->clinic;
        $this->book($this->patientUser(), $this->doctorA, $this->serviceA, '2026-11-17 10:00')->assertCreated();
        $this->appointmentB = $this->book($this->patientUser(), $doctorB, $serviceB, '2026-11-17 10:00')->json('data.id');
    }

    private function member(Clinic $clinic, ClinicRole $role): User
    {
        $user = User::factory()->create();
        ClinicMembership::create(['clinic_id' => $clinic->id, 'user_id' => $user->id, 'role' => $role, 'joined_at' => now()]);

        return $user;
    }

    /** SRS §21 Scenario 3, applied to every tenant endpoint. */
    public function test_no_clinic_endpoint_leaks_another_clinics_data(): void
    {
        $owner = $this->clinicA->owner;
        $b = $this->clinicB->id;
        $branchB = $this->clinicB->branches()->first()->id;
        $affB = $this->clinicB->affiliations()->first()->id;
        $staffB = $this->clinicB->memberships()->first()->id;

        $requests = [
            ['GET', "/api/v1/clinics/{$b}/manage"], ['PUT', "/api/v1/clinics/{$b}/manage"],
            ['GET', "/api/v1/clinics/{$b}/branches"], ['POST', "/api/v1/clinics/{$b}/branches"],
            ['PUT', "/api/v1/clinics/{$b}/branches/{$branchB}"], ['DELETE', "/api/v1/clinics/{$b}/branches/{$branchB}"],
            ['GET', "/api/v1/clinics/{$b}/staff"], ['DELETE', "/api/v1/clinics/{$b}/staff/{$staffB}"],
            ['GET', "/api/v1/clinics/{$b}/doctors"], ['DELETE', "/api/v1/clinics/{$b}/doctors/{$affB}"],
            ['GET', "/api/v1/clinics/{$b}/services"], ['GET', "/api/v1/clinics/{$b}/schedules"],
            ['GET', "/api/v1/clinics/{$b}/appointments"], ['GET', "/api/v1/clinics/{$b}/appointments/{$this->appointmentB}"],
            ['POST', "/api/v1/clinics/{$b}/appointments/{$this->appointmentB}/cancel"],
            ['GET', "/api/v1/clinics/{$b}/reports"],
        ];
        $this->actingAsUser($owner);
        foreach ($requests as [$method, $url]) {
            $res = $this->json($method, $url, ['reason' => 'x', 'name_ar' => 'x'], $this->apiHeaders());
            $res->assertNotFound();
            $this->assertStringNotContainsString($this->appointmentB, $res->getContent(), "$method $url leaked");
        }

        // Using MY clinic id with THEIR resource ids is also 404 (resource lookups are tenant-scoped).
        $a = $this->clinicA->id;
        $this->getJson("/api/v1/clinics/{$a}/appointments/{$this->appointmentB}", $this->apiHeaders())->assertNotFound();
        $this->postJson("/api/v1/clinics/{$a}/appointments/{$this->appointmentB}/cancel", ['reason' => 'x'], $this->apiHeaders())->assertNotFound();
        $this->putJson("/api/v1/clinics/{$a}/branches/{$branchB}", ['name_ar' => 'x'], $this->apiHeaders())->assertNotFound();
        $this->deleteJson("/api/v1/clinics/{$a}/doctors/{$affB}", [], $this->apiHeaders())->assertNotFound();
        $this->assertSame('confirmed', Appointment::find($this->appointmentB)->status->value);

        // Listing my clinic's appointments never includes theirs.
        $ids = collect($this->getJson("/api/v1/clinics/{$a}/appointments", $this->apiHeaders())->json('data'))->pluck('id');
        $this->assertCount(1, $ids);
        $this->assertNotContains($this->appointmentB, $ids);
    }

    public function test_receptionist_permissions(): void
    {
        $receptionist = $this->member($this->clinicA, ClinicRole::Receptionist);
        $a = $this->clinicA->id;
        $this->actingAsUser($receptionist);

        $this->getJson("/api/v1/clinics/{$a}/appointments", $this->apiHeaders())->assertOk();
        $this->getJson("/api/v1/clinics/{$a}/schedules", $this->apiHeaders())->assertOk();
        $this->getJson("/api/v1/clinics/{$a}/staff", $this->apiHeaders())->assertForbidden();
        $this->postJson("/api/v1/clinics/{$a}/branches", [], $this->apiHeaders())->assertForbidden();
        $this->getJson("/api/v1/clinics/{$a}/reports", $this->apiHeaders())->assertForbidden();
        $this->postJson("/api/v1/clinics/{$a}/doctors", [], $this->apiHeaders())->assertForbidden();
        // Clinic staff are not platform admins.
        $this->getJson('/api/v1/admin/doctors', $this->apiHeaders())->assertForbidden();
    }

    public function test_reception_books_on_behalf_of_new_patient_with_same_overlap_protection(): void
    {
        $receptionist = $this->member($this->clinicA, ClinicRole::Receptionist);
        $a = $this->clinicA->id;
        $payload = ['doctor_id' => $this->doctorA->id, 'service_id' => $this->serviceA->id,
            'starts_at' => $this->cairo('2026-11-17 11:00'), 'patient_email' => 'walkin@example.test',
            'patient_name' => 'Walk In Patient', 'patient_phone' => '01099998888'];

        $res = $this->actingAsUser($receptionist)->postJson("/api/v1/clinics/{$a}/appointments", $payload, $this->apiHeaders())
            ->assertCreated()->assertJsonPath('data.booked_via', 'clinic_staff');
        $patient = User::where('email', 'walkin@example.test')->firstOrFail();
        $this->assertTrue($patient->hasRole('patient'));
        Notification::assertSentTo($patient, ResetPassword::class); // patient sets their own password
        $this->assertDatabaseHas('appointment_status_histories', ['appointment_id' => $res->json('data.id'), 'actor_role' => 'clinic']);

        // Same slot again → 409, like any other booking.
        $this->postJson("/api/v1/clinics/{$a}/appointments", ['patient_email' => 'other@example.test', 'patient_name' => 'Other Person', 'patient_phone' => null] + $payload, $this->apiHeaders())
            ->assertStatus(409);
        // A service from another clinic cannot be booked through this clinic.
        $serviceB = MedicalService::where('clinic_id', $this->clinicB->id)->first();
        $this->postJson("/api/v1/clinics/{$a}/appointments", ['service_id' => $serviceB->id] + $payload, $this->apiHeaders())
            ->assertUnprocessable()->assertJsonValidationErrors(['service_id']);
    }

    public function test_reception_booking_for_unknown_email_requires_name_and_free_phone(): void
    {
        $receptionist = $this->member($this->clinicA, ClinicRole::Receptionist);
        $a = $this->clinicA->id;
        $payload = ['doctor_id' => $this->doctorA->id, 'service_id' => $this->serviceA->id,
            'starts_at' => $this->cairo('2026-11-17 11:00'), 'patient_email' => 'New.Walkin@Example.test'];

        $this->actingAsUser($receptionist)->postJson("/api/v1/clinics/{$a}/appointments", $payload, $this->apiHeaders())
            ->assertUnprocessable()->assertJsonValidationErrors(['patient_name']);
        $receptionist->forceFill(['phone' => '01011112222'])->save();
        $this->postJson("/api/v1/clinics/{$a}/appointments", $payload + ['patient_name' => 'New Walk In', 'patient_phone' => '01011112222'], $this->apiHeaders())
            ->assertUnprocessable()->assertJsonValidationErrors(['patient_phone']);
        $this->assertFalse(User::where('email', 'new.walkin@example.test')->exists());

        $this->postJson("/api/v1/clinics/{$a}/appointments", $payload + ['patient_name' => 'New Walk In'], $this->apiHeaders())->assertCreated();
        $this->assertTrue(User::where('email', 'new.walkin@example.test')->exists()); // stored lower-cased
    }

    public function test_clinic_actions_on_own_appointments(): void
    {
        $manager = $this->member($this->clinicA, ClinicRole::Manager);
        $a = $this->clinicA->id;
        $id = Appointment::where('clinic_id', $a)->value('id');

        $this->actingAsUser($manager)->postJson("/api/v1/clinics/{$a}/appointments/{$id}/cancel", ['reason' => 'doctor sick'], $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.status', 'cancelled_by_clinic');
        $this->assertDatabaseHas('appointment_status_histories', ['appointment_id' => $id, 'actor_role' => 'clinic', 'actor_user_id' => $manager->id]);
    }

    public function test_branch_staff_and_doctor_management(): void
    {
        $owner = $this->clinicA->owner;
        $a = $this->clinicA->id;
        $gov = ClinicBranchFactory::governorate('giza');
        $city = ClinicBranchFactory::city($gov->id, 'dokki');
        $this->actingAsUser($owner);

        $branchId = $this->postJson("/api/v1/clinics/{$a}/branches", [
            'name_ar' => 'فرع الدقي', 'name_en' => 'Dokki', 'city_id' => $city->id, 'address_ar' => 'شارع التحرير',
        ], $this->apiHeaders())->assertCreated()->assertJsonPath('data.governorate.id', $gov->id)->json('data.id');
        $this->putJson("/api/v1/clinics/{$a}/branches/{$branchId}/hours", ['hours' => [
            ['day_of_week' => 0, 'opens_at' => '09:00', 'closes_at' => '21:00'],
        ]], $this->apiHeaders())->assertOk()->assertJsonPath('data.hours.0.closes_at', '21:00');

        // Invite an existing user as receptionist; they accept from their own account.
        $invitee = User::factory()->create(['email' => 'new.staff@example.test']);
        $membershipId = $this->postJson("/api/v1/clinics/{$a}/staff", ['email' => 'new.staff@example.test', 'role' => 'receptionist'], $this->apiHeaders())
            ->assertCreated()->assertJsonPath('data.status', 'invited')->json('data.id');
        $this->postJson("/api/v1/clinics/{$a}/staff", ['email' => 'nobody@example.test', 'role' => 'manager'], $this->apiHeaders())
            ->assertUnprocessable()->assertJsonPath('code', 'user_not_found');
        $this->postJson("/api/v1/clinics/{$a}/staff", ['email' => 'x@example.test', 'role' => 'owner'], $this->apiHeaders())->assertUnprocessable();

        $this->actingAsUser($invitee)->getJson("/api/v1/clinics/{$a}/appointments", $this->apiHeaders())->assertNotFound(); // not active yet
        $this->getJson('/api/v1/my/invitations', $this->apiHeaders())->assertJsonPath('data.0.id', $membershipId);
        $this->postJson("/api/v1/my/invitations/{$membershipId}/accept", [], $this->apiHeaders())->assertOk();
        $this->getJson("/api/v1/clinics/{$a}/appointments", $this->apiHeaders())->assertOk();

        // Owner suspends local staff membership → immediate loss of access.
        $this->actingAsUser($owner)->putJson("/api/v1/clinics/{$a}/staff/{$membershipId}", ['status' => 'suspended'], $this->apiHeaders())->assertOk();
        $this->actingAsUser($invitee)->getJson("/api/v1/clinics/{$a}/appointments", $this->apiHeaders())->assertNotFound();

        // Owner membership is immutable via staff endpoints.
        $ownerMembership = ClinicMembership::where('clinic_id', $a)->where('user_id', $owner->id)->value('id');
        $this->actingAsUser($owner)->deleteJson("/api/v1/clinics/{$a}/staff/{$ownerMembership}", [], $this->apiHeaders())->assertStatus(409);

        // Affiliate another doctor to the new branch, then end it: their services there are deactivated.
        $doctor = DoctorProfile::factory()->verified()->create();
        $affId = $this->postJson("/api/v1/clinics/{$a}/doctors", ['doctor_email' => $doctor->user->email, 'clinic_branch_id' => $branchId], $this->apiHeaders())
            ->assertCreated()->json('data.id');
        $svc = MedicalService::factory()->create(['doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $branchId, 'clinic_id' => $a, 'consultation_type' => 'in_person']);
        $this->deleteJson("/api/v1/clinics/{$a}/doctors/{$affId}", [], $this->apiHeaders())->assertNoContent();
        $this->assertFalse($svc->fresh()->is_active);
        $this->assertDatabaseHas('audit_logs', ['action' => 'clinic.doctor.ended']);
    }

    public function test_reports_aggregate_only_own_clinic(): void
    {
        $a = $this->clinicA->id;
        $res = $this->actingAsUser($this->clinicA->owner)->getJson("/api/v1/clinics/{$a}/reports", $this->apiHeaders())->assertOk();
        $res->assertJsonPath('data.totals.total', 1)->assertJsonPath('data.totals.confirmed', 1)
            ->assertJsonPath('data.organization.doctors', 1);
        $this->assertCount(1, $res->json('data.by_doctor'));
    }
}
