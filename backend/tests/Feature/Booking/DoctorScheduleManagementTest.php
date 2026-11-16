<?php

namespace Tests\Feature\Booking;

use App\Models\Appointment;
use App\Models\ClinicBranch;
use App\Models\DoctorProfile;
use App\Models\MedicalService;
use App\Models\ScheduleException;
use Carbon\CarbonImmutable;
use Database\Factories\ClinicBranchFactory;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsSchedules;
use Tests\TestCase;

class DoctorScheduleManagementTest extends TestCase
{
    use BuildsSchedules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2026-11-16 08:00:00', 'UTC'));
        Notification::fake();
    }

    public function test_independent_doctor_sets_up_practice_service_and_hours_then_gets_booked(): void
    {
        $doctor = DoctorProfile::factory()->verified()->withSpecialty()->create(['lead_time_minutes' => 0]);
        $gov = ClinicBranchFactory::governorate();
        $city = ClinicBranchFactory::city($gov->id);
        $this->actingAsUser($doctor->user);

        $branchId = $this->postJson('/api/v1/doctor/practice', [
            'name_ar' => 'عيادتي', 'city_id' => $city->id, 'address_ar' => 'شارع ١',
        ], $this->apiHeaders())->assertCreated()->json('data.id');

        $this->postJson('/api/v1/doctor/services', [
            'name_ar' => 'كشف', 'name_en' => 'Visit', 'consultation_type' => 'in_person', 'duration_minutes' => 30, 'price' => 350,
        ], $this->apiHeaders())->assertUnprocessable()->assertJsonPath('errors.clinic_branch_id.0', 'In-person services must be linked to a clinic branch');

        $serviceId = $this->postJson('/api/v1/doctor/services', [
            'name_ar' => 'كشف', 'name_en' => 'Visit', 'consultation_type' => 'in_person', 'duration_minutes' => 30,
            'price' => 350, 'clinic_branch_id' => $branchId,
        ], $this->apiHeaders())->assertCreated()->json('data.id');

        $this->putJson('/api/v1/doctor/schedules', ['schedules' => [[
            'clinic_branch_id' => $branchId, 'day_of_week' => 2, 'starts_at' => '18:00', 'ends_at' => '21:00',
            'breaks' => [['starts_at' => '19:30', 'ends_at' => '20:00']],
        ]]], $this->apiHeaders())->assertOk()->assertJsonPath('data.0.breaks.0.starts_at', '19:30');

        $this->putJson('/api/v1/doctor/preferences', ['buffer_minutes' => 10, 'booking_mode' => 'manual'], $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.buffer_minutes', 10);

        $slots = collect($this->getJson("/api/v1/doctors/{$doctor->id}/availability?service_id={$serviceId}&date_from=2026-11-17&date_to=2026-11-17")
            ->assertOk()->json('data.days.0.slots'))->map(fn ($s) => CarbonImmutable::parse($s['starts_at'])->setTimezone('Africa/Cairo')->format('H:i'));
        $this->assertSame(['18:00', '18:40', '20:00'], $slots->all()); // 30 min + 10 buffer; 19:20 would hit the break

        $patient = $this->patientUser();
        $this->book($patient, $doctor, MedicalService::find($serviceId), '2026-11-17 18:40')
            ->assertCreated()->assertJsonPath('data.status', 'pending_confirmation');

        $this->actingAsUser($doctor->user)->getJson('/api/v1/doctor/dashboard', $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.counts.pending', 1);
        $this->getJson('/api/v1/doctor/appointments?from=2026-11-17&to=2026-11-18', $this->apiHeaders())
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_schedule_validation(): void
    {
        [$doctor, , $branch] = $this->bookableDoctor();
        $foreignBranch = ClinicBranch::factory()->create();
        $this->actingAsUser($doctor->user);

        $this->putJson('/api/v1/doctor/schedules', ['schedules' => [
            ['clinic_branch_id' => $foreignBranch->id, 'day_of_week' => 1, 'starts_at' => '09:00', 'ends_at' => '12:00'],
            ['clinic_branch_id' => $branch->id, 'day_of_week' => 2, 'starts_at' => '09:00', 'ends_at' => '12:00',
                'breaks' => [['starts_at' => '13:00', 'ends_at' => '13:30']]],
            ['clinic_branch_id' => $branch->id, 'day_of_week' => 3, 'starts_at' => '09:00', 'ends_at' => '12:00'],
            ['clinic_branch_id' => null, 'day_of_week' => 3, 'starts_at' => '11:00', 'ends_at' => '13:00'],
        ]], $this->apiHeaders())->assertUnprocessable()->assertJsonStructure(['errors' => [
            'schedules.0.clinic_branch_id', 'schedules.1.breaks.0', 'schedules.3.starts_at',
        ]]);

        $this->putJson('/api/v1/doctor/schedules', ['schedules' => [
            ['day_of_week' => 9, 'starts_at' => '12:00', 'ends_at' => '09:00'],
        ]], $this->apiHeaders())->assertUnprocessable()->assertJsonValidationErrors(['schedules.0.day_of_week', 'schedules.0.ends_at']);
    }

    public function test_changing_schedule_keeps_existing_appointments(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        $id = $this->book($this->patientUser(), $doctor, $service, '2026-11-17 10:00')->json('data.id');

        $this->actingAsUser($doctor->user)->putJson('/api/v1/doctor/schedules', ['schedules' => []], $this->apiHeaders())->assertOk();
        $this->assertSame('confirmed', Appointment::find($id)->status->value);
        // No new availability though.
        $this->getJson("/api/v1/doctors/{$doctor->id}/availability?service_id={$service->id}")->assertJsonPath('data.days', []);
    }

    public function test_exceptions_crud_and_range(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        $this->actingAsUser($doctor->user);

        $this->postJson('/api/v1/doctor/exceptions', ['date' => '2026-11-20', 'date_to' => '2026-11-22', 'type' => 'closed', 'reason' => 'conference'],
            $this->apiHeaders())->assertCreated()->assertJsonCount(3, 'data');
        $custom = $this->postJson('/api/v1/doctor/exceptions', ['date' => '2026-11-17', 'type' => 'custom_hours', 'starts_at' => '12:00', 'ends_at' => '12:40'],
            $this->apiHeaders())->assertCreated()->json('data.0.id');

        $this->assertCount(2, $this->getJson("/api/v1/doctors/{$doctor->id}/availability?service_id={$service->id}&date_from=2026-11-17&date_to=2026-11-17")
            ->json('data.days.0.slots'));
        $this->assertSame([], $this->getJson("/api/v1/doctors/{$doctor->id}/availability?service_id={$service->id}&date_from=2026-11-20&date_to=2026-11-22")
            ->json('data.days'));

        $this->postJson('/api/v1/doctor/exceptions', ['date' => '2026-11-10', 'type' => 'closed'], $this->apiHeaders())->assertUnprocessable();
        $this->deleteJson("/api/v1/doctor/exceptions/{$custom}", [], $this->apiHeaders())->assertNoContent();
        $this->assertCount(24, $this->getJson("/api/v1/doctors/{$doctor->id}/availability?service_id={$service->id}&date_from=2026-11-17&date_to=2026-11-17")
            ->json('data.days.0.slots'));
    }

    public function test_search_available_on_filter_uses_engine(): void
    {
        [$busyDoctor] = $this->bookableDoctor();
        [$freeDoctor] = $this->bookableDoctor();
        ScheduleException::create(['doctor_profile_id' => $busyDoctor->id, 'date' => '2026-11-18', 'type' => 'closed']);

        $ids = collect($this->getJson('/api/v1/doctors?available_on=2026-11-18')->assertOk()->json('data'))->pluck('id');
        $this->assertEquals([$freeDoctor->id], $ids->all());
    }

    public function test_services_referenced_by_appointments_are_deactivated_not_deleted(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        $this->book($this->patientUser(), $doctor, $service, '2026-11-17 10:00')->assertCreated();

        $this->actingAsUser($doctor->user)->deleteJson("/api/v1/doctor/services/{$service->id}", [], $this->apiHeaders())->assertNoContent();
        $this->assertFalse($service->fresh()->is_active);
    }

    public function test_exceptions_list_defaults_to_upcoming_and_accepts_a_date_window(): void
    {
        [$doctor] = $this->bookableDoctor();
        ScheduleException::create(['doctor_profile_id' => $doctor->id, 'date' => '2026-11-10', 'type' => 'closed', 'reason' => 'past']);
        ScheduleException::create(['doctor_profile_id' => $doctor->id, 'date' => '2026-11-20', 'type' => 'closed', 'reason' => 'future']);
        $this->actingAsUser($doctor->user);

        $this->getJson('/api/v1/doctor/exceptions', $this->apiHeaders())
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.date', '2026-11-20');
        $this->getJson('/api/v1/doctor/exceptions?from=2026-11-01&to=2026-11-15', $this->apiHeaders())
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.reason', 'past');
        $this->getJson('/api/v1/doctor/exceptions?from=2026-11-01', $this->apiHeaders())->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/v1/doctor/exceptions?from=2026-11-15&to=2026-11-01', $this->apiHeaders())
            ->assertUnprocessable()->assertJsonValidationErrors(['to']);
    }

    public function test_dashboard_pending_counts_only_requests_that_have_not_started(): void
    {
        [$doctor, $service] = $this->bookableDoctor(['booking_mode' => 'manual']);
        $this->book($this->patientUser(), $doctor, $service, '2026-11-16 11:00')
            ->assertCreated()->assertJsonPath('data.status', 'pending_confirmation');
        $this->book($this->patientUser(), $doctor, $service, '2026-11-17 11:00')->assertCreated();

        $this->actingAsUser($doctor->user)->getJson('/api/v1/doctor/dashboard', $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.counts.pending', 2);

        // Once today's request has started it can no longer be confirmed, so it is not "pending" work.
        $this->travelTo(CarbonImmutable::parse('2026-11-16 11:30', 'Africa/Cairo'));
        $this->getJson('/api/v1/doctor/dashboard', $this->apiHeaders())
            ->assertOk()->assertJsonPath('data.counts.pending', 1);
    }
}
