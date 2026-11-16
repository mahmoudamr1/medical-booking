<?php

namespace Tests\Concurrency;

use App\Models\Appointment;
use App\Models\MedicalService;
use App\Models\PatientProfile;
use Carbon\CarbonImmutable;
use Tests\Concerns\BuildsSchedules;

/**
 * SRS §21 Scenario 1: different patients book the same doctor's overlapping period simultaneously.
 * Expected: exactly one success, everyone else a 409 conflict, no duplicate active appointment.
 */
class BookingConcurrencyTest extends ConcurrencyTestCase
{
    use BuildsSchedules;

    private const PROCESSES = 8;

    public function test_only_one_of_many_simultaneous_bookings_succeeds(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        $startsAt = CarbonImmutable::now('Africa/Cairo')->addDays(2)->setTime(10, 0)->utc()->toIso8601String();

        $argSets = [];
        for ($i = 0; $i < self::PROCESSES; $i++) {
            $patient = PatientProfile::factory()->create();
            $argSets[] = [$patient->user_id, $doctor->id, $service->id, $startsAt];
        }

        $results = $this->runConcurrently('testing:book', $argSets);

        $successes = array_values(array_filter($results, fn ($r) => $r['ok']));
        $conflicts = array_values(array_filter($results, fn ($r) => ! $r['ok']));
        $this->assertCount(1, $successes, json_encode($results));
        $this->assertCount(self::PROCESSES - 1, $conflicts);
        foreach ($conflicts as $c) {
            $this->assertSame(409, $c['status']);
            $this->assertSame('booking_conflict', $c['code']);
        }
        $this->assertSame(1, Appointment::where('doctor_profile_id', $doctor->id)->blocking()->count());
    }

    public function test_overlapping_but_different_start_times_still_yield_one_winner(): void
    {
        [$doctor, $service20] = $this->bookableDoctor();
        $service40 = MedicalService::factory()->create([
            'doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $service20->clinic_branch_id,
            'clinic_id' => $service20->clinic_id, 'consultation_type' => 'in_person', 'duration_minutes' => 40,
        ]);
        $day = CarbonImmutable::now('Africa/Cairo')->addDays(2);
        // 10:00–10:40 (40-min service) vs 10:20–10:40 (20-min service): overlapping periods.
        $a = PatientProfile::factory()->create();
        $b = PatientProfile::factory()->create();
        $results = $this->runConcurrently('testing:book', [
            [$a->user_id, $doctor->id, $service40->id, $day->setTime(10, 0)->utc()->toIso8601String()],
            [$b->user_id, $doctor->id, $service20->id, $day->setTime(10, 20)->utc()->toIso8601String()],
        ]);

        $this->assertSame(1, count(array_filter($results, fn ($r) => $r['ok'])), json_encode($results));
        $this->assertSame(1, Appointment::where('doctor_profile_id', $doctor->id)->blocking()->count());
    }
}
