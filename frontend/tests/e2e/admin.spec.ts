/**
 * Admin dashboard E2E — runs against the real API (no mocks).
 *   npx playwright test tests/e2e/admin.spec.ts --reporter=line
 */
import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';
import { accounts } from './accounts';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
type Account = { email: string; password: string };

// ---- helpers ------------------------------------------------------------------------------

/** Collects uncaught page errors; the Next.js dev overlay is checked separately per page. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
  return errors;
}

async function expectNoRuntimeErrors(page: Page, errors: string[]) {
  await expect(
    page.locator('nextjs-portal').getByText(/Runtime (Type)?Error|Unhandled|\d+ Issues?/),
  ).toHaveCount(0);
  expect(errors, 'uncaught page errors').toEqual([]);
}

async function newPage(browser: Browser, locale: 'en' | 'ar' = 'en'): Promise<Page> {
  const context = await browser.newContext({ baseURL: BASE_URL });
  await context.addCookies([{ name: 'locale', value: locale, url: BASE_URL }]);
  return context.newPage();
}

async function login(page: Page, account: Account) {
  await page.goto('/auth/login');
  await page.locator('#email').fill(account.email);
  await page.locator('#password').fill(account.password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), { timeout: 30_000 });
}

/** Sanctum SPA session for direct API calls (CSRF cookie → X-XSRF-TOKEN header). */
async function apiSession(): Promise<{
  api: APIRequestContext;
  headers: () => Promise<Record<string, string>>;
}> {
  const api = await playwrightRequest.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { Accept: 'application/json', Referer: BASE_URL },
  });
  await api.get('/sanctum/csrf-cookie');
  const headers = async () => {
    const { cookies } = await api.storageState();
    const xsrf = cookies.find((c) => c.name === 'XSRF-TOKEN')?.value ?? '';
    return { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) };
  };
  return { api, headers };
}

/** Registers a disposable patient account through the public API. */
async function createThrowawayUser(): Promise<{ email: string; name: string }> {
  const { api, headers } = await apiSession();
  const stamp = Date.now().toString(36);
  const user = { name: `E2E Throwaway ${stamp}`, email: `e2e.throwaway.${stamp}@example.test` };
  const password = `Throwaway${stamp}9a`;
  const res = await api.post('/api/v1/auth/register', {
    headers: await headers(),
    data: {
      ...user,
      password,
      password_confirmation: password,
      account_type: 'patient',
      locale: 'en',
      accept_terms: true,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  await api.dispose();
  return user;
}

/** Visits an admin page and asserts it rendered without a load-failure state. */
async function visit(page: Page, path: string, heading: RegExp) {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /Loading/ })).toHaveCount(0, {
    timeout: 20_000,
  });
  await expect(page.getByRole('alert').filter({ hasText: 'Could not load data' })).toHaveCount(0);
}

/** Either a populated table (result count) or the empty state is shown. */
async function expectListOrEmpty(page: Page, empty: RegExp) {
  await expect(page.getByTestId('result-count').or(page.getByText(empty)).first()).toBeVisible();
}

// ---- tests ----------------------------------------------------------------------------------

