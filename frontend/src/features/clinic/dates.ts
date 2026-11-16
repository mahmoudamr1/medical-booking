import { BUSINESS_TZ, addDaysToKey, todayKey, zonedDayStartIso } from '@/lib/dates';
import type { InstantRange } from './types';

/** Saturday-first week order (common in Egypt); values are API day_of_week (0 = Sunday). */
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5] as const;

/** A period of Cairo calendar days (YYYY-MM-DD); `to` is inclusive, an empty side is open-ended. */
export interface DayRange {
  from: string;
  to: string;
}

export function clinicToday(): string {
  return todayKey(BUSINESS_TZ);
}

/** `days` before and after today, e.g. the default report period. */
export function daysAround(days: number): DayRange {
  const today = clinicToday();
  return { from: addDaysToKey(today, -days), to: addDaysToKey(today, days) };
}

export function isValidDayRange({ from, to }: DayRange): boolean {
  return !!from && !!to && to >= from;
}

/** Calendar days → the half-open instant range the API filters by (`to` becomes the next midnight). */
export function dayRangeToInstants({ from, to }: DayRange): InstantRange {
  return {
    from: from ? zonedDayStartIso(from, BUSINESS_TZ) : undefined,
    to: to ? zonedDayStartIso(addDaysToKey(to, 1), BUSINESS_TZ) : undefined,
  };
}
