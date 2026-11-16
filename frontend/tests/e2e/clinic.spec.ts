/**
 * Clinic directory + clinic dashboard E2E — real API, demo data (no mocks).
 *   npx playwright test tests/e2e/clinic.spec.ts --reporter=line
 */
import { expect, test, type Browser, type Page } from '@playwright/test';
import { accounts } from './accounts';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const AL_SHIFA_SLUG = 'al-shifa-medical-center';
type Account = { email: string; password: string };

// ---- helpers ------------------------------------------------------------------------------

async function newPage(
  browser: Browser,
  locale: 'en' | 'ar' = 'en',
): Promise<{ page: Page; errors: string[] }> {
  const context = await browser.newContext({ baseURL: BASE_URL });
  await context.addCookies([{ name: 'locale', value: locale, url: BASE_URL }]);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
  return { page, errors };
}

async function expectNoRuntimeErrors(page: Page, errors: string[]) {
  await expect(
    page.locator('nextjs-portal').getByText(/Runtime (Type)?Error|Unhandled|\d+ Issues?/),
  ).toHaveCount(0);
  expect(errors, 'uncaught page errors').toEqual([]);
}

async function login(page: Page, account: Account) {
  await page.goto('/auth/login');
  await page.locator('#email').fill(account.email);
  await page.locator('#password').fill(account.password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), { timeout: 30_000 });
}

/** Same-origin API call from inside the page (shares the Sanctum session cookie + XSRF token). */
async function apiFetch<T = unknown>(
  page: Page,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: { data?: T; code?: string } | null }> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const readXsrf = () =>
        decodeURIComponent(
          (document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN=')) ?? '').slice(11),
        );
      if (method !== 'GET' && !readXsrf())
        await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' });
      const res = await fetch(`/api/v1${path}`, {
        method,
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-XSRF-TOKEN': readXsrf(),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      return { status: res.status, json };
    },
    { method, path, body },
  );
}

async function alShifaId(page: Page): Promise<string> {
  const res = await apiFetch<{ id: string }>(page, 'GET', `/clinics/${AL_SHIFA_SLUG}`);
  expect(res.status).toBe(200);
  return res.json!.data!.id;
}

// ---- public directory ----------------------------------------------------------------------