test.describe('admin dashboard', () => {
  let page: Page;
  let errors: string[];

  test.beforeAll(async ({ browser }) => {
    page = await newPage(browser);
    errors = trackErrors(page);
    await login(page, accounts.admin);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('admin lands on the admin overview with live stats and chart', async () => {
    await expect(page).toHaveURL(/\/dashboard\/admin\/?$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Platform overview' })).toBeVisible();
    const patients = page.locator('[data-slot="card"]', { hasText: 'Patients' }).first();
    await expect(patients).toContainText(/\d/);
    await expect(page.getByRole('heading', { name: 'Appointments report' })).toBeVisible();
    // group_by toggle drives the report endpoint
    await page.getByRole('button', { name: 'Specialty', exact: true }).click();
    await expect(page).toHaveURL(/group_by=specialty/);
    await page.getByRole('button', { name: '7 days', exact: false }).click();
    await expect(page).toHaveURL(/from=\d{4}-\d{2}-\d{2}/);
    await expect(page.getByText(/^Period:/)).toBeVisible();
    await expectNoRuntimeErrors(page, errors);
  });

  test('every admin page renders real data', async () => {
    await visit(page, '/dashboard/admin/doctors?status=all', /Doctor verification/);
    await expect(page.locator('[data-testid^="doctor-row-"]').first()).toBeVisible();
    await expectNoRuntimeErrors(page, errors);

    await visit(page, '/dashboard/admin/users', /Users/);
    await expect(page.locator('[data-testid^="user-row-"]').first()).toBeVisible();
    await expect(page.getByTestId('result-count')).toBeVisible();
    await visit(
      page,
      `/dashboard/admin/users?q=${encodeURIComponent(accounts.admin.email)}`,
      /Users/,
    );
    await expect(page.getByTestId(`user-row-${accounts.admin.email}`)).toContainText('You'); // no self-suspend button
    await expect(
      page.getByTestId(`user-row-${accounts.admin.email}`).getByRole('button'),
    ).toHaveCount(0);
    await expectNoRuntimeErrors(page, errors);

    await visit(page, '/dashboard/admin/clinics', /Clinics/);
    await expect(page.getByTestId('result-count')).toBeVisible();
    await expectNoRuntimeErrors(page, errors);

    await visit(page, '/dashboard/admin/appointments', /Appointments/);
    await expectListOrEmpty(page, /No matching appointments/);
    await expectNoRuntimeErrors(page, errors);

    await visit(page, '/dashboard/admin/urgent', /Urgent/);
    await expectListOrEmpty(page, /No matching urgent requests/);
    await page.getByLabel('Flagged only').click(); // URL-controlled checkbox
    await expect(page).toHaveURL(/flagged=1/);
    await expectNoRuntimeErrors(page, errors);

    await visit(page, '/dashboard/admin/reviews', /Review/);
    await expectListOrEmpty(page, /No matching reviews/);
    await page.getByRole('tab', { name: 'Reports' }).click();
    await expect(page).toHaveURL(/tab=reports/);
    await expectListOrEmpty(page, /No reports/);
    await expectNoRuntimeErrors(page, errors);

    await visit(page, '/dashboard/admin/specialties', /Specialties/);
    await expect(page.locator('[data-testid^="specialty-row-"]').first()).toBeVisible();
    await expectNoRuntimeErrors(page, errors);

    await visit(page, '/dashboard/admin/audit', /Audit log/);
    await expectListOrEmpty(page, /No matching entries/);
    await expectNoRuntimeErrors(page, errors);

    await visit(page, '/dashboard/admin/settings', /Platform settings/);
    await expect(page.locator('#set-urgent_critical_timeout_seconds')).not.toHaveValue('');
    await expect(page.locator('#set-emergency_number')).toHaveCount(0); // not shown anywhere since spec 002
    await expectNoRuntimeErrors(page, errors);

    // Removed screen (no backing API) is gone.
    const res = await page.goto('/dashboard/admin/locations');
    expect(res?.status()).toBe(404);
  });

  test('detail sheets open with real data (doctor, urgent, appointment)', async () => {
    // Doctor sheet: any doctor, deep-linked via ?doctor=
    await visit(page, '/dashboard/admin/doctors?status=approved', /Doctor verification/);
    await page
      .locator('[data-testid^="doctor-row-"]')
      .first()
      .getByRole('button', { name: 'View' })
      .click();
    await expect(page).toHaveURL(/doctor=/);
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('heading', { name: 'Documents' })).toBeVisible();
    await expect(sheet.getByRole('heading', { name: 'Verification decision' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Suspend' })).toBeVisible(); // approved → only suspend
    await page.keyboard.press('Escape');
    await expect(page).not.toHaveURL(/doctor=/);

    for (const [path, title] of [
      ['/dashboard/admin/urgent', 'Urgent request details'],
      ['/dashboard/admin/appointments', 'Appointment details'],
    ] as const) {
      await visit(page, path, /./);
      const view = page.getByRole('button', { name: 'View' }).first();
      if ((await view.count()) === 0) {
        test.info().annotations.push({ type: 'note', description: `${path}: no rows to open` });
        continue;
      }
      await view.click();
      await expect(page.getByRole('dialog').getByText(title).first()).toBeVisible();
      await expect(page.getByRole('dialog').getByRole('alert')).toHaveCount(0);
      await page.keyboard.press('Escape');
    }
    await expectNoRuntimeErrors(page, errors);
  });

  test('approves the pending doctor through the verification sheet', async () => {
    await visit(page, '/dashboard/admin/doctors', /Doctor verification/);
    const row = page.getByTestId(`doctor-row-${accounts.pending.email}`);
    await expectListOrEmpty(page, /No verification requests are waiting for review/);
    if ((await row.count()) === 0) {
      test.info().annotations.push({
        type: 'skip-note',
        description: `${accounts.pending.email} is no longer pending (already reviewed) — approval step skipped`,
      });
      test.skip(true, 'pending doctor already reviewed');
    }
    await row.getByRole('button', { name: 'View' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByText(accounts.pending.email)).toBeVisible();
    await expect(sheet.getByRole('heading', { name: 'Documents' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Approve' }).click();
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toContainText('Approve this doctor?');
    await confirm.getByRole('button', { name: 'Approve' }).click();
    await expect(confirm).toBeHidden();
    await expect(sheet.getByText('Verified').first()).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Suspend' })).toBeVisible();
    await expectNoRuntimeErrors(page, errors);
  });

  test('suspends and reactivates a throwaway user', async () => {
    const user = await createThrowawayUser();
    await visit(page, `/dashboard/admin/users?q=${encodeURIComponent(user.email)}`, /Users/);
    const row = page.getByTestId(`user-row-${user.email}`);
    await expect(row).toContainText('Active');

    await row.getByRole('button', { name: 'Suspend' }).click();
    const dialog = page.getByRole('alertdialog');
    const confirmBtn = dialog.getByRole('button', { name: 'Suspend' });
    await expect(confirmBtn).toBeDisabled(); // reason is required
    await dialog.locator('#confirm-reason').fill('E2E: temporary suspension');
    await confirmBtn.click();
    await expect(dialog).toBeHidden();
    await expect(row).toContainText('Suspended');
    await expect(row).toContainText('E2E: temporary suspension');

    await row.getByRole('button', { name: 'Reactivate' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reactivate' }).click();
    await expect(page.getByRole('alertdialog')).toBeHidden();
    await expect(row).toContainText('Active');
    await expectNoRuntimeErrors(page, errors);
  });

  test('updates a setting, validates bounds, and restores it', async () => {
    await visit(page, '/dashboard/admin/settings', /Platform settings/);
    const input = page.locator('#set-reminder_hours_before');
    const original = await input.inputValue();
    const changed = original === '24' ? '25' : '24';
    const save = page.getByRole('button', { name: 'Save', exact: true });

    // client-side bound mirrors the backend (1..168)
    await input.fill('500');
    await save.click();
    await expect(page.getByText(/between 1 and 168/).first()).toBeVisible();

    await input.fill(changed);
    await save.click();
    await expect(save).toBeDisabled(); // form re-synced with the saved server copy
    await page.reload();
    await expect(page.locator('#set-reminder_hours_before')).toHaveValue(changed);

    await page.locator('#set-reminder_hours_before').fill(original);
    await save.click();
    await expect(save).toBeDisabled();
    await page.reload();
    await expect(page.locator('#set-reminder_hours_before')).toHaveValue(original);
    await expectNoRuntimeErrors(page, errors);
  });

  test('renders in Arabic RTL by default', async ({ browser }) => {
    const ar = await newPage(browser, 'ar');
    const arErrors = trackErrors(ar);
    await login(ar, accounts.admin);
    await ar.goto('/dashboard/admin');
    await expect(ar.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(ar.getByRole('heading', { level: 1, name: 'نظرة عامة على المنصة' })).toBeVisible();
    await expectNoRuntimeErrors(ar, arErrors);
    await ar.context().close();
  });
});

test('a patient sees the forbidden state on /dashboard/admin', async ({ browser }) => {
  const page = await newPage(browser);
  const errors = trackErrors(page);
  await login(page, accounts.patient);
  await page.goto('/dashboard/admin');
  await expect(page.getByText('Not allowed')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Platform overview' })).toHaveCount(0);
  await expectNoRuntimeErrors(page, errors);
  await page.context().close();
});
