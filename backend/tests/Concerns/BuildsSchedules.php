<?php

namespace Tests\Concerns;

use App\Enums\ConsultationType;
use App\Models\ClinicBranch;
use App\Models\DoctorBranchAffiliation;
use App\Models\DoctorProfile;
use App\Models\DoctorSchedule;
use App\Models\MedicalService;
use App\Models\PatientProfile;
use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Fixtures for a verified, bookable doctor working every day 09:00–17:00 (Cairo) at one branch,
 * with a 20-minute in-person service. Time is frozen by callers via travelTo().
 */
trait BuildsSchedules
{
    protected function bookableDoctor(array $attrs = [], int $duration = 20, ?ClinicBranch $branch = null): array
    {
        $branch ??= ClinicBranch::factory()->create();
        $doctor = DoctorProfile::factory()->verified()->withSpecialty()->create(['lead_time_minutes' => 0] + $attrs);
        DoctorBranchAffiliation::create([
            'doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $branch->id, 'clinic_id' => $branch->clinic_id,
        ]);
        $service = MedicalService::factory()->create([
            'doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $branch->id, 'clinic_id' => $branch->clinic_id,
            'consultation_type' => ConsultationType::InPerson, 'duration_minutes' => $duration, 'price' => 400,
        ]);
        foreach (range(0, 6) as $day) {
            DoctorSchedule::create([
                'doctor_profile_id' => $doctor->id, 'clinic_branch_id' => $branch->id,
                'day_of_week' => $day, 'starts_at' => '09:00', 'ends_at' => '17:00',
            ]);
        }

        return [$doctor->fresh(['user']), $service, $branch];
    }

    protected function patientUser(): User
    {
        return PatientProfile::factory()->create()->user;
    }

    /** UTC ISO string for a Cairo wall-clock time. */
    protected function cairo(string $localDateTime): string
    {
        return CarbonImmutable::parse($localDateTime, 'Africa/Cairo')->utc()->toIso8601String();
    }

    protected function book(User $patient, DoctorProfile $doctor, MedicalService $service, string $localDateTime)
    {
        return $this->actingAsUser($patient)->postJson('/api/v1/appointments', [
            'doctor_id' => $doctor->id, 'service_id' => $service->id, 'starts_at' => $this->cairo($localDateTime),
        ], $this->apiHeaders());
    }
}
