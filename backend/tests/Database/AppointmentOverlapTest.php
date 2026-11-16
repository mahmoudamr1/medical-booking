<?php

namespace Tests\Database;

use App\Models\MedicalService;
use App\Models\PatientProfile;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\BuildsSchedules;
use Tests\TestCase;

/** The exclusion constraint must hold even when application checks are bypassed entirely. */
class AppointmentOverlapTest extends TestCase
{
    use BuildsSchedules;

    private function insert(string $doctorId, MedicalService $service, string $start, string $end, string $status = 'confirmed', ?string $blockedUntil = null): void
    {
        $patient = PatientProfile::factory()->create();
        DB::table('appointments')->insert([
            'id' => strtolower((string) Str::ulid()), 'reference' => 'MB-'.Str::upper(Str::random(7)),
            'doctor_profile_id' => $doctorId, 'patient_profile_id' => $patient->id, 'medical_service_id' => $service->id,
            'consultation_type' => 'online', 'starts_at' => $start, 'ends_at' => $end, 'blocked_until' => $blockedUntil ?? $end,
            'price' => 100, 'status' => $status, 'booked_by_user_id' => $patient->user_id, 'booked_via' => 'patient',
            'hold_expires_at' => $status === 'pending_confirmation' ? '2030-01-01 00:00:00+00' : null,
            'cancelled_at' => str_starts_with($status, 'cancelled') ? now() : null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function assertExclusionViolation(callable $fn): void
    {
        try {
            DB::transaction($fn);
            $this->fail('Expected exclusion violation');
        } catch (QueryException $e) {
            $this->assertSame('23P01', $e->getCode());
        }
    }

    public function test_overlapping_active_appointments_for_same_doctor_are_rejected_by_database(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        $this->insert($doctor->id, $service, '2030-01-01 10:00+00', '2030-01-01 10:30+00');

        $this->assertExclusionViolation(fn () => $this->insert($doctor->id, $service, '2030-01-01 10:15+00', '2030-01-01 10:45+00'));
        $this->assertExclusionViolation(fn () => $this->insert($doctor->id, $service, '2030-01-01 09:45+00', '2030-01-01 10:01+00', 'pending_confirmation'));
        // Half-open: touching is allowed.
        $this->insert($doctor->id, $service, '2030-01-01 10:30+00', '2030-01-01 11:00+00');
        $this->assertSame(2, DB::table('appointments')->count());
    }

    public function test_buffer_extends_blocked_period(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        $this->insert($doctor->id, $service, '2030-01-01 10:00+00', '2030-01-01 10:20+00', 'confirmed', '2030-01-01 10:30+00');
        $this->assertExclusionViolation(fn () => $this->insert($doctor->id, $service, '2030-01-01 10:25+00', '2030-01-01 10:45+00'));
    }

    public function test_inactive_statuses_do_not_block_and_other_doctors_are_independent(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        [$other, $otherService] = $this->bookableDoctor();
        foreach (['cancelled_by_patient', 'rejected', 'expired', 'completed', 'no_show'] as $status) {
            $this->insert($doctor->id, $service, '2030-01-01 10:00+00', '2030-01-01 10:30+00', $status);
        }
        $this->insert($doctor->id, $service, '2030-01-01 10:00+00', '2030-01-01 10:30+00');
        $this->insert($other->id, $otherService, '2030-01-01 10:00+00', '2030-01-01 10:30+00');
        $this->assertSame(7, DB::table('appointments')->count());
    }

    public function test_status_update_back_to_active_is_also_checked(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        $this->insert($doctor->id, $service, '2030-01-01 10:00+00', '2030-01-01 10:30+00', 'cancelled_by_patient');
        $this->insert($doctor->id, $service, '2030-01-01 10:00+00', '2030-01-01 10:30+00');
        $this->assertExclusionViolation(fn () => DB::table('appointments')->where('status', 'cancelled_by_patient')
            ->update(['status' => 'confirmed', 'cancelled_at' => null]));
    }

    public function test_period_and_status_check_constraints(): void
    {
        [$doctor, $service] = $this->bookableDoctor();
        foreach ([
            fn () => $this->insert($doctor->id, $service, '2030-01-01 10:30+00', '2030-01-01 10:00+00'),            // end before start
            fn () => $this->insert($doctor->id, $service, '2030-01-01 10:00+00', '2030-01-01 10:30+00', 'teleported'), // unknown status
            fn () => $this->insert($doctor->id, $service, '2030-01-01 10:00+00', '2030-01-01 10:30+00', 'confirmed', '2030-01-01 10:10+00'), // blocked < end
        ] as $bad) {
            try {
                DB::transaction($bad);
                $this->fail('Expected check violation');
            } catch (QueryException $e) {
                $this->assertSame('23514', $e->getCode());
            }
        }
    }
}
