/**
 * Dashboard shell: every role gets the shared sidebar (desktop) or app bar + menu sheet (phone),
 * its links navigate, nothing overflows horizontally, and in Arabic the sidebar sits on the right.
 */
import { expect, test, type Page } from '@playwright/test';
import type { AccountKey } from './accounts';
import { DESKTOP, PHONE, sessionAs, settle, type Locale, type Session } from './helpers';

const ROLES: { who: AccountKey; home: RegExp }[] = [
  { who: 'admin', home: /\/dashboard\/admin/ },
  { who: 'patient', home: /\/dashboard\/patient/ },
  { who: 'doctor', home: /\/dashboard\/doctor/ },
  { who: 'owner', home: /\/dashboard\/clinic\/[0-9a-z]+/ },
  { who: 'reception', home: /\/dashboard\/clinic\/[0-9a-z]+/ },
];

async function openDashboard(s: Session, home: RegExp): Promise<void> {
  await s.page.goto('/dashboard');
  await s.page.waitForURL(home, { timeout: 60_000 });
  await expect(s.page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30_000 });
  await settle(s.page);
}

/** No page errors and no Next.js dev overlay; on failure the overlay's text is included in the message. */
async function expectNoRuntimeErrors(s: Session, where: string): Promise<void> {
  const badge = s.page
    .locator('nextjs-portal')
    .getByText(/Runtime (Type)?Error|Unhandled|d+ Issues?/);
  let details = '';
  if ((await badge.count()) > 0) {
    await s.page
      .locator('nextjs-portal')
      .getByRole('button', { name: 'Open issues overlay' })
      .click()
      .catch(() => undefined);
    details = await s.page
      .locator('nextjs-portal [role="dialog"]')
      .first()
      .innerText({ timeout: 5_000 })
      .catch(() => '(overlay text unavailable)');
  }
  expect(details, `Next.js error overlay on ${where}`).toBe('');
  expect(s.errors, `page errors on ${where}`).toEqual([]);
}

async function expectNoOverflow(page: Page): Promise<void> {
  const { scroll, inner } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    inner: window.innerWidth,
  }));
  expect(scroll, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(inner + 1);
}

/** First in-dashboard link of a nav that is not the current page. */
async function otherDashboardLink(nav: ReturnType<Page['locator']>): Promise<string> {
  const hrefs = await nav
    .locator('a[href^="/dashboard/"]:not([aria-current="page"])')
    .evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
  expect(hrefs.length, 'nav has other dashboard links').toBeGreaterThan(0);
  return hrefs[0];
}

async function expectInlineStartSide(
  page: Page,
  box: { x: number; width: number } | null,
  locale: Locale,
  width: number,
): Promise<void> {
  expect(box).not.toBeNull();
  if (locale === 'ar')
    expect(Math.round(box!.x + box!.width), 'sidebar on the right in RTL').toBeGreaterThanOrEqual(
      width - 1,
    );
  else expect(Math.round(box!.x), 'sidebar on the left in LTR').toBeLessThanOrEqual(1);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
}

for (const { who, home } of ROLES) {
  test(`${who} — desktop sidebar (ar, 1366px)`, async ({ browser }) => {
    const s = await sessionAs(browser, who, { locale: 'ar', viewport: DESKTOP });
    await openDashboard(s, home);
    const sidebar = s.page.getByTestId('dashboard-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('a[aria-current="page"]').first()).toBeVisible();
    await expectInlineStartSide(s.page, await sidebar.boundingBox(), 'ar', DESKTOP.width);
    await expectNoOverflow(s.page);
    await expectNoRuntimeErrors(s, `${who} desktop home`);

    const href = await otherDashboardLink(sidebar.getByRole('navigation'));
    await sidebar.locator(`a[href="${href}"]`).first().click();
    await s.page.waitForURL((u) => u.pathname === href, { timeout: 60_000 });
    await expect(sidebar.locator(`a[href="${href}"]`).first()).toHaveAttribute(
      'aria-current',
      'page',
    );
    await settle(s.page);
    await expectNoOverflow(s.page);
    await expectNoRuntimeErrors(s, `${who} desktop ${href}`);
    await s.context.close();
  });

  test(`${who} — phone app bar, menu sheet and tabs (ar, 390px)`, async ({ browser }) => {
    const s = await sessionAs(browser, who, { locale: 'ar', viewport: PHONE });
    await openDashboard(s, home);
    await expect(s.page.getByTestId('dashboard-sidebar')).toBeHidden();
    await expectNoOverflow(s.page);
    await expectNoRuntimeErrors(s, `${who} phone home`);

    await s.page.getByTestId('dashboard-menu-button').click();
    const sheet = s.page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await expectInlineStartSide(s.page, await sheet.boundingBox(), 'ar', PHONE.width);
    const href = await otherDashboardLink(sheet.getByRole('navigation').first());
    await sheet.locator(`a[href="${href}"]`).first().click();
    await s.page.waitForURL((u) => u.pathname === href, { timeout: 60_000 });
    await expect(sheet).toBeHidden();
    await settle(s.page);
    await expectNoOverflow(s.page);
    await expectNoRuntimeErrors(s, `${who} phone ${href}`);
    await s.context.close();
  });
}

test('English is LTR with the sidebar on the left, and the collapsed rail is remembered', async ({
  browser,
}) => {
  const s = await sessionAs(browser, 'admin', { locale: 'en', viewport: DESKTOP });
  await openDashboard(s, /\/dashboard\/admin/);
  const sidebar = s.page.getByTestId('dashboard-sidebar');
  await expectInlineStartSide(s.page, await sidebar.boundingBox(), 'en', DESKTOP.width);
  expect((await sidebar.boundingBox())!.width).toBeGreaterThan(200);

  await s.page.getByTestId('sidebar-toggle').click();
  await expect.poll(async () => (await sidebar.boundingBox())!.width).toBeLessThan(100);
  await s.page.reload();
  await expect(sidebar).toBeVisible();
  await expect.poll(async () => (await sidebar.boundingBox())!.width).toBeLessThan(100);
  // Rail links keep their accessible names (used for tooltips/screen readers).
  await expect(
    sidebar.getByRole('link', { name: /Doctor verification|Doctors/ }).first(),
  ).toBeVisible();

  await s.page.getByTestId('sidebar-toggle').click();
  await expect.poll(async () => (await sidebar.boundingBox())!.width).toBeGreaterThan(200);
  await expectNoRuntimeErrors(s, 'admin en');
  await s.context.close();
});
