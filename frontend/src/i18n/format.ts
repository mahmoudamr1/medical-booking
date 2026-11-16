import type { Locale } from '@/types/api';

export const BUSINESS_TZ = 'Africa/Cairo';

export function intlLocale(locale: Locale): string {
  return locale === 'ar' ? 'ar-EG' : 'en-US';
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(
  value: string | Date,
  locale: Locale,
  tz: string = BUSINESS_TZ,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: tz, ...options }).format(
    toDate(value),
  );
}

export function formatTime(value: string | Date, locale: Locale, tz: string = BUSINESS_TZ): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
  }).format(toDate(value));
}

export function formatDateTime(
  value: string | Date,
  locale: Locale,
  tz: string = BUSINESS_TZ,
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: tz,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(toDate(value));
}

/** Formats a calendar date key (YYYY-MM-DD) without timezone shifting. */
export function formatDateKey(
  key: string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' },
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: 'UTC', ...options }).format(
    new Date(`${key}T12:00:00Z`),
  );
}

/** 0 = Sunday … 6 = Saturday (matches the API's day_of_week). */
export function weekdayName(
  dayOfWeek: number,
  locale: Locale,
  style: 'long' | 'short' = 'long',
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: 'UTC', weekday: style }).format(
    new Date(Date.UTC(2023, 0, 1 + dayOfWeek, 12)),
  );
}

export function formatMoney(amount: number, locale: Locale, currency = 'EGP'): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number, locale: Locale, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits }).format(value);
}

/** Picks the localized field (e.g. name_ar / name_en) with fallback to the other language. */
export function localized<T extends object>(
  obj: T | null | undefined,
  field: string,
  locale: Locale,
): string {
  if (!obj) return '';
  const record = obj as Record<string, unknown>;
  const value = record[`${field}_${locale}`] || record[`${field}_ar`] || record[`${field}_en`];
  return typeof value === 'string' ? value : '';
}
