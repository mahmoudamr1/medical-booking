import type { Locale } from '@/types/api';

export const LOCALES: Locale[] = ['ar', 'en'];
export const DEFAULT_LOCALE: Locale = 'ar';
export const LOCALE_COOKIE = 'locale';

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === 'en' ? 'en' : DEFAULT_LOCALE;
}

export function dirFor(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
