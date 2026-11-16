<?php

namespace Tests\Feature\Security;

use App\Enums\ClinicRole;
use App\Enums\MembershipStatus;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\DoctorProfile;
use App\Models\MedicalService;
use App\Models\ScheduleException;
use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;

/** IDOR, tenant-boundary and wrong-actor attacks against owner-scoped resources. */
class AccessControlTest extends SecurityTestCase
{
    public function test_unrelated_accounts_cannot_read_or_change_an_appointment(): void
    {
        [$doctor, $service, $branch] = $this->bookableDoctor(['booking_mode' => 'manual']);
        $id = $this->book($this->patientUser(), $doctor, $service, '2026-11-18 10:00')->assertCreated()->json('data.id');

        $otherClinic = Clinic::factory()->create();
        $intruders = [
            'another patient' => $this->patientUser(),
            'another doctor' => $this->doctorUser(),
            'owner of another clinic' => $otherClinic->owner,
            'suspended staff of the owning clinic' => $this->member($branch->clinic, ClinicRole::Manager, MembershipStatus::Suspended->value),
            'invited (not yet accepted) staff' => $this->member($branch->clinic, ClinicRole::Manager, MembershipStatus::Invited->value),
        ];

        foreach ($intruders as $who => $user) {
            $this->actingAsUser($user)->getJson("/api/v1/appointments/{$id}", $this->apiHeaders())
                ->assertForbidden()->assertJsonMissingPath('data');
            foreach (['confirm', 'reject', 'complete', 'no-show', 'cancel'] as $action) {
                $this->postJson("/api/v1/appointments/{$id}/{$action}", ['reason' => 'intruder'], $this->apiHeaders())
                    ->assertForbidden();
            }
            $this->postJson("/api/v1/appointments/{$id}/reschedule", ['starts_at' => $this->cairo('2026-11-19 10:00')], $this->apiHeaders())->assertForbidden();
            $this->postJson("/api/v1/appointments/{$id}/review", ['rating' => 1], $this->apiHeaders())->assertForbidden();
            $this->assertNotContains($id, collect($this->getJson('/api/v1/patient/appointments', $this->apiHeaders())->json('data'))->pluck('id'), $who);
        }

        $appointment = Appointment::findOrFail($id);
        $this->assertSame('pending_confirmation', $appointment->status->value);
        $this->assertSame(1, $appointment->histories()->count());
        $this->assertDatabaseCount('reviews', 0);
    }

