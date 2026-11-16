/**
 * Calendar helpers working with date keys (YYYY-MM-DD) in a given IANA timezone.
 * The API stores instants in UTC; doctors' calendars are defined in their timezone (Africa/Cairo).
 */
export { BUSINESS_TZ } from '@/i18n/format';

const keyFormatterCache = new Map<string, Intl.DateTimeFormat>();

function keyFormatter(tz: string): Intl.DateTimeFormat {
  let f = keyFormatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    keyFormatterCache.set(tz, f);
  }
  return f;
}

/** The calendar date (YYYY-MM-DD) of an instant as seen in `tz`. */
export function dateKeyInTz(value: string | Date, tz: string): string {
  const d = value instanceof Date ? value : new Date(value);
  return keyFormatter(tz).format(d);
}

export function todayKey(tz: string): string {
  return dateKeyInTz(new Date(), tz);
}

export function addDaysToKey(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonthsToKey(key: string, months: number): string {
  const d = new Date(`${key.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeekOfKey(key: string): number {
  return new Date(`${key}T00:00:00Z`).getUTCDay();
}

/** Week start (Saturday, as commonly used in Egypt) for a date key. */
export function startOfWeekKey(key: string, weekStartsOn = 6): string {
  const dow = dayOfWeekOfKey(key);
  const diff = (dow - weekStartsOn + 7) % 7;
  return addDaysToKey(key, -diff);
}

export function startOfMonthKey(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function rangeKeys(fromKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDaysToKey(fromKey, i));
}

/** Offset (minutes) of `tz` from UTC at the given instant. */
export function tzOffsetMinutes(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/** UTC ISO instant for local midnight of `key` in `tz`. */
export function zonedDayStartIso(key: string, tz: string): string {
  const guess = new Date(`${key}T00:00:00Z`);
  let instant = new Date(guess.getTime() - tzOffsetMinutes(guess, tz) * 60000);
  // Re-check once in case the offset differs across a DST change.
  instant = new Date(guess.getTime() - tzOffsetMinutes(instant, tz) * 60000);
  return instant.toISOString();
}

/** Minutes since local midnight for an instant in `tz`. */
export function minutesOfDayInTz(value: string | Date, tz: string): number {
  const d = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === 'hour')?.value) % 24;
  const m = Number(parts.find((p) => p.type === 'minute')?.value);
  return h * 60 + m;
}

/** UTC ISO instant for a wall-clock "YYYY-MM-DDTHH:mm" value (e.g. a datetime-local input) in `tz`. */
export function zonedLocalToIso(local: string, tz: string): string {
  const guess = new Date(`${local}:00Z`);
  let instant = new Date(guess.getTime() - tzOffsetMinutes(guess, tz) * 60000);
  instant = new Date(guess.getTime() - tzOffsetMinutes(instant, tz) * 60000);
  return instant.toISOString();
}

/** Wall-clock "YYYY-MM-DDTHH:mm" of an instant in `tz` (value for datetime-local inputs). */
export function zonedLocalValue(value: Date, tz: string): string {
  return `${dateKeyInTz(value, tz)}T${String(Math.floor(minutesOfDayInTz(value, tz) / 60)).padStart(2, '0')}:${String(minutesOfDayInTz(value, tz) % 60).padStart(2, '0')}`;
}
