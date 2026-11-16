import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ar } from '@/i18n/ar';
import { en } from '@/i18n/en';
import { dirFor, normalizeLocale } from '@/i18n/config';
import { createT, translate } from '@/i18n/translate';
import { formatMoney, formatTime, localized, weekdayName } from '@/i18n/format';
import { I18nProvider, useLocale, useT } from '@/i18n/provider';
import { routerMock } from '../setup';

function keysOf(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : keysOf(v, `${prefix}${k}.`),
  );
}

describe('i18n', () => {
  it('has identical keys in Arabic and English dictionaries', () => {
    expect(keysOf(en).sort()).toEqual(keysOf(ar).sort());
  });

  it('maps locales to text direction and defaults to Arabic', () => {
    expect(dirFor('ar')).toBe('rtl');
    expect(dirFor('en')).toBe('ltr');
    expect(normalizeLocale(undefined)).toBe('ar');
    expect(normalizeLocale('fr')).toBe('ar');
    expect(normalizeLocale('en')).toBe('en');
  });

  it('translates with interpolation and falls back to the key', () => {
    expect(createT('en')('search.results', { count: 3 })).toBe('3 doctors');
    expect(createT('ar')('nav.login')).toBe('تسجيل الدخول');
    expect(translate(en, 'nope.missing')).toBe('nope.missing');
  });

  it('formats money, times (Africa/Cairo) and localized names', () => {
    expect(formatMoney(350, 'en')).toMatch(/EGP\s?350/);
    expect(formatTime('2026-11-17T08:00:00Z', 'en')).toBe('10:00 AM');
    expect(weekdayName(6, 'en')).toBe('Saturday');
    expect(localized({ name_ar: 'القلب', name_en: 'Cardiology' }, 'name', 'en')).toBe('Cardiology');
    expect(localized({ name_ar: 'القلب', name_en: null }, 'name', 'en')).toBe('القلب');
  });

  it('switches dir/lang on <html>, persists the cookie and refreshes server components', async () => {
    function Probe() {
      const t = useT();
      const { locale, dir, setLocale } = useLocale();
      return (
        <div>
          <p data-testid="state">{`${locale}:${dir}`}</p>
          <p>{t('nav.login')}</p>
          <button onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}>toggle</button>
        </div>
      );
    }
    render(
      <I18nProvider initialLocale="ar">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('state')).toHaveTextContent('ar:rtl');
    expect(screen.getByText('تسجيل الدخول')).toBeInTheDocument();

    await act(() => userEvent.click(screen.getByRole('button', { name: 'toggle' })));

    expect(screen.getByTestId('state')).toHaveTextContent('en:ltr');
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
    expect(document.cookie).toContain('locale=en');
    expect(routerMock.refresh).toHaveBeenCalled();

    await act(() => userEvent.click(screen.getByRole('button', { name: 'toggle' })));
    expect(document.documentElement.dir).toBe('rtl');
  });
});