    public function test_participants_cannot_act_in_a_capacity_they_do_not_hold(): void
    {
        [$doctor, $service] = $this->bookableDoctor(['booking_mode' => 'manual']);
        $patient = $this->patientUser();
        $id = $this->book($patient, $doctor, $service, '2026-11-18 10:00')->assertCreated()->json('data.id');
        $admin = User::factory()->admin()->create();

        // The patient cannot approve their own request or mark the visit done.
        foreach (['confirm', 'reject', 'complete', 'no-show'] as $action) {
            $this->actingAsUser($patient)->postJson("/api/v1/appointments/{$id}/{$action}", ['reason' => 'me'], $this->apiHeaders())->assertForbidden();
        }
        // The doctor is not the patient: no rescheduling or reviewing on the patient's behalf.
        $this->actingAsUser($doctor->user)->postJson("/api/v1/appointments/{$id}/reschedule", ['starts_at' => $this->cairo('2026-11-19 10:00')], $this->apiHeaders())->assertForbidden();
        $this->postJson("/api/v1/appointments/{$id}/review", ['rating' => 5], $this->apiHeaders())->assertForbidden();
        // Admins oversee (read) but can only intervene through the audited admin cancellation, with a reason.
        $this->actingAsUser($admin)->getJson("/api/v1/appointments/{$id}", $this->apiHeaders())->assertOk();
        foreach (['confirm', 'complete', 'cancel'] as $action) {
            $this->postJson("/api/v1/appointments/{$id}/{$action}", ['reason' => 'admin'], $this->apiHeaders())->assertForbidden();
        }
        $this->postJson("/api/v1/admin/appointments/{$id}/cancel", [], $this->apiHeaders())->assertUnprocessable();
        $this->assertSame('pending_confirmation', Appointment::findOrFail($id)->status->value);

        $this->postJson("/api/v1/admin/appointments/{$id}/cancel", ['reason' => 'fraud report'], $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.status', 'cancelled_by_admin');
        $this->assertDatabaseHas('audit_logs', ['action' => 'appointment.cancelled_by_admin', 'subject_id' => $id, 'actor_user_id' => $admin->id]);
    }

    public function test_a_doctor_cannot_touch_another_doctors_services_exceptions_or_calendar(): void
    {
        [$victim, $service] = $this->bookableDoctor();
        $appointmentId = $this->book($this->patientUser(), $victim, $service, '2026-11-18 10:00')->assertCreated()->json('data.id');
        $exceptionId = $this->actingAsUser($victim->user)->postJson('/api/v1/doctor/exceptions',
            ['date' => '2026-11-20', 'type' => 'closed'], $this->apiHeaders())->assertCreated()->json('data.0.id');

        $attacker = $this->doctorUser();
        $this->actingAsUser($attacker)->putJson("/api/v1/doctor/services/{$service->id}", ['price' => 1, 'is_active' => false], $this->apiHeaders())->assertNotFound();
        $this->deleteJson("/api/v1/doctor/services/{$service->id}", [], $this->apiHeaders())->assertNotFound();
        $this->deleteJson("/api/v1/doctor/exceptions/{$exceptionId}", [], $this->apiHeaders())->assertNotFound();
        // A service at a branch the attacker is not affiliated with cannot be created either.
        $this->postJson('/api/v1/doctor/services', [
            'name_ar' => 'كشف', 'name_en' => 'Visit', 'consultation_type' => 'in_person',
            'clinic_branch_id' => $service->clinic_branch_id, 'duration_minutes' => 20, 'price' => 100,
        ], $this->apiHeaders())->assertUnprocessable();
        $this->putJson('/api/v1/doctor/schedules', ['schedules' => [
            ['clinic_branch_id' => $service->clinic_branch_id, 'day_of_week' => 1, 'starts_at' => '09:00', 'ends_at' => '10:00'],
        ]], $this->apiHeaders())->assertUnprocessable();

        foreach (['/api/v1/doctor/appointments?from=2026-11-16&to=2026-11-30', '/api/v1/doctor/dashboard', '/api/v1/doctor/services', '/api/v1/doctor/exceptions'] as $url) {
            $body = $this->getJson($url, $this->apiHeaders())->assertOk()->getContent();
            $this->assertStringNotContainsString($appointmentId, $body, $url);
            $this->assertStringNotContainsString($service->id, $body, $url);
            $this->assertStringNotContainsString($exceptionId, $body, $url);
        }

        $this->assertSame('400.00', (string) MedicalService::findOrFail($service->id)->price);
        $this->assertTrue(MedicalService::findOrFail($service->id)->is_active);
        $this->assertNotNull(ScheduleException::find($exceptionId));
    }

    public function test_admin_document_download_is_scoped_to_the_doctor_in_the_url_and_audited(): void
    {
        $owner = DoctorProfile::factory()->create();
        $other = DoctorProfile::factory()->create();
        $documentId = $this->actingAsUser($owner->user)->post('/api/v1/doctor/documents',
            ['type' => 'license', 'file' => $this->pdf()], $this->apiHeaders())->assertCreated()->json('data.id');
        $admin = User::factory()->admin()->create();

        $this->actingAsUser($admin)->get("/api/v1/admin/doctors/{$other->id}/documents/{$documentId}/download", $this->apiHeaders())->assertNotFound();
        $this->assertDatabaseMissing('audit_logs', ['action' => 'doctor.document.viewed']);

        $this->get("/api/v1/admin/doctors/{$owner->id}/documents/{$documentId}/download", $this->apiHeaders())->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'doctor.document.viewed', 'subject_id' => $documentId, 'actor_user_id' => $admin->id]);
    }

    public function test_notifications_and_invitations_belong_to_their_recipient_only(): void
    {
        $recipient = User::factory()->create();
        $notification = DatabaseNotification::create([
            'id' => (string) Str::uuid(), 'type' => 'test', 'notifiable_type' => $recipient->getMorphClass(),
            'notifiable_id' => $recipient->id, 'data' => ['kind' => 'private', 'title' => 'for the recipient only'],
        ]);
        $invitation = ClinicMembership::create([
            'clinic_id' => Clinic::factory()->create()->id, 'user_id' => $recipient->id,
            'role' => ClinicRole::Manager, 'status' => MembershipStatus::Invited,
        ]);

        $this->actingAsUser(User::factory()->create());
        $this->postJson("/api/v1/notifications/{$notification->id}/read", [], $this->apiHeaders())->assertNotFound();
        $this->postJson('/api/v1/notifications/read-all', [], $this->apiHeaders())->assertOk();
        $this->getJson('/api/v1/notifications', $this->apiHeaders())->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/my/invitations', $this->apiHeaders())->assertOk()->assertJsonCount(0, 'data');
        $this->postJson("/api/v1/my/invitations/{$invitation->id}/accept", [], $this->apiHeaders())->assertNotFound();
        $this->postJson("/api/v1/my/invitations/{$invitation->id}/decline", [], $this->apiHeaders())->assertNotFound();

        $this->assertNull($notification->fresh()->read_at);
        $this->assertSame(MembershipStatus::Invited, $invitation->fresh()->status);
    }

    public function test_clinic_staff_cannot_escalate_their_own_role_or_take_over_the_owner(): void
    {
        $clinic = Clinic::factory()->create();
        $manager = $this->member($clinic, ClinicRole::Manager);
        $receptionist = $this->member($clinic, ClinicRole::Receptionist);
        $managerMembership = $clinic->memberships()->where('user_id', $manager->id)->firstOrFail();
        $ownerMembership = $clinic->memberships()->where('role', ClinicRole::Owner->value)->firstOrFail();
        $base = "/api/v1/clinics/{$clinic->id}/staff";

        // Only the owner manages staff: managers and receptionists cannot promote, invite or remove anyone.
        foreach ([$manager, $receptionist] as $staff) {
            $this->actingAsUser($staff)->getJson($base, $this->apiHeaders())->assertForbidden();
            $this->postJson($base, ['email' => $receptionist->email, 'role' => 'manager'], $this->apiHeaders())->assertForbidden();
            $this->putJson("{$base}/{$managerMembership->id}", ['role' => 'owner'], $this->apiHeaders())->assertForbidden();
            $this->deleteJson("{$base}/{$ownerMembership->id}", [], $this->apiHeaders())->assertForbidden();
        }

        // Even the owner cannot mint a second owner, edit the owner membership, or skip an invitee's consent.
        $invitee = User::factory()->create();
        $this->actingAsUser($clinic->owner)->postJson($base, ['email' => $invitee->email, 'role' => 'owner'], $this->apiHeaders())->assertUnprocessable();
        $this->putJson("{$base}/{$managerMembership->id}", ['role' => 'owner'], $this->apiHeaders())->assertUnprocessable();
        $this->putJson("{$base}/{$ownerMembership->id}", ['role' => 'receptionist'], $this->apiHeaders())->assertStatus(409);
        $this->deleteJson("{$base}/{$ownerMembership->id}", [], $this->apiHeaders())->assertStatus(409);
        $invitedId = $this->postJson($base, ['email' => $invitee->email, 'role' => 'manager'], $this->apiHeaders())->assertCreated()->json('data.id');
        $this->putJson("{$base}/{$invitedId}", ['status' => 'active'], $this->apiHeaders())->assertStatus(409);
        // Mass assignment: a membership cannot be moved to another user or clinic.
        $this->putJson("{$base}/{$managerMembership->id}", ['role' => 'receptionist', 'user_id' => $clinic->owner_user_id, 'clinic_id' => self::UNKNOWN_ID], $this->apiHeaders())->assertOk();

        $this->assertSame($manager->id, $managerMembership->fresh()->user_id);
        $this->assertSame($clinic->id, $managerMembership->fresh()->clinic_id);
        $this->assertSame(ClinicRole::Owner, $ownerMembership->fresh()->role);
        $this->assertSame(1, $clinic->memberships()->where('role', ClinicRole::Owner->value)->count());
        // Until the invitee accepts, the invitation grants no access to the tenant.
        $this->actingAsUser($invitee)->getJson("/api/v1/clinics/{$clinic->id}/manage", $this->apiHeaders())->assertNotFound();
    }

    public function test_own_clinic_prefix_does_not_unlock_another_tenants_sub_resources(): void
    {
        [$doctorB, $serviceB, $branchB] = $this->bookableDoctor();
        $clinicB = $branchB->clinic;
        $staffB = $this->member($clinicB, ClinicRole::Receptionist);
        $membershipB = $clinicB->memberships()->where('user_id', $staffB->id)->firstOrFail();
        $clinicA = Clinic::factory()->create();
        $a = "/api/v1/clinics/{$clinicA->id}";

        $this->actingAsUser($clinicA->owner);
        $this->putJson("{$a}/branches/{$branchB->id}/hours", ['hours' => []], $this->apiHeaders())->assertNotFound();
        $this->deleteJson("{$a}/branches/{$branchB->id}", [], $this->apiHeaders())->assertNotFound();
        $this->putJson("{$a}/staff/{$membershipB->id}", ['role' => 'manager', 'status' => 'suspended'], $this->apiHeaders())->assertNotFound();
        $this->deleteJson("{$a}/staff/{$membershipB->id}", [], $this->apiHeaders())->assertNotFound();
        // Affiliating a doctor at THEIR branch, or booking THEIR service, through MY clinic is refused.
        $this->postJson("{$a}/doctors", ['doctor_email' => $doctorB->user->email, 'clinic_branch_id' => $branchB->id], $this->apiHeaders())->assertNotFound();
        $this->postJson("{$a}/appointments", [
            'doctor_id' => $doctorB->id, 'service_id' => $serviceB->id, 'starts_at' => $this->cairo('2026-11-18 10:00'),
            'patient_email' => 'walkin@example.test', 'patient_name' => 'Walk In',
        ], $this->apiHeaders())->assertUnprocessable()->assertJsonValidationErrors('service_id');
        foreach (["{$a}/services", "{$a}/schedules", "{$a}/doctors", "{$a}/appointments", "{$a}/staff", "{$a}/branches"] as $url) {
            $body = $this->getJson($url, $this->apiHeaders())->assertOk()->getContent();
            foreach ([$serviceB->id, $branchB->id, $doctorB->id, $staffB->email] as $foreign) {
                $this->assertStringNotContainsString($foreign, $body, $url);
            }
        }

        $this->assertSame(ClinicRole::Receptionist, $membershipB->fresh()->role);
        $this->assertSame(MembershipStatus::Active, $membershipB->fresh()->status);
        $this->assertTrue($branchB->fresh()->is_active);
        $this->assertDatabaseCount('appointments', 0);
        $this->assertDatabaseMissing('users', ['email' => 'walkin@example.test']);
    }
}
