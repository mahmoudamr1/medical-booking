<?php

namespace Tests\Feature\Admin;

use App\Models\Appointment;
use App\Models\DoctorProfile;
use App\Models\Review;
use App\Models\User;
use App\Notifications\AdminAlert;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsSchedules;
use Tests\TestCase;

class ReviewsAndAdminTest extends TestCase
{
    use BuildsSchedules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2026-11-16 08:00:00', 'UTC'));
        Notification::fake();
    }

    /** Books, then completes the visit as the doctor. Returns [appointmentId, patient, doctor]. */
    private function completedVisit(?DoctorProfile $doctor = null, $service = null, string $at = '2026-11-16 11:00'): array
    {
        if (! $doctor) {
            [$doctor, $service] = $this->bookableDoctor();
        }
        $patient = $this->patientUser();
        $id = $this->book($patient, $doctor, $service, $at)->assertCreated()->json('data.id');
        $this->travelTo(CarbonImmutable::parse($at, 'Africa/Cairo')->addMinutes(30));
        $this->actingAsUser($doctor->user)->postJson("/api/v1/appointments/{$id}/complete", [], $this->apiHeaders())->assertOk();
        $this->travelTo(CarbonImmutable::parse('2026-11-16 08:00:00', 'UTC'));

        return [$id, $patient, $doctor, $service];
    }

    public function test_only_completed_visit_patient_can_review_once_and_rating_aggregates(): void
    {
        [$id, $patient, $doctor, $service] = $this->completedVisit();

        $this->actingAsUser($this->patientUser())->postJson("/api/v1/appointments/{$id}/review", ['rating' => 5], $this->apiHeaders())->assertForbidden();
        $this->actingAsUser($patient)->postJson("/api/v1/appointments/{$id}/review", ['rating' => 6], $this->apiHeaders())->assertUnprocessable();
        $this->postJson("/api/v1/appointments/{$id}/review", ['rating' => 4, 'comment' => 'Very attentive'], $this->apiHeaders())->assertCreated();
        $this->postJson("/api/v1/appointments/{$id}/review", ['rating' => 1], $this->apiHeaders())->assertStatus(409)->assertJsonPath('code', 'already_reviewed');

        // A booked-but-not-completed (or cancelled) appointment can't be reviewed.
        $pending = $this->book($patient, $doctor, $service, '2026-11-18 10:00')->json('data.id');
        $this->postJson("/api/v1/appointments/{$pending}/review", ['rating' => 5], $this->apiHeaders())
            ->assertUnprocessable()->assertJsonPath('code', 'not_eligible');

        [$id2, $patient2] = $this->completedVisit($doctor, $service, '2026-11-16 12:00');
        $this->actingAsUser($patient2)->postJson("/api/v1/appointments/{$id2}/review", ['rating' => 2], $this->apiHeaders())->assertCreated();

        $doctor->refresh();
        $this->assertSame('3.00', (string) $doctor->rating_avg);
        $this->assertSame(2, $doctor->rating_count);
        $list = $this->getJson("/api/v1/doctors/{$doctor->id}/reviews")->assertOk()->assertJsonCount(2, 'data');
        $this->assertStringNotContainsString($patient->email, $list->getContent());
    }

    public function test_report_and_moderation_hide_excludes_from_average(): void
    {
        $admin = User::factory()->admin()->create();
        [$id, $patient, $doctor] = $this->completedVisit();
        $reviewId = $this->actingAsUser($patient)->postJson("/api/v1/appointments/{$id}/review", ['rating' => 1, 'comment' => 'abusive text'], $this->apiHeaders())->json('data.id');

        $reporter = $this->patientUser();
        $this->actingAsUser($reporter)->postJson("/api/v1/reviews/{$reviewId}/report", ['reason' => 'offensive language'], $this->apiHeaders())->assertCreated();
        $this->postJson("/api/v1/reviews/{$reviewId}/report", ['reason' => 'again again'], $this->apiHeaders())->assertStatus(409);
        Notification::assertSentTo($admin, AdminAlert::class, fn ($n) => $n->alert === 'review_reported');

        $this->actingAsUser($admin)->getJson('/api/v1/admin/reviews?reported=1', $this->apiHeaders())->assertJsonPath('data.0.open_reports_count', 1);
        $this->postJson("/api/v1/admin/reviews/{$reviewId}/hide", ['reason' => 'policy'], $this->apiHeaders())->assertOk()->assertJsonPath('data.status', 'hidden');
        $this->assertSame(0, $doctor->fresh()->rating_count);
        $this->getJson("/api/v1/doctors/{$doctor->id}/reviews")->assertJsonCount(0, 'data');
        $this->assertDatabaseHas('audit_logs', ['action' => 'review.hide', 'subject_id' => $reviewId, 'actor_user_id' => $admin->id]);

        $reportId = $this->getJson('/api/v1/admin/review-reports', $this->apiHeaders())->json('data.0.id');
        $this->postJson("/api/v1/admin/review-reports/{$reportId}/resolve", [], $this->apiHeaders())->assertOk();
        $this->postJson("/api/v1/admin/reviews/{$reviewId}/restore", [], $this->apiHeaders())->assertOk();
        $this->assertSame(1, $doctor->fresh()->rating_count);
    }

    public function test_review_unique_per_appointment_in_database(): void
    {
        [$id, , $doctor] = $this->completedVisit();
        $a = Appointment::find($id);
        Review::create(['appointment_id' => $id, 'doctor_profile_id' => $doctor->id, 'patient_profile_id' => $a->patient_profile_id, 'rating' => 5]);
        $this->expectException(UniqueConstraintViolationException::class);
        Review::create(['appointment_id' => $id, 'doctor_profile_id' => $doctor->id, 'patient_profile_id' => $a->patient_profile_id, 'rating' => 4]);
    }

    public function test_admin_stats_are_computed_from_real_records(): void
    {
        $admin = User::factory()->admin()->create();
        [$doctor, $service] = $this->bookableDoctor();
        DoctorProfile::factory()->pending()->create();
        $this->book($this->patientUser(), $doctor, $service, '2026-11-17 10:00')->assertCreated();
        $cancel = $this->book($this->patientUser(), $doctor, $service, '2026-11-18 10:00')->json('data.id');
        $this->postJson("/api/v1/appointments/{$cancel}/cancel", [], $this->apiHeaders())->assertOk();

        $res = $this->actingAsUser($admin)->getJson('/api/v1/admin/stats', $this->apiHeaders())->assertOk();
        $res->assertJsonPath('data.people.verified_doctors', 1)
            ->assertJsonPath('data.people.pending_verifications', 1)
            ->assertJsonPath('data.appointments.total', 2)
            ->assertJsonPath('data.appointments.upcoming', 1)
            ->assertJsonPath('data.appointments.cancelled', 1);
        $this->assertSame(2, $res->json('data.people.total_doctors'));

        $this->getJson('/api/v1/admin/reports/appointments?group_by=specialty', $this->apiHeaders())->assertOk()
            ->assertJsonPath('data.rows.0.total', 2);
    }

    public function test_admin_user_suspension_invalidates_access_and_is_audited(): void
    {
        $admin = User::factory()->admin()->create();
        $victim = $this->patientUser();

        $this->actingAsUser($admin)->putJson("/api/v1/admin/users/{$victim->id}/status", ['status' => 'suspended'], $this->apiHeaders())
            ->assertUnprocessable(); // reason required
        $this->putJson("/api/v1/admin/users/{$victim->id}/status", ['status' => 'suspended', 'reason' => 'abuse'], $this->apiHeaders())->assertOk();
        $this->putJson("/api/v1/admin/users/{$admin->id}/status", ['status' => 'suspended', 'reason' => 'x'], $this->apiHeaders())->assertStatus(409);
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.status.changed', 'subject_id' => $victim->id]);

        // Real requests load the user fresh from the database.
        $this->actingAsUser($victim->fresh())->getJson('/api/v1/auth/me', $this->apiHeaders())->assertForbidden();
        $this->actingAsUser($admin)->getJson('/api/v1/admin/audit-logs?action=user.', $this->apiHeaders())->assertOk()
            ->assertJsonPath('data.0.action', 'user.status.changed');
    }

    public function test_admin_settings_and_oversight(): void
    {
        $admin = User::factory()->admin()->create();
        [$doctor, $service] = $this->bookableDoctor();
        $id = $this->book($this->patientUser(), $doctor, $service, '2026-11-17 10:00')->json('data.id');

        $this->actingAsUser($admin)->putJson('/api/v1/admin/settings', ['emergency_number' => '123', 'pending_hold_minutes' => 2], $this->apiHeaders())
            ->assertUnprocessable();
        $this->putJson('/api/v1/admin/settings', ['pending_hold_minutes' => 30, 'urgent_tier1_timeout_seconds' => 45], $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.pending_hold_minutes', 30);
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.updated']);

        $this->getJson('/api/v1/admin/appointments', $this->apiHeaders())->assertOk()->assertJsonPath('data.0.id', $id);
        $this->postJson("/api/v1/admin/appointments/{$id}/cancel", [], $this->apiHeaders())->assertUnprocessable();
        $this->postJson("/api/v1/admin/appointments/{$id}/cancel", ['reason' => 'fraud'], $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.status', 'cancelled_by_admin');

        $clinic = $service->clinic;
        $this->putJson("/api/v1/admin/clinics/{$clinic->id}/status", ['status' => 'suspended'], $this->apiHeaders())->assertOk();
        $this->getJson("/api/v1/clinics/{$clinic->slug}")->assertNotFound();
    }

    public function test_every_admin_endpoint_rejects_non_admins(): void
    {
        $doctor = DoctorProfile::factory()->verified()->create();
        $user = $doctor->user; // doctor + patient roles, no admin
        $this->actingAsUser($user);
        foreach ([
            ['GET', 'stats'], ['GET', 'reports/appointments'], ['GET', 'users'], ['GET', 'clinics'], ['GET', 'appointments'],
            ['GET', 'urgent-requests'], ['GET', 'reviews'], ['GET', 'review-reports'], ['GET', 'audit-logs'],
            ['GET', 'settings'], ['PUT', 'settings'], ['GET', 'doctors'], ['GET', 'specialties'],
            ['PUT', "users/{$user->id}/status"], ['POST', "doctors/{$doctor->id}/approve"],
        ] as [$method, $path]) {
            $this->json($method, "/api/v1/admin/{$path}", [], $this->apiHeaders())->assertForbidden();
        }
    }

    public function test_patient_appointment_view_includes_own_review_and_doctor_avatar(): void
    {
        [$id, $patient, $doctor] = $this->completedVisit();
        $doctor->forceFill(['avatar_path' => 'avatars/doctor.jpg'])->save();

        $before = $this->actingAsUser($patient)->getJson("/api/v1/appointments/{$id}", $this->apiHeaders())->assertOk()
            ->assertJsonPath('data.doctor.avatar_url', "/api/v1/doctors/{$doctor->id}/avatar");
        $this->assertArrayHasKey('review', $before->json('data'));
        $this->assertNull($before->json('data.review'));

        $this->postJson("/api/v1/appointments/{$id}/review", ['rating' => 4, 'comment' => 'Kind'], $this->apiHeaders())->assertCreated();
        $this->getJson("/api/v1/appointments/{$id}", $this->apiHeaders())
            ->assertJsonPath('data.review', ['rating' => 4, 'comment' => 'Kind']);
        $this->getJson('/api/v1/patient/appointments?group=completed', $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.0.review.rating', 4)->assertJsonPath('data.0.can.review', false);

        // The treating side never gets the patient's review block on the appointment.
        $this->actingAsUser($doctor->user)->getJson("/api/v1/appointments/{$id}", $this->apiHeaders())
            ->assertOk()->assertJsonMissingPath('data.review');
    }
}
