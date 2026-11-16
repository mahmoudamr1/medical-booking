'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/types/api';
import { LOCALE_COOKIE, dirFor } from './config';
import { createT, type TFunction } from './translate';
import * as fmt from './format';

interface I18nContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  t: TFunction;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** Writes the locale cookie (read server-side by the root layout) and flips <html lang dir> immediately. */
export function persistLocale(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = locale;
  document.documentElement.dir = dirFor(locale);
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const router = useRouter();

  const setLocale = useCallback(
    (next: Locale) => {
      persistLocale(next);
      setLocaleState(next);
      router.refresh(); // re-render server components (html lang/dir, metadata) with the new cookie
    },
    [router],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, dir: dirFor(locale), t: createT(locale), setLocale }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

export function useT(): TFunction {
  return useI18n().t;
}

export function useLocale() {
  const { locale, dir, setLocale } = useI18n();
  return { locale, dir, setLocale };
}

/** Locale-bound formatting helpers (dates in the business timezone, EGP money). */
export function useFormat() {
  const { locale } = useI18n();
  return useMemo(
    () => ({
      date: (v: string | Date, tz?: string, o?: Intl.DateTimeFormatOptions) =>
        fmt.formatDate(v, locale, tz, o),
      time: (v: string | Date, tz?: string) => fmt.formatTime(v, locale, tz),
      dateTime: (v: string | Date, tz?: string) => fmt.formatDateTime(v, locale, tz),
      dateKey: (k: string, o?: Intl.DateTimeFormatOptions) => fmt.formatDateKey(k, locale, o),
      weekday: (d: number, s?: 'long' | 'short') => fmt.weekdayName(d, locale, s),
      money: (n: number) => fmt.formatMoney(n, locale),
      number: (n: number, digits?: number) => fmt.formatNumber(n, locale, digits),
      l: <T extends object>(obj: T | null | undefined, field = 'name') =>
        fmt.localized(obj, field, locale),
    }),
    [locale],
  );
}
