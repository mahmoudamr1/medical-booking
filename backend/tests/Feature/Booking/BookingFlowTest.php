<?php

namespace Tests\Feature\Booking;

use App\Models\Appointment;
use App\Models\ClinicBranch;
use App\Models\DoctorBranchAffiliation;
use App\Models\DoctorSchedule;
use App\Models\MedicalService;
use App\Models\ScheduleException;
use App\Notifications\AppointmentNotification;
use App\Services\Scheduling\AvailabilityService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsSchedules;
use Tests\TestCase;

class BookingFlowTest extends TestCase
{
    use BuildsSchedules;

    protected function setUp(): void
    {
        parent::setUp();
        // Monday 2026-11-16 10:00 Cairo.
        $this->travelTo(CarbonImmutable::parse('2026-11-16 08:00:00', 'UTC'));
        Notification::fake();
    }

    public function test_patient_sees_availability_and_books_a_confirmed_appointment(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        $patient = $this->patientUser();

        $days = $this->getJson("/api/v1/doctors/{$doctor->id}/availability?service_id={$service->id}&date_from=2026-11-17&date_to=2026-11-17")
            ->assertOk()->json('data.days');
        $this->assertSame(24, count($days[0]['slots'])); // 09:00–17:00 / 20 min
        $this->assertSame($this->cairo('2026-11-17 09:00'), $days[0]['slots'][0]['starts_at']);

        $res = $this->book($patient, $doctor, $service, '2026-11-17 09:20')->assertCreated()
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.price', 400)
            ->assertJsonPath('data.doctor.id', $doctor->id);
        $this->assertMatchesRegularExpression('/^MB-[A-Z2-9]{7}$/', $res->json('data.reference'));
        $this->assertSame($this->cairo('2026-11-17 09:40'), $res->json('data.ends_at'));

        $appointment = Appointment::findOrFail($res->json('data.id'));
        $this->assertSame(1, $appointment->histories()->count());
        Notification::assertSentTo($patient, AppointmentNotification::class, fn ($n) => $n->event === 'booked_patient');
        Notification::assertSentTo($doctor->user, AppointmentNotification::class, fn ($n) => $n->event === 'booked_doctor');

        // The slot disappears for everyone else.
        $slots = collect($this->getJson("/api/v1/doctors/{$doctor->id}/availability?service_id={$service->id}&date_from=2026-11-17&date_to=2026-11-17")
            ->json('data.days.0.slots'))->pluck('starts_at');
        $this->assertNotContains($this->cairo('2026-11-17 09:20'), $slots);

        // And appears in the patient's "upcoming" group.
        $this->getJson('/api/v1/patient/appointments?group=upcoming', $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.0.id', $appointment->id);
        $this->getJson('/api/v1/patient/appointments/summary', $this->apiHeaders())->assertJsonPath('data.upcoming', 1);
    }

    public function test_second_booking_of_same_or_overlapping_period_gets_409(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        [, $longService] = [null, MedicalService::factory()->create([
            'doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $service->clinic_branch_id, 'clinic_id' => $service->clinic_id,
            'consultation_type' => 'in_person', 'duration_minutes' => 40,
        ])];

        $this->book($this->patientUser(), $doctor, $service, '2026-11-17 10:00')->assertCreated();
        $this->book($this->patientUser(), $doctor, $service, '2026-11-17 10:00')
            ->assertStatus(409)->assertJsonPath('code', 'booking_conflict')
            ->assertJsonPath('errors.starts_at.0', 'The selected appointment is no longer available');
        // 09:40 + 40 min overlaps 10:00.
        $this->book($this->patientUser(), $doctor, $longService, '2026-11-17 09:40')->assertStatus(409);
        // Adjacent (half-open) is fine.
        $this->book($this->patientUser(), $doctor, $service, '2026-11-17 10:20')->assertCreated();
        $this->assertSame(2, Appointment::count());
    }

    public function test_booking_rejects_invalid_times_and_services(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        [, $otherService] = $this->bookableDoctor();
        $patient = $this->patientUser();

        $this->book($patient, $doctor, $service, '2026-11-17 08:40')->assertStatus(409);  // before hours
        $this->book($patient, $doctor, $service, '2026-11-17 09:05')->assertStatus(409);  // off-grid
        $this->book($patient, $doctor, $service, '2026-11-17 16:50')->assertStatus(409);  // runs past 17:00
        $this->book($patient, $doctor, $service, '2026-11-16 09:00')->assertUnprocessable(); // in the past
        $this->book($patient, $doctor, $service, '2027-03-01 10:00')->assertStatus(409);  // beyond horizon
        $this->book($patient, $doctor, $otherService, '2026-11-17 10:00')
            ->assertUnprocessable()->assertJsonPath('code', 'service_invalid');
        $this->assertSame(0, Appointment::count());
    }

    public function test_unverified_or_closed_doctor_cannot_be_booked(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        $patient = $this->patientUser();

        $doctor->forceFill(['accepts_bookings' => false])->save();
        $this->book($patient, $doctor, $service, '2026-11-17 10:00')->assertUnprocessable()->assertJsonPath('code', 'doctor_unavailable');

        $doctor->forceFill(['accepts_bookings' => true, 'verification_status' => 'suspended'])->save();
        $this->book($patient, $doctor, $service, '2026-11-17 10:00')->assertUnprocessable();
        $this->getJson("/api/v1/doctors/{$doctor->id}/availability?service_id={$service->id}")->assertNotFound();
    }

    public function test_doctor_cannot_book_themselves_and_guest_must_login(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        $this->book($doctor->user, $doctor, $service, '2026-11-17 10:00')->assertUnprocessable()->assertJsonPath('code', 'self_booking');

        $this->app['auth']->forgetGuards();
        $this->postJson('/api/v1/appointments', ['doctor_id' => $doctor->id, 'service_id' => $service->id,
            'starts_at' => $this->cairo('2026-11-17 10:00')])->assertUnauthorized();
    }

    public function test_exception_closure_blocks_booking(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        ScheduleException::create(['doctor_profile_id' => $doctor->id, 'date' => '2026-11-17', 'type' => 'closed']);

        $this->book($this->patientUser(), $doctor, $service, '2026-11-17 10:00')->assertStatus(409);
        $this->getJson("/api/v1/doctors/{$doctor->id}/availability?service_id={$service->id}&date_from=2026-11-17&date_to=2026-11-17")
            ->assertJsonPath('data.days', []);
    }

    public function test_doctor_busy_at_one_branch_is_busy_at_all(): void
    {
        [$doctor, $service, $branchA] = $this->bookableDoctor();
        $branchB = ClinicBranch::factory()->create();
        DoctorBranchAffiliation::create(['doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $branchB->id, 'clinic_id' => $branchB->clinic_id]);
        $online = MedicalService::factory()->create(['doctor_profile_id' => $doctor->id, 'duration_minutes' => 20]);
        DoctorSchedule::create(['doctor_profile_id' => $doctor->id, 'clinic_branch_id' => null,
            'day_of_week' => 2, 'starts_at' => '09:00', 'ends_at' => '12:00']);

        $this->book($this->patientUser(), $doctor, $service, '2026-11-17 10:00')->assertCreated();
        $this->book($this->patientUser(), $doctor, $online, '2026-11-17 10:00')->assertStatus(409);
    }

    public function test_manual_confirmation_creates_blocking_pending_hold_that_expires(): void
    {
        [$doctor, $service] = $this->bookableDoctor(['booking_mode' => 'manual']);
        $id = $this->book($this->patientUser(), $doctor, $service, '2026-11-18 10:00')->assertCreated()
            ->assertJsonPath('data.status', 'pending_confirmation')->json('data.id');

        // The pending request blocks the slot.
        $this->book($this->patientUser(), $doctor, $service, '2026-11-18 10:00')->assertStatus(409);

        // After the hold window (60 min) it no longer blocks; the next booking expires it first.
        $this->travel(61)->minutes();
        $this->book($this->patientUser(), $doctor, $service, '2026-11-18 10:00')->assertCreated();
        $this->assertSame('expired', Appointment::find($id)->status->value);
        $this->assertDatabaseHas('appointment_status_histories', ['appointment_id' => $id, 'to_status' => 'expired', 'actor_role' => 'system']);
    }

    public function test_expire_holds_command_is_idempotent(): void
    {
        [$doctor, $service] = $this->bookableDoctor(['booking_mode' => 'manual']);
        $id = $this->book($this->patientUser(), $doctor, $service, '2026-11-18 10:00')->json('data.id');
        $this->travel(2)->hours();

        $this->artisan('appointments:expire-holds')->expectsOutputToContain('Expired 1');
        $this->artisan('appointments:expire-holds')->expectsOutputToContain('Expired 0');
        $this->assertSame(2, Appointment::find($id)->histories()->count());
    }

    public function test_next_available_and_available_on_filter_use_real_availability(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        app(AvailabilityService::class)->refreshNextAvailable($doctor);
        $this->assertSame($this->cairo('2026-11-16 10:00'), $doctor->fresh()->next_available_at->toIso8601String());
        $this->getJson('/api/v1/doctors')->assertJsonPath('data.0.next_available_at', $this->cairo('2026-11-16 10:00'));
    }
}
