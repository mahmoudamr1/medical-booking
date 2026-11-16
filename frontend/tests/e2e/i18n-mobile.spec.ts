import { expect, test } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  expectNoRuntimeErrors,
  newSession,
  publicGet,
  settle,
} from './helpers';

test('Arabic RTL is the default and the switcher flips to English LTR and back', async ({
  browser,
}) => {
  const context = await browser.newContext(); // no locale cookie → server default
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('محتاج دكتور شاطر؟');

  await page.getByTestId('language-switcher').first().click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Looking for a great doctor?');

  // Persisted in the cookie: a full reload renders English on the server.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

  await page.getByTestId('language-switcher').first().click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await context.close();
});

for (const locale of ['ar', 'en'] as const) {
  test(`mobile (375px, ${locale}) main pages have no horizontal overflow`, async ({ browser }) => {
    const s = await newSession(browser, { locale, viewport: { width: 375, height: 812 } });
    const doctors = await publicGet<{ id: string }[]>(s.page, '/doctors?per_page=1');
    const clinics = await publicGet<{ slug: string }[]>(s.page, '/clinics?per_page=1').catch(
      () => [],
    );
    const paths = [
      '/',
      '/search',
      '/specialties',
      `/doctor/${doctors[0].id}`,
      '/clinics',
      ...(clinics[0] ? [`/clinics/${clinics[0].slug}`] : []),
      '/urgent',
      '/auth/login',
      '/auth/register',
      '/about',
      '/support',
    ];
    for (const path of paths) {
      await s.page.goto(path);
      await settle(s.page);
      await expectNoHorizontalOverflow(s.page);
      await expectNoRuntimeErrors(s, path);
    }
    // Mobile navigation opens in a sheet.
    await s.page.goto('/');
    await s.page.getByRole('button', { name: locale === 'ar' ? 'القائمة' : 'Menu' }).click();
    await expect(s.page.getByRole('dialog')).toBeVisible();
    await s.context.close();
  });
}
