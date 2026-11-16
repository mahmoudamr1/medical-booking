<?php

namespace App\Services;

use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Cache;

/**
 * Runtime-editable platform settings with typed defaults. Cached; invalidated on write.
 */
final class Settings
{
    private const CACHE_KEY = 'platform_settings.v1';

    /** key => [default, validation rule] */
    public const DEFINITIONS = [
        'emergency_number' => ['123', 'string|max:20'],
        'urgent_enabled' => [true, 'boolean'],
        'pending_hold_minutes' => [60, 'integer|min:5|max:1440'],
        'urgent_tier1_timeout_seconds' => [60, 'integer|min:15|max:900'],
        'urgent_tier2_timeout_seconds' => [90, 'integer|min:15|max:900'],
        'urgent_tier3_timeout_seconds' => [60, 'integer|min:15|max:900'],
        'urgent_critical_timeout_seconds' => [90, 'integer|min:15|max:600'],
        'urgent_directed_timeout_seconds' => [45, 'integer|min:15|max:600'],
        // How long a request nobody could take is kept open for a doctor to become available (0 = never).
        'urgent_wait_max_minutes' => [30, 'integer|min:0|max:120'],
        'urgent_requests_per_hour' => [3, 'integer|min:1|max:50'],
        'urgent_location_retention_hours' => [24, 'integer|min:1|max:720'],
        'reminder_hours_before' => [24, 'integer|min:1|max:168'],
    ];

    /** @return array<string, mixed> */
    public function all(): array
    {
        $stored = Cache::remember(self::CACHE_KEY, 300, fn () => PlatformSetting::pluck('value', 'key')->all());

        $out = [];
        foreach (self::DEFINITIONS as $key => [$default]) {
            $out[$key] = array_key_exists($key, $stored) ? $stored[$key] : $default;
        }
        if (! array_key_exists('emergency_number', $stored)) {
            $out['emergency_number'] = (string) config('services.emergency.number', '123');
        }

        return $out;
    }

    public function get(string $key): mixed
    {
        return $this->all()[$key] ?? null;
    }

    public function int(string $key): int
    {
        return (int) $this->get($key);
    }

    /** @param array<string, mixed> $values */
    public function update(array $values, ?string $userId): void
    {
        foreach ($values as $key => $value) {
            if (! array_key_exists($key, self::DEFINITIONS)) {
                continue;
            }
            PlatformSetting::updateOrCreate(['key' => $key], ['value' => $value, 'updated_by' => $userId]);
        }
        Cache::forget(self::CACHE_KEY);
    }
}
