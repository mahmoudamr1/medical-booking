<?php

namespace App\Services\Scheduling;

use App\Enums\AffiliationStatus;
use App\Enums\ClinicStatus;
use App\Models\Appointment;
use App\Models\DoctorProfile;
use App\Models\DoctorSchedule;
use App\Models\MedicalService;
use App\Models\ScheduleException;
use Carbon\CarbonImmutable;

/**
 * Loads schedule data for a doctor + service and asks the pure calculator for slots.
 * Used by the public availability endpoint, by booking revalidation (single source of truth),
 * and to maintain doctor_profiles.next_available_at for discovery.
 */
final class AvailabilityService
{
    public const MAX_RANGE_DAYS = 31;

    public function __construct(private readonly AvailabilityCalculator $calculator) {}

    /** @return array<string, list<array{starts_at:CarbonImmutable, ends_at:CarbonImmutable}>> */
    public function slots(DoctorProfile $doctor, MedicalService $service, string $fromDate, string $toDate, ?CarbonImmutable $now = null): array
    {
        if (! $this->isBookable($doctor, $service)) {
            return [];
        }
        $now ??= CarbonImmutable::now();
        [$rangeStart, $rangeEnd] = $this->utcRange($doctor->timezone, $fromDate, $toDate);

        return $this->calculator->slots(
            $doctor->timezone,
            $this->weekly($doctor, $service),
            $this->exceptions($doctor, $service, $fromDate, $toDate),
            $this->busy($doctor, $rangeStart, $rangeEnd),
            $service->duration_minutes,
            $doctor->buffer_minutes,
            $now,
            $doctor->lead_time_minutes,
            $doctor->horizon_days,
            $fromDate,
            $toDate,
        );
    }

    /**
     * Authoritative check used inside the booking transaction.
     * $ignoreAppointmentId lets a reschedule ignore the appointment being replaced.
     */
    public function isSlotAvailable(DoctorProfile $doctor, MedicalService $service, CarbonImmutable $startsAt, ?string $ignoreAppointmentId = null): bool
    {
        if (! $this->isBookable($doctor, $service)) {
            return false;
        }
        $date = $startsAt->setTimezone($doctor->timezone)->toDateString();
        [$rangeStart, $rangeEnd] = $this->utcRange($doctor->timezone, $date, $date);

        return $this->calculator->isAvailable(
            $startsAt,
            $doctor->timezone,
            $this->weekly($doctor, $service),
            $this->exceptions($doctor, $service, $date, $date),
            $this->busy($doctor, $rangeStart, $rangeEnd, $ignoreAppointmentId),
            $service->duration_minutes,
            $doctor->buffer_minutes,
            CarbonImmutable::now(),
            $doctor->lead_time_minutes,
            $doctor->horizon_days,
        );
    }

    /** Earliest free slot across the doctor's active services within the next $days days. */
    public function nextAvailable(DoctorProfile $doctor, int $days = 14): ?CarbonImmutable
    {
        $today = CarbonImmutable::now($doctor->timezone)->toDateString();
        $until = CarbonImmutable::now($doctor->timezone)->addDays($days)->toDateString();
        $best = null;
        foreach ($doctor->services()->where('is_active', true)->with('branch.clinic')->get() as $service) {
            foreach ($this->slots($doctor, $service, $today, $until) as $slots) {
                $first = $slots[0]['starts_at'];
                $best = $best === null || $first < $best ? $first : $best;
                break; // days are ordered; first day with slots is the earliest for this service
            }
        }

        return $best;
    }

    public function refreshNextAvailable(DoctorProfile $doctor): void
    {
        $doctor->forceFill([
            'next_available_at' => $this->nextAvailable($doctor),
            'min_price' => $doctor->services()->where('is_active', true)->min('price'),
        ])->saveQuietly();
    }

    /** Booking possible at all for this doctor/service pair (independent of time). */
    public function isBookable(DoctorProfile $doctor, MedicalService $service): bool
    {
        if (! $doctor->isPubliclyVisible() || ! $doctor->accepts_bookings) {
            return false;
        }
        if ($service->doctor_profile_id !== $doctor->id || ! $service->is_active) {
            return false;
        }
        if ($service->clinic_branch_id === null) {
            return true;
        }
        $branch = $service->loadMissing('branch.clinic')->branch;

        return $branch && $branch->is_active
            && $branch->clinic?->status === ClinicStatus::Active
            && $doctor->affiliations()->where('clinic_branch_id', $branch->id)
                ->where('status', AffiliationStatus::Active->value)->exists();
    }

    /** @return array<int, list<array{start:string,end:string,breaks:list<array{start:string,end:string}>}>> */
    private function weekly(DoctorProfile $doctor, MedicalService $service): array
    {
        $rules = DoctorSchedule::with('breaks')
            ->where('doctor_profile_id', $doctor->id)
            ->where('is_active', true)
            ->where(fn ($q) => $service->clinic_branch_id
                ? $q->where('clinic_branch_id', $service->clinic_branch_id)
                : $q->whereNull('clinic_branch_id'))
            ->get();

        $weekly = [];
        foreach ($rules as $rule) {
            $weekly[$rule->day_of_week][] = [
                'start' => substr($rule->starts_at, 0, 5),
                'end' => substr($rule->ends_at, 0, 5),
                'breaks' => $rule->breaks->map(fn ($b) => ['start' => substr($b->starts_at, 0, 5), 'end' => substr($b->ends_at, 0, 5)])->all(),
            ];
        }

        return $weekly;
    }

    /** Branch-specific exceptions win over doctor-wide ones for the same date. */
    private function exceptions(DoctorProfile $doctor, MedicalService $service, string $from, string $to): array
    {
        $rows = ScheduleException::where('doctor_profile_id', $doctor->id)
            ->whereBetween('date', [$from, $to])
            ->where(fn ($q) => $q->whereNull('clinic_branch_id')->orWhere('clinic_branch_id', $service->clinic_branch_id))
            ->orderByRaw('clinic_branch_id IS NULL DESC') // doctor-wide first, specific overrides
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $date = $row->date->toDateString();
            // A doctor-wide closure always wins (the doctor is unavailable everywhere).
            if (($out[$date]['type'] ?? null) === 'closed') {
                continue;
            }
            $out[$date] = [
                'type' => $row->type,
                'start' => $row->starts_at ? substr($row->starts_at, 0, 5) : null,
                'end' => $row->ends_at ? substr($row->ends_at, 0, 5) : null,
            ];
        }

        return $out;
    }

    /** Busy periods across ALL of the doctor's locations (a doctor can't be in two places). */
    private function busy(DoctorProfile $doctor, CarbonImmutable $from, CarbonImmutable $to, ?string $ignoreId = null): array
    {
        return Appointment::query()
            ->where('doctor_profile_id', $doctor->id)
            ->blocking()
            ->where(fn ($q) => $q->where('status', 'confirmed')
                ->orWhere('hold_expires_at', '>', now())) // stale pending holds don't block
            ->overlapping($from, $to)
            ->when($ignoreId, fn ($q) => $q->where('id', '<>', $ignoreId))
            ->get(['starts_at', 'blocked_until'])
            ->map(fn (Appointment $a) => [$a->starts_at, $a->blocked_until])
            ->all();
    }

    /** @return array{0:CarbonImmutable,1:CarbonImmutable} */
    private function utcRange(string $tz, string $fromDate, string $toDate): array
    {
        return [
            CarbonImmutable::parse($fromDate, $tz)->startOfDay()->subDay()->utc(),
            CarbonImmutable::parse($toDate, $tz)->endOfDay()->addDay()->utc(),
        ];
    }
}
