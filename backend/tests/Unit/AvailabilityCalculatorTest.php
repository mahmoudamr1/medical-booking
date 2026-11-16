<?php

namespace Tests\Unit;

use App\Services\Scheduling\AvailabilityCalculator;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;
use Tests\Concerns\CalculatesSlots;

class AvailabilityCalculatorTest extends TestCase
{
    use CalculatesSlots;

    private const TZ = 'Africa/Cairo';

    // Monday 2026-11-16 08:00 UTC = 10:00 Cairo (UTC+2, no DST in November).
    private CarbonImmutable $now;

    private AvailabilityCalculator $calc;

    protected function setUp(): void
    {
        $this->now = CarbonImmutable::parse('2026-11-16 08:00:00', 'UTC');
        $this->calc = new AvailabilityCalculator;
    }

    public function test_generates_grid_from_window_start_using_service_duration(): void
    {
        $this->assertSame(['10:00', '10:20', '10:40', '11:00', '11:20', '11:40', '12:00', '12:20', '12:40'], $this->times([]));
        $this->assertSame(['10:00', '10:30', '11:00', '11:30', '12:00', '12:30'], $this->times(['duration' => 30]));
        $this->assertSame(['10:00', '10:45', '11:30', '12:15'], $this->times(['duration' => 45]));
    }

    public function test_slot_must_fit_entirely_inside_window(): void
    {
        $this->assertSame(['10:00', '11:15'], $this->times(['duration' => 75])); // 12:30 would end at 13:45
        $this->assertSame([], $this->times(['duration' => 200]));
    }

    public function test_breaks_are_excluded_and_grid_restarts_after_break(): void
    {
        $weekly = [2 => [$this->window('10:00', '13:00', [['11:00', '11:30']])]];
        $this->assertSame(['10:00', '10:20', '10:40', '11:30', '11:50', '12:10', '12:30'], $this->times(['weekly' => $weekly]));
    }

    public function test_buffer_is_added_between_slots(): void
    {
        $this->assertSame(['10:00', '10:25', '10:50', '11:15', '11:40', '12:05', '12:30'], $this->times(['buffer' => 5]));
    }

    public function test_existing_appointments_block_including_their_buffer(): void
    {
        // Existing 10:20–10:40 with 10 min buffer → blocked until 10:50.
        $busy = [$this->busy('2026-11-17 10:20', '2026-11-17 10:50')];
        $this->assertSame(['10:00', '10:50', '11:10', '11:30', '11:50', '12:10', '12:30'], $this->times(['busy' => $busy]));
    }

    public function test_new_slot_buffer_must_not_run_into_next_appointment(): void
    {
        // 10:00 slot with 10-min buffer needs [10:00, 10:30); an appointment at 10:25 makes it unavailable.
        $busy = [$this->busy('2026-11-17 10:25', '2026-11-17 10:45')];
        $this->assertNotContains('10:00', $this->times(['busy' => $busy, 'buffer' => 10]));
        $this->assertContains('10:00', $this->times(['busy' => $busy, 'buffer' => 0]));
    }

    public function test_past_times_and_lead_time_are_excluded(): void
    {
        // Today (Monday) 09:00-13:00 Cairo; now is 10:00 Cairo; lead 60 → earliest 11:00.
        $weekly = [1 => [$this->window('09:00', '13:00')]];
        $this->assertSame(['11:00', '11:20', '11:40', '12:00', '12:20', '12:40'], $this->times(['weekly' => $weekly, 'lead' => 60], '2026-11-16'));
        $this->assertSame('10:00', $this->times(['weekly' => $weekly], '2026-11-16')[0]);
    }

    public function test_dates_before_today_or_beyond_horizon_have_no_slots(): void
    {
        $everyday = array_fill(0, 7, [$this->window('10:00', '11:00')]);
        $this->assertSame([], $this->times(['weekly' => $everyday], '2026-11-15'));
        $this->assertNotSame([], $this->times(['weekly' => $everyday, 'horizon' => 3], '2026-11-19'));
        $this->assertSame([], $this->times(['weekly' => $everyday, 'horizon' => 3], '2026-11-20'));
    }

    public function test_closed_exception_removes_day_and_custom_hours_replace_weekly(): void
    {
        $this->assertSame([], $this->times(['exceptions' => ['2026-11-17' => ['type' => 'closed']]]));
        $this->assertSame(['18:00', '18:20', '18:40'], $this->times([
            'exceptions' => ['2026-11-17' => ['type' => 'custom_hours', 'start' => '18:00', 'end' => '19:00']],
        ]));
        // Custom hours also open a day with no weekly rule.
        $this->assertSame(['09:00', '09:20'], $this->times([
            'exceptions' => ['2026-11-18' => ['type' => 'custom_hours', 'start' => '09:00', 'end' => '09:40']],
        ], '2026-11-18'));
    }

    public function test_days_without_schedule_have_no_slots(): void
    {
        $this->assertSame([], $this->times([], '2026-11-18')); // Wednesday
    }

    public function test_multiple_windows_per_day(): void
    {
        $weekly = [2 => [$this->window('17:00', '17:40'), $this->window('10:00', '10:40')]];
        $this->assertSame(['10:00', '10:20', '17:00', '17:20'], $this->times(['weekly' => $weekly]));
    }

    public function test_timezone_and_dst_are_respected(): void
    {
        $tuesdayMorning = [2 => [$this->window('10:00', '10:20')]];

        // Egypt observes DST in summer (UTC+3): 10:00 local on 2026-07-07 (Tuesday) is 07:00Z.
        $summer = $this->slots(['weekly' => $tuesdayMorning, 'now' => CarbonImmutable::parse('2026-07-01 00:00', 'UTC')], '2026-07-07');
        $this->assertSame('2026-07-07T07:00:00+00:00', $summer['2026-07-07'][0]['starts_at']->toIso8601String());

        // Winter (UTC+2): 10:00 local is 08:00Z.
        $winter = $this->slots(['weekly' => $tuesdayMorning], '2026-11-17');
        $this->assertSame('2026-11-17T08:00:00+00:00', $winter['2026-11-17'][0]['starts_at']->toIso8601String());
    }

    public function test_is_available_requires_exact_generated_slot(): void
    {
        $weekly = [2 => [$this->window('10:00', '13:00')]];
        $check = fn (string $local, array $busy = []) => $this->calc->isAvailable($this->local($local), self::TZ, $weekly, [], $busy,
            20, 0, $this->now, 0, 30);

        $this->assertTrue($check('2026-11-17 10:20'));
        $this->assertFalse($check('2026-11-17 10:05'));  // off-grid
        $this->assertFalse($check('2026-11-17 12:50'));  // would end after 13:00
        $this->assertFalse($check('2026-11-17 09:40'));  // outside hours
        $this->assertFalse($check('2026-11-17 10:20', [$this->busy('2026-11-17 10:20', '2026-11-17 10:40')]));
    }
}
