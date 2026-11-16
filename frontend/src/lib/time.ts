'use client';

/** Live clock + localized duration formatting shared by dashboards and urgent screens. */
import { useEffect, useState } from 'react';
import { useFormat, useI18n, useT } from '@/i18n/provider';

/** Re-renders every `ms` so relative times ("waiting 5 min", countdowns) stay live. */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** "2 h 5 min" style duration in the current locale. */
export function useDurationFormat() {
  const t = useT();
  const { locale } = useI18n();
  const n = (v: number) => new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(v);
  return (msValue: number): string => {
    const totalMin = Math.max(0, Math.floor(msValue / 60_000));
    if (totalMin < 1) return t('common.duration.lessThanMinute');
    const d = Math.floor(totalMin / 1440);
    const h = Math.floor((totalMin % 1440) / 60);
    const m = totalMin % 60;
    if (d > 0) return t('common.duration.dh', { d: n(d), h: n(h) });
    if (h > 0)
      return m > 0
        ? t('common.duration.hm', { h: n(h), m: n(m) })
        : t('common.duration.h', { h: n(h) });
    return t('common.duration.m', { m: n(m) });
  };
}

/** Formats a number of seconds as a short, localized duration ("1m 05s", "2h 10m"). */
export function useElapsedFormat() {
  const t = useT();
  const f = useFormat();
  return (totalSeconds: number) => {
    const s = Math.max(0, Math.floor(totalSeconds));
    if (s < 60) return t('common.elapsed.seconds', { s: f.number(s) });
    if (s < 3600) {
      return t('common.elapsed.minutes', { m: f.number(Math.floor(s / 60)), s: f.number(s % 60) });
    }
    return t('common.elapsed.hours', {
      h: f.number(Math.floor(s / 3600)),
      m: f.number(Math.floor((s % 3600) / 60)),
    });
  };
}
