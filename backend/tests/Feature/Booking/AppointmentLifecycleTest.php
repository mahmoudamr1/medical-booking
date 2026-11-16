<?php

namespace Tests\Feature\Booking;

use App\Enums\ClinicRole;
use App\Models\Appointment;
use App\Models\ClinicMembership;
use App\Models\User;
use App\Notifications\AppointmentNotification;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsSchedules;
use Tests\TestCase;

class AppointmentLifecycleTest extends TestCase
{
    use BuildsSchedules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2026-11-16 08:00:00', 'UTC')); // Mon 10:00 Cairo
        Notification::fake();
    }

    public function test_patient_cancels_within_policy_and_period_is_released(): void
    {
        [$doctor, $service] = $this->bookableDoctor(['min_cancellation_hours' => 24]);
        $patient = $this->patientUser();
        $id = $this->book($patient, $doctor, $service, '2026-11-18 10:00')->json('data.id');

        $this->postJson("/api/v1/appointments/{$id}/cancel", ['reason' => 'travel'], $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.status', 'cancelled_by_patient');

        $a = Appointment::find($id);
        $this->assertNotNull($a->cancelled_at);
        $this->assertSame($patient->id, $a->cancelled_by_user_id);
        $this->assertDatabaseHas('appointment_status_histories', [
            'appointment_id' => $id, 'from_status' => 'confirmed', 'to_status' => 'cancelled_by_patient',
            'actor_role' => 'patient', 'actor_user_id' => $patient->id, 'reason' => 'travel',
        ]);
        // Record kept, period free again.
        $this->book($this->patientUser(), $doctor, $service, '2026-11-18 10:00')->assertCreated();
    }

    public function test_patient_cannot_cancel_inside_notice_window(): void
    {
        [$doctor, $service] = $this->bookableDoctor(['min_cancellation_hours' => 24]);
        $id = $this->book($this->patientUser(), $doctor, $service, '2026-11-16 14:00')->json('data.id');

        $this->postJson("/api/v1/appointments/{$id}/cancel", [], $this->apiHeaders())
            ->assertStatus(409)->assertJsonPath('code', 'policy_violation');
        $this->assertSame('confirmed', Appointment::find($id)->status->value);
    }

    public function test_doctor_confirms_rejects_completes_and_marks_no_show(): void
    {
        [$doctor, $service] = $this->bookableDoctor(['booking_mode' => 'manual']);
        $patient = $this->patientUser();
        $a1 = $this->book($patient, $doctor, $service, '2026-11-16 11:00')->json('data.id');
        $a2 = $this->book($this->patientUser(), $doctor, $service, '2026-11-16 11:20')->json('data.id');

        $this->actingAsUser($doctor->user);
        $this->postJson("/api/v1/appointments/{$a1}/complete", [], $this->apiHeaders())->assertStatus(409); // pending → completed not allowed
        $this->postJson("/api/v1/appointments/{$a1}/confirm", [], $this->apiHeaders())->assertOk()->assertJsonPath('data.status', 'confirmed');
        $this->postJson("/api/v1/appointments/{$a2}/reject", [], $this->apiHeaders())->assertUnprocessable(); // reason required
        $this->postJson("/api/v1/appointments/{$a2}/reject", ['reason' => 'fully booked'], $this->apiHeaders())->assertOk();

        $this->postJson("/api/v1/appointments/{$a1}/complete", [], $this->apiHeaders())->assertStatus(409)->assertJsonPath('code', 'too_early');
        $this->travel(2)->hours();
        $this->postJson("/api/v1/appointments/{$a1}/complete", [], $this->apiHeaders())->assertOk()->assertJsonPath('data.status', 'completed');
        // Completed is terminal.
        $this->postJson("/api/v1/appointments/{$a1}/no-show", [], $this->apiHeaders())->assertStatus(409)->assertJsonPath('code', 'invalid_transition');
        $this->postJson("/api/v1/appointments/{$a1}/cancel", ['reason' => 'x'], $this->apiHeaders())->assertStatus(409);

        $this->assertSame(['pending_confirmation', 'confirmed', 'completed'],
            Appointment::find($a1)->histories->pluck('to_status')->map->value->all());
    }

    public function test_patient_cannot_complete_or_confirm_and_doctor_cannot_touch_others(): void
    {
        [$doctor, $service] = $this->bookableDoctor(['booking_mode' => 'manual']);
        [$otherDoctor] = $this->bookableDoctor();
        $patient = $this->patientUser();
        $id = $this->book($patient, $doctor, $service, '2026-11-17 10:00')->json('data.id');

        $this->actingAsUser($patient)->postJson("/api/v1/appointments/{$id}/confirm", [], $this->apiHeaders())->assertForbidden();
        $this->postJson("/api/v1/appointments/{$id}/complete", [], $this->apiHeaders())->assertForbidden();

        $this->actingAsUser($otherDoctor->user)->postJson("/api/v1/appointments/{$id}/confirm", [], $this->apiHeaders())->assertForbidden();
        $this->getJson("/api/v1/appointments/{$id}", $this->apiHeaders())->assertForbidden();
        $this->actingAsUser($this->patientUser())->getJson("/api/v1/appointments/{$id}", $this->apiHeaders())->assertForbidden();
        $this->assertSame('pending_confirmation', Appointment::find($id)->status->value);
    }

    public function test_doctor_cancellation_requires_reason_and_notifies_patient(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        $patient = $this->patientUser();
        $id = $this->book($patient, $doctor, $service, '2026-11-17 10:00')->json('data.id');

        $this->actingAsUser($doctor->user)->postJson("/api/v1/appointments/{$id}/cancel", [], $this->apiHeaders())->assertUnprocessable();
        $this->postJson("/api/v1/appointments/{$id}/cancel", ['reason' => 'emergency surgery'], $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.status', 'cancelled_by_doctor');
        Notification::assertSentTo($patient, AppointmentNotification::class,
            fn ($n) => $n->event === 'cancelled');
    }

    public function test_reschedule_is_atomic(): void
    {
        [$doctor, $service] = $this->bookableDoctor(['min_cancellation_hours' => 1]);
        $patient = $this->patientUser();
        $original = $this->book($patient, $doctor, $service, '2026-11-17 10:00')->json('data.id');
        $this->book($this->patientUser(), $doctor, $service, '2026-11-17 12:00')->assertCreated();

        // Target is taken → fails, original untouched.
        $this->actingAsUser($patient)->postJson("/api/v1/appointments/{$original}/reschedule",
            ['starts_at' => $this->cairo('2026-11-17 12:00')], $this->apiHeaders())->assertStatus(409);
        $this->assertSame('confirmed', Appointment::find($original)->status->value);
        $this->assertSame(1, Appointment::find($original)->histories()->count());

        // Overlapping its own current period (shift by 20 min) works: old released inside the same transaction.
        $newId = $this->postJson("/api/v1/appointments/{$original}/reschedule",
            ['starts_at' => $this->cairo('2026-11-17 10:20')], $this->apiHeaders())
            ->assertCreated()->assertJsonPath('data.rescheduled_from_id', $original)->json('data.id');

        $old = Appointment::find($original);
        $this->assertSame('cancelled_by_patient', $old->status->value);
        $this->assertSame('rescheduled', $old->cancellation_reason);
        $this->assertSame('confirmed', Appointment::find($newId)->status->value);
        $this->assertSame(1, Appointment::where('patient_profile_id', $old->patient_profile_id)->blocking()->count());
    }

    public function test_reschedule_respects_cancellation_policy(): void
    {
        [$doctor, $service] = $this->bookableDoctor(['min_cancellation_hours' => 48]);
        $patient = $this->patientUser();
        $id = $this->book($patient, $doctor, $service, '2026-11-17 10:00')->json('data.id');

        $this->postJson("/api/v1/appointments/{$id}/reschedule", ['starts_at' => $this->cairo('2026-11-20 10:00')], $this->apiHeaders())
            ->assertStatus(409)->assertJsonPath('code', 'policy_violation');
        $this->assertSame(1, Appointment::count());
    }

    public function test_clinic_staff_can_manage_own_clinic_appointments_only(): void
    {
        [$doctor, $service, $branch] = $this->bookableDoctor(['booking_mode' => 'manual']);
        [$otherDoctor, $otherService] = $this->bookableDoctor();
        $receptionist = User::factory()->create();
        ClinicMembership::create(['clinic_id' => $branch->clinic_id, 'user_id' => $receptionist->id, 'role' => ClinicRole::Receptionist]);

        $mine = $this->book($this->patientUser(), $doctor, $service, '2026-11-17 10:00')->json('data.id');
        $foreign = $this->book($this->patientUser(), $otherDoctor, $otherService, '2026-11-17 10:00')->json('data.id');

        $this->actingAsUser($receptionist)->getJson("/api/v1/appointments/{$mine}", $this->apiHeaders())->assertOk()
            ->assertJsonPath('data.patient.phone', null); // factory users have no phone
        $this->postJson("/api/v1/appointments/{$mine}/confirm", [], $this->apiHeaders())->assertOk();
        $this->postJson("/api/v1/appointments/{$mine}/cancel", ['reason' => 'doctor ill'], $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.status', 'cancelled_by_clinic');
        $this->getJson("/api/v1/appointments/{$foreign}", $this->apiHeaders())->assertForbidden();
        $this->postJson("/api/v1/appointments/{$foreign}/cancel", ['reason' => 'x'], $this->apiHeaders())->assertForbidden();
    }

    public function test_patient_view_hides_contact_details_and_shows_history_to_participants(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        $patient = $this->patientUser();
        $patient->update(['phone' => '01011112222']);
        $id = $this->book($patient, $doctor, $service, '2026-11-17 10:00')->json('data.id');

        $this->getJson("/api/v1/appointments/{$id}", $this->apiHeaders())->assertOk()
            ->assertJsonPath('data.patient.phone', null)
            ->assertJsonPath('data.history.0.to', 'confirmed')
            ->assertJsonPath('data.can.reschedule', true);
        $this->actingAsUser($doctor->user)->getJson("/api/v1/appointments/{$id}", $this->apiHeaders())
            ->assertJsonPath('data.patient.phone', '01011112222')
            ->assertJsonPath('data.can.reschedule', false);
    }
}
