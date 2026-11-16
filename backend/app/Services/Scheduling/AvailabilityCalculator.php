<?php

namespace App\Services\Scheduling;

use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use InvalidArgumentException;

/**
 * Pure slot generator (no I/O). All wall-clock times are interpreted in the doctor's timezone;
 * all returned instants are UTC.
 *
 * A slot [start, start+duration) is offered only if:
 *  - it lies inside a working window for that local date (weekly rule, or custom-hours exception),
 *  - it does not overlap a break,
 *  - the date is not a "closed" exception,
 *  - start >= now + lead time, and the local date is within the booking horizon,
 *  - [start, start+duration+buffer) does not overlap any busy (blocking) period.
 * Slots are laid on a grid from each window start, stepping by duration + buffer; after a break
 * or an existing appointment the grid restarts at that period's end.
 */
final class AvailabilityCalculator
{
    /**
     * @param  string  $timezone  doctor's IANA timezone
     * @param  array<int, list<array{start:string,end:string,breaks:list<array{start:string,end:string}>}>>  $weekly  day_of_week (0=Sun) => windows
     * @param  array<string, array{type:string,start?:?string,end?:?string}>  $exceptions  'Y-m-d' => exception
     * @param  list<array{0:CarbonImmutable,1:CarbonImmutable}>  $busy  blocked UTC periods [start, end)
     * @return array<string, list<array{starts_at:CarbonImmutable, ends_at:CarbonImmutable}>> 'Y-m-d' (local) => slots
     */
    public function slots(
        string $timezone,
        array $weekly,
        array $exceptions,
        array $busy,
        int $durationMinutes,
        int $bufferMinutes,
        CarbonImmutable $now,
        int $leadMinutes,
        int $horizonDays,
        string $fromDate,
        string $toDate,
    ): array {
        if ($durationMinutes <= 0) {
            throw new InvalidArgumentException('Duration must be positive.');
        }

        $earliest = $now->addMinutes($leadMinutes);
        $todayLocal = $now->setTimezone($timezone)->startOfDay();
        $lastLocalDate = $todayLocal->addDays($horizonDays)->toDateString();
        $step = $durationMinutes + $bufferMinutes;

        usort($busy, fn ($a, $b) => $a[0] <=> $b[0]);

        $result = [];
        foreach (CarbonPeriod::create($fromDate, $toDate) as $day) {
            $date = $day->toDateString();
            if ($date < $todayLocal->toDateString() || $date > $lastLocalDate) {
                continue;
            }

            $windows = $this->windowsFor($date, $timezone, $weekly, $exceptions);
            $slots = [];
            foreach ($windows as [$windowStart, $windowEnd, $breaks]) {
                $start = $windowStart;
                while ($start->addMinutes($durationMinutes) <= $windowEnd) {
                    $end = $start->addMinutes($durationMinutes);
                    // When blocked by a break or an existing appointment, restart the grid where the
                    // blocking period ends (no wasted gaps); otherwise advance one step.
                    $blockedUntil = $this->overlapEnd($start, $end, $breaks)
                        ?? $this->overlapEnd($start, $end->addMinutes($bufferMinutes), $busy);
                    if ($blockedUntil !== null) {
                        $start = $blockedUntil > $start ? $blockedUntil : $start->addMinutes($step);

                        continue;
                    }
                    if ($start >= $earliest) {
                        $slots[] = ['starts_at' => $start->utc(), 'ends_at' => $end->utc()];
                    }
                    $start = $start->addMinutes($step);
                }
            }
            if ($slots) {
                usort($slots, fn ($a, $b) => $a['starts_at'] <=> $b['starts_at']);
                $result[$date] = $slots;
            }
        }

        return $result;
    }

    /** True when $startsAt is exactly one of the generated slots for its local date. */
    public function isAvailable(
        CarbonImmutable $startsAt,
        string $timezone,
        array $weekly,
        array $exceptions,
        array $busy,
        int $durationMinutes,
        int $bufferMinutes,
        CarbonImmutable $now,
        int $leadMinutes,
        int $horizonDays,
    ): bool {
        $date = $startsAt->setTimezone($timezone)->toDateString();
        $slots = $this->slots($timezone, $weekly, $exceptions, $busy, $durationMinutes, $bufferMinutes,
            $now, $leadMinutes, $horizonDays, $date, $date)[$date] ?? [];

        foreach ($slots as $slot) {
            if ($slot['starts_at']->equalTo($startsAt)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Local working windows for a date as [startUtc, endUtc, breaks[]] with breaks as UTC pairs.
     *
     * @return list<array{0:CarbonImmutable,1:CarbonImmutable,2:list<array{0:CarbonImmutable,1:CarbonImmutable}>}>
     */
    private function windowsFor(string $date, string $timezone, array $weekly, array $exceptions): array
    {
        $exception = $exceptions[$date] ?? null;
        if ($exception && $exception['type'] === 'closed') {
            return [];
        }

        $at = fn (string $time) => CarbonImmutable::parse("{$date} {$time}", $timezone);

        if ($exception && $exception['type'] === 'custom_hours') {
            return [[$at($exception['start']), $at($exception['end']), []]];
        }

        $dayOfWeek = CarbonImmutable::parse($date, $timezone)->dayOfWeek;
        $windows = [];
        foreach ($weekly[$dayOfWeek] ?? [] as $rule) {
            $breaks = array_map(fn ($b) => [$at($b['start']), $at($b['end'])], $rule['breaks'] ?? []);
            $windows[] = [$at($rule['start']), $at($rule['end']), $breaks];
        }

        return $windows;
    }

    /** Half-open overlap test against [start, end) periods; returns the latest end among overlaps, or null. */
    private function overlapEnd(CarbonImmutable $start, CarbonImmutable $end, array $periods): ?CarbonImmutable
    {
        $latest = null;
        foreach ($periods as [$pStart, $pEnd]) {
            if ($start < $pEnd && $pStart < $end && ($latest === null || $pEnd > $latest)) {
                $latest = $pEnd;
            }
        }

        return $latest;
    }
}
