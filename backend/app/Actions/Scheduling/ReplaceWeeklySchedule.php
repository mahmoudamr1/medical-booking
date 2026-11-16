<?php

namespace App\Actions\Scheduling;

use App\Exceptions\BusinessRuleException;
use App\Models\DoctorProfile;
use App\Models\DoctorSchedule;
use App\Services\Scheduling\AvailabilityService;
use Illuminate\Support\Facades\DB;

/**
 * Replaces a doctor's whole weekly schedule atomically. Existing appointments are never touched.
 *
 * Each row: clinic_branch_id (null = online), day_of_week, starts_at, ends_at (H:i) and optional
 * breaks [{starts_at, ends_at}], already format-validated by the caller.
 */
final class ReplaceWeeklySchedule
{
    public function __construct(private readonly AvailabilityService $availability) {}

    /**
     * @param  array<int, array<string, mixed>>  $rows
     *
     * @throws BusinessRuleException when a branch is not the doctor's, a break leaves its window, or windows overlap
     */
    public function handle(DoctorProfile $doctor, array $rows): void
    {
        $errors = $this->errors($rows, $doctor->activeBranchIds());
        if ($errors) {
            throw BusinessRuleException::unprocessable('validation_failed', __('api.validation_failed'), $errors);
        }

        DB::transaction(function () use ($doctor, $rows) {
            DoctorSchedule::where('doctor_profile_id', $doctor->id)->delete(); // breaks cascade
            foreach ($rows as $row) {
                $schedule = DoctorSchedule::create([
                    'doctor_profile_id' => $doctor->id,
                    'clinic_branch_id' => $row['clinic_branch_id'] ?? null,
                    'day_of_week' => $row['day_of_week'],
                    'starts_at' => $row['starts_at'],
                    'ends_at' => $row['ends_at'],
                ]);
                foreach ($row['breaks'] ?? [] as $break) {
                    $schedule->breaks()->create(['starts_at' => $break['starts_at'], 'ends_at' => $break['ends_at']]);
                }
            }
        });
        $this->availability->refreshNextAvailable($doctor);
    }

    /**
     * Field-keyed validation errors (empty when the schedule is consistent).
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @param  list<string>  $branchIds  branches the doctor may work at
     * @return array<string, list<string>>
     */
    private function errors(array $rows, array $branchIds): array
    {
        $errors = [];
        foreach ($rows as $i => $row) {
            $branch = $row['clinic_branch_id'] ?? null;
            if ($branch !== null && ! in_array($branch, $branchIds, true)) {
                $errors["schedules.$i.clinic_branch_id"] = [__('schedule.branch_not_affiliated')];
            }
            foreach ($row['breaks'] ?? [] as $j => $break) {
                if ($break['starts_at'] >= $break['ends_at'] || $break['starts_at'] < $row['starts_at'] || $break['ends_at'] > $row['ends_at']) {
                    $errors["schedules.$i.breaks.$j"] = [__('schedule.break_outside_window')];
                }
            }
            // A doctor cannot work two overlapping windows on the same day, at any location.
            foreach ($rows as $k => $other) {
                if ($k > $i && $other['day_of_week'] === $row['day_of_week']
                    && $row['starts_at'] < $other['ends_at'] && $other['starts_at'] < $row['ends_at']) {
                    $errors["schedules.$k.starts_at"] = [__('schedule.overlapping_windows')];
                }
            }
        }

        return $errors;
    }
}
