import { z } from 'zod';
import type { TFunction } from '@/i18n/translate';

/** Mirrors backend/app/Services/Settings.php DEFINITIONS (integer bounds). */
export const BOUNDS = {
  pending_hold_minutes: [5, 1440],
  reminder_hours_before: [1, 168],
  urgent_tier1_timeout_seconds: [15, 900],
  urgent_tier2_timeout_seconds: [15, 900],
  urgent_tier3_timeout_seconds: [15, 900],
  urgent_critical_timeout_seconds: [15, 600],
  urgent_directed_timeout_seconds: [15, 600],
  urgent_requests_per_hour: [1, 50],
  urgent_location_retention_hours: [1, 720],
} as const;

export type IntKey = keyof typeof BOUNDS;

export const KEYS = ['urgent_enabled', ...(Object.keys(BOUNDS) as IntKey[])] as const;

export function makeSchema(t: TFunction, fmt: (n: number) => string) {
  const int = (key: IntKey) => {
    const [min, max] = BOUNDS[key];
    const msg = t('admin.settings.range', { min: fmt(min), max: fmt(max) });
    return z.coerce
      .number<string | number>({ error: t('validation.number') })
      .int(t('validation.number'))
      .min(min, msg)
      .max(max, msg);
  };
  return z.object({
    urgent_enabled: z.boolean(),
    pending_hold_minutes: int('pending_hold_minutes'),
    reminder_hours_before: int('reminder_hours_before'),
    urgent_tier1_timeout_seconds: int('urgent_tier1_timeout_seconds'),
    urgent_tier2_timeout_seconds: int('urgent_tier2_timeout_seconds'),
    urgent_tier3_timeout_seconds: int('urgent_tier3_timeout_seconds'),
    urgent_critical_timeout_seconds: int('urgent_critical_timeout_seconds'),
    urgent_directed_timeout_seconds: int('urgent_directed_timeout_seconds'),
    urgent_requests_per_hour: int('urgent_requests_per_hour'),
    urgent_location_retention_hours: int('urgent_location_retention_hours'),
  });
}