test('clinic directory and clinic profile render real data', async ({ browser }) => {
  const { page, errors } = await newPage(browser);
  await page.goto('/clinics');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Clinics & medical centers' }),
  ).toBeVisible();
  const card = page.getByTestId('clinic-card').filter({ hasText: 'Al Shifa Medical Center' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('Nasr City');
  await expectNoRuntimeErrors(page, errors);

  // The directory is paginated (showcase data has more clinics than one page): search by name.
  await page.goto('/clinics?q=Nile');
  await expect(page.getByTestId('clinic-card').filter({ hasText: 'Nile Clinic' })).toBeVisible();
  await page.goto('/clinics');

  await card.getByRole('link', { name: 'Al Shifa Medical Center' }).click();
  await page.waitForURL(`**/clinics/${AL_SHIFA_SLUG}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Al Shifa Medical Center' }),
  ).toBeVisible();
  await expect(
    page.getByTestId('clinic-branch').filter({ hasText: 'Nasr City Branch' }),
  ).toBeVisible();
  await expect(page.getByTestId('clinic-branch').first()).toContainText('Saturday');
  await expect(page.getByRole('heading', { name: 'Doctors', exact: true })).toBeVisible();
  await expect(page.locator('a[href^="/doctor/"]').first()).toBeVisible();
  await expect(page.locator('table').getByRole('link', { name: 'Book' }).first()).toBeVisible();
  await expectNoRuntimeErrors(page, errors);

  // Arabic (RTL) renders localized day names.
  const ar = await newPage(browser, 'ar');
  await ar.page.goto(`/clinics/${AL_SHIFA_SLUG}`);
  await expect(ar.page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(ar.page.getByRole('heading', { level: 1, name: 'مركز الشفاء الطبي' })).toBeVisible();
  await expect(ar.page.getByTestId('clinic-branch').first()).toContainText('السبت');
  await expectNoRuntimeErrors(ar.page, ar.errors);
});

// ---- reception: appointments + book on behalf + cancel ---------------------------------------

test('receptionist books on behalf of a new patient and cancels it', async ({ browser }) => {
  const { page, errors } = await newPage(browser);
  await login(page, accounts.reception);
  const clinicId = await alShifaId(page);

  await page.goto('/dashboard/clinic');
  await page.waitForURL(`**/dashboard/clinic/${clinicId}`);
  await expect(page.getByText('Al Shifa Medical Center').first()).toBeVisible();
  await expectNoRuntimeErrors(page, errors);

  await page.getByRole('link', { name: 'Appointments' }).first().click();
  await page.waitForURL(`**/dashboard/clinic/${clinicId}/appointments`);
  await expect(page.getByRole('heading', { level: 1, name: 'Clinic appointments' })).toBeVisible();
  // Real rows (or the empty state when the demo clinic has none upcoming).
  await expect(
    page.getByTestId('clinic-appointments').or(page.getByText('No matching appointments')),
  ).toBeVisible();
  await expectNoRuntimeErrors(page, errors);

  // --- Book on behalf: first doctor/service with a free slot ---
  await page.getByRole('button', { name: 'Book for a patient' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: /on behalf of a patient/i })).toBeVisible();
  const doctorSelect = dialog.locator('#b-doctor');
  const serviceSelect = dialog.locator('#b-service');
  await expect(doctorSelect.locator('option').nth(1)).toBeAttached();
  const doctorValues = await doctorSelect
    .locator('option')
    .evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean));

  let picked = false;
  for (const doctorValue of doctorValues) {
    await doctorSelect.selectOption(doctorValue);
    const serviceValues = await serviceSelect
      .locator('option')
      .evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
    for (const serviceValue of serviceValues) {
      await serviceSelect.selectOption(serviceValue);
      const slot = dialog.locator('button[aria-pressed]').first();
      const none = dialog.getByText(/No available times/i);
      await expect(slot.or(none)).toBeVisible({ timeout: 20_000 });
      if (await slot.isVisible()) {
        await slot.click();
        picked = true;
        break;
      }
    }
    if (picked) break;
  }
  expect(picked, 'a doctor at Al Shifa has at least one free slot').toBe(true);
  await expect(dialog.getByText(/Selected time:/)).toBeVisible();

  const stamp = Date.now().toString(36);
  const patientName = `E2E Walkin ${stamp}`;
  await dialog.locator('#b-email').fill(`e2e.walkin.${stamp}@example.test`);
  await dialog.locator('#b-name').fill(patientName);
  await dialog.getByRole('button', { name: 'Confirm booking' }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await expect(page.locator('[data-sonner-toast]').first()).toBeVisible();

  // --- Find it by patient name and cancel with a reason ---
  await page.locator('#f-q').fill(patientName);
  await page.locator('#f-from').fill('');
  await page.getByRole('button', { name: 'Apply' }).click();
  const row = page
    .getByTestId('clinic-appointments')
    .locator('tbody tr')
    .filter({ hasText: patientName });
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: 'Cancel appointment', exact: true }).click();
  const confirm = page.getByRole('alertdialog');
  await confirm.locator('#confirm-reason').fill('E2E cleanup: patient called to cancel');
  await confirm.getByRole('button', { name: 'Cancel appointment', exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(row.locator('[data-status="cancelled_by_clinic"]')).toBeVisible();
  await expectNoRuntimeErrors(page, errors);
});

// ---- tenant isolation ---------------------------------------------------------------------

test('another clinic owner cannot see Al Shifa data', async ({ browser }) => {
  const { page, errors } = await newPage(browser);
  await login(page, accounts.clinic2Owner);
  const shifaId = await alShifaId(page);

  await page.goto('/dashboard/clinic');
  await page.waitForURL((u) => /\/dashboard\/clinic\/[0-9a-z]{26}/.test(u.pathname));
  expect(page.url()).not.toContain(shifaId);
  await expect(page.getByText('Nile Clinic').first()).toBeVisible();
  await expect(page.getByText('Al Shifa Medical Center')).toHaveCount(0);
  await expectNoRuntimeErrors(page, errors);

  const res = await apiFetch(page, 'GET', `/clinics/${shifaId}/appointments`);
  expect(res.status).toBe(404);

  await page.goto(`/dashboard/clinic/${shifaId}/appointments`);
  await expect(page.getByText("You can't access this clinic")).toBeVisible();
  await expectNoRuntimeErrors(page, errors);
});

test('a patient without memberships sees no clinic dashboard', async ({ browser }) => {
  const { page, errors } = await newPage(browser);
  await login(page, accounts.patient);
  await page.goto('/dashboard/clinic');
  await expect(page.getByText("You're not a member of any clinic yet")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create clinic' }).first()).toBeVisible();
  expect(page.url()).toMatch(/\/dashboard\/clinic$/);
  await expectNoRuntimeErrors(page, errors);
});
