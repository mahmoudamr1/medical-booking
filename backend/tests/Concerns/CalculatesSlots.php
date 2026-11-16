<?php

namespace Tests\Concerns;

use App\Services\Scheduling\AvailabilityCalculator;
use Carbon\CarbonImmutable;

/**
 * Drives the pure AvailabilityCalculator with readable defaults: a doctor in Africa/Cairo working
 * Tuesdays 10:00–13:00, 20-minute slots, no buffer or lead time, 30-day horizon, and "now" fixed
 * at Monday 2026-11-16 10:00 Cairo (08:00 UTC, winter time).
 */
trait CalculatesSlots
{
    /**
     * @param  array<string, mixed>  $args  overrides: timezone, weekly, exceptions, busy, duration, buffer, lead, horizon, now
     * @return array<string, list<array{starts_at:CarbonImmutable, ends_at:CarbonImmutable}>>
     */
    protected function slots(array $args, string $from, ?string $to = null): array
    {
        $a = $args + [
            'timezone' => 'Africa/Cairo',
            'weekly' => [2 => [$this->window('10:00', '13:00')]],
            'exceptions' => [], 'busy' => [], 'duration' => 20, 'buffer' => 0, 'lead' => 0, 'horizon' => 30,
            'now' => CarbonImmutable::parse('2026-11-16 08:00:00', 'UTC'),
        ];

        return (new AvailabilityCalculator)->slots($a['timezone'], $a['weekly'], $a['exceptions'], $a['busy'],
            $a['duration'], $a['buffer'], $a['now'], $a['lead'], $a['horizon'], $from, $to ?? $from);
    }

    /**
     * @param  array<string, mixed>  $args
     * @return list<string> local H:i start times of the slots offered on $date
     */
    protected function times(array $args, string $date = '2026-11-17'): array
    {
        $timezone = $args['timezone'] ?? 'Africa/Cairo';

        return array_map(
            fn (array $slot) => $slot['starts_at']->setTimezone($timezone)->format('H:i'),
            $this->slots($args, $date)[$date] ?? [],
        );
    }

    /**
     * @param  list<array{0:string,1:string}>  $breaks  [start, end] pairs
     * @return array{start:string,end:string,breaks:list<array{start:string,end:string}>}
     */
    protected function window(string $start, string $end, array $breaks = []): array
    {
        return [
            'start' => $start, 'end' => $end,
            'breaks' => array_map(fn (array $b) => ['start' => $b[0], 'end' => $b[1]], $breaks),
        ];
    }

    /** The UTC instant of a Cairo wall-clock time. */
    protected function local(string $dateTime): CarbonImmutable
    {
        return CarbonImmutable::parse($dateTime, 'Africa/Cairo')->utc();
    }

    /**
     * A busy period as the calculator expects it.
     *
     * @return array{0:CarbonImmutable,1:CarbonImmutable}
     */
    protected function busy(string $localStart, string $localEnd): array
    {
        return [$this->local($localStart), $this->local($localEnd)];
    }
}
