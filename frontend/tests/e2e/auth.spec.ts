import { expect, test } from '@playwright/test';
import { accounts, type AccountKey } from './accounts';
import { expectNoRuntimeErrors, loginUI, newSession, settle, uniqueSuffix } from './helpers';

test('a new patient registers, signs out and signs back in', async ({ browser }) => {
  test.setTimeout(240_000); // several sign-ins; may wait out the login rate limiter
  const s = await newSession(browser);
  const { page } = s;
  const email = `e2e.patient.${uniqueSuffix()}@example.test`;
  const password = 'E2e-Passw0rd!';

  await page.goto('/auth/register');
  await page.locator('#name').fill('E2E Test Patient');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#password_confirmation').fill(password);
  await page.locator('#accept_terms').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/dashboard/patient');
  await expect(page.locator('main h1').first()).toBeVisible();

  // Sign out from the user menu.
  await page.getByRole('button', { name: 'My account' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await page.waitForURL((u) => u.pathname === '/');
  await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible();

  // Wrong password shows the API's validation message, then the right one works.
  await page.goto('/auth/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('wrong-password-1');
  await page.locator('form button[type=submit]').click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await page.locator('#password').fill(password);
  await page.locator('form button[type=submit]').click();
  await page.waitForURL('**/dashboard/patient');
  await expectNoRuntimeErrors(s);
  await s.context.close();
});

test('client-side validation blocks an invalid registration', async ({ browser }) => {
  const { page, context } = await newSession(browser);
  await page.goto('/auth/register');
  await page.locator('#email').fill('not-an-email');
  await page.locator('#phone').fill('0123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Enter a valid email')).toBeVisible();
  await expect(page.getByText('Invalid phone number')).toBeVisible();
  await expect(page.getByText('You must accept the terms')).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/register/);
  await context.close();
});

// Every demo account opens its own dashboard after sign-in (and when visiting /dashboard).
for (const who of Object.keys(accounts) as AccountKey[]) {
  test(`${who} lands on ${accounts[who].dashboard}`, async ({ browser }) => {
    const s = await newSession(browser);
    await loginUI(s.page, who);
    await expect(s.page).toHaveURL(
      new RegExp(`${accounts[who].dashboard}(/[0-9a-z]{26})?([?#].*)?$`),
    );
    await s.page.goto('/dashboard');
    await expect(s.page).toHaveURL(
      new RegExp(`${accounts[who].dashboard}(/[0-9a-z]{26})?([?#].*)?$`),
    );
    await settle(s.page);
    await expectNoRuntimeErrors(s);
    await s.context.close();
  });
}

test('a safe ?next= wins over the role landing page, an external one is ignored', async ({
  browser,
}) => {
  const s = await newSession(browser);
  await loginUI(s.page, 'patient', '/specialties');
  await expect(s.page).toHaveURL(/\/specialties$/);
  await s.context.close();

  const s2 = await newSession(browser);
  await loginUI(s2.page, 'patient', 'https://example.com/phish');
  await expect(s2.page).toHaveURL(/\/dashboard\/patient/);
  await s2.context.close();
});

test('a patient sees a forbidden state on the doctor dashboard; guests are sent to login', async ({
  browser,
}) => {
  const s = await newSession(browser);
  await s.page.goto('/dashboard/doctor');
  await s.page.waitForURL(/\/auth\/login\?next=/);
  await loginUI(s.page, 'patient');
  await s.page.goto('/dashboard/doctor');
  await expect(s.page.getByText('Not allowed')).toBeVisible();
  await s.context.close();
});
