import { expect, test, type Page } from '@playwright/test';
import { apiFetch, expectNoRuntimeErrors, newSession, sessionAs, settle } from './helpers';

/** Doctor profile id via the doctor's own API (robust against renamed demo data). */
async function doctorProfileId(
  browser: import('@playwright/test').Browser,
  who: 'doctor' | 'manualDoctor',
): Promise<string> {
  const s = await sessionAs(browser, who);
  const res = await apiFetch<{ id: string }>(s.page, 'GET', '/doctor/profile');
  await s.context.close();
  expect(res.status).toBe(200);
  return res.body!.data!.id;
}

/** Picks a day a few days ahead (outside cancellation windows) and returns the first free slot button. */
async function pickSlot(page: Page, dayIndex = 3) {
  const days = page.locator('[role=listbox] [role=option]:not([disabled])');
  await expect(days.first()).toBeVisible();
  const count = await days.count();
  const day = days.nth(Math.min(dayIndex, count - 1));
  const date = (await day.getAttribute('data-date'))!;
  await day.click();
  const slot = page.locator('button[aria-pressed="false"][data-starts-at]').first();
  await expect(slot).toBeVisible();
  return { date, slot, startsAt: (await slot.getAttribute('data-starts-at'))! };
}

async function cancelByReference(page: Page, reference: string) {
  const res = await apiFetch<{ id: string; reference: string; status: string }[]>(
    page,
    'GET',
    '/patient/appointments?per_page=50',
  );
  for (const a of res.body?.data ?? []) {
    if (a.reference === reference && ['confirmed', 'pending_confirmation'].includes(a.status)) {
      await apiFetch(page, 'POST', `/appointments/${a.id}/cancel`, { reason: 'E2E cleanup' });
    }
  }
}

test('book → slot disappears for others → reschedule → cancel', async ({ browser }) => {
  const doctorId = await doctorProfileId(browser, 'doctor');
  const a = await sessionAs(browser, 'patient2');
  const refs: string[] = [];
  try {
    // 1. Patient A books through the UI.
    await a.page.goto(`/doctor/${doctorId}`);
    await a.page.getByRole('radio').first().click();
    const { date, slot, startsAt } = await pickSlot(a.page);
    await slot.click();
    await a.page.getByRole('button', { name: 'Continue' }).click();
    const dialog = a.page.getByRole('alertdialog');
    await dialog.getByLabel('Notes for the doctor (optional)').fill('E2E booking');
    await dialog.getByRole('button', { name: 'Confirm booking' }).click();
    const success = a.page.getByTestId('booking-success');
    await expect(success).toBeVisible();
    const reference = (await success.innerText()).match(/MB-[A-Z0-9]+/)?.[0];
    expect(reference, 'booking reference shown').toBeTruthy();
    refs.push(reference!);

    // 2. Patient B no longer sees that slot on the same day.
    const b = await sessionAs(browser, 'patient');
    await b.page.goto(`/doctor/${doctorId}`);
    await b.page.getByRole('radio').first().click();
    const sameDay = b.page.locator(`[role=option][data-date="${date}"]`);
    await expect(sameDay).toBeVisible();
    if (await sameDay.isEnabled()) {
      await sameDay.click();
      await expect(b.page.locator('button[data-starts-at]').first()).toBeVisible();
    }
    await expect(b.page.locator(`button[data-starts-at="${startsAt}"]`)).toHaveCount(0);
    await expectNoRuntimeErrors(b, 'patient B doctor page');
    await b.context.close();

    // 3. A sees it in the dashboard and reschedules to another slot.
    await a.page.goto('/dashboard/patient');
    const card = a.page.getByTestId('appointment-card').filter({ hasText: reference! });
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Reschedule' }).click();
    const rdialog = a.page.getByRole('dialog');
    await expect(rdialog.locator('[role=option]:not([disabled])').first()).toBeVisible();
    const rdays = rdialog.locator('[role=option]:not([disabled])');
    await rdays.nth(Math.min(4, (await rdays.count()) - 1)).click();
    await rdialog.locator('button[aria-pressed="false"][data-starts-at]').first().click();
    await rdialog.getByRole('button', { name: 'Confirm new time' }).click();
    await a.page.waitForURL(/\/dashboard\/patient\/appointments\/[0-9a-z]{26}$/);
    const details = a.page.locator('main');
    await expect(details.getByText(/MB-[A-Z0-9]+/).first()).toBeVisible();
    const newRef = (await details.innerText()).match(/MB-[A-Z0-9]+/)?.[0];
    expect(newRef).toBeTruthy();
    expect(newRef).not.toBe(reference);
    refs.push(newRef!);

    // 4. Cancel the new appointment with a reason.
    await a.page.getByRole('button', { name: 'Cancel appointment' }).click();
    const cdialog = a.page.getByRole('alertdialog');
    await cdialog.getByLabel('Reason').fill('E2E: plans changed');
    await cdialog.getByRole('button', { name: 'Cancel appointment' }).click();
    await expect(a.page.getByText('Cancelled by patient').first()).toBeVisible();
    await settle(a.page);
    await expectNoRuntimeErrors(a);
  } finally {
    for (const r of refs) await cancelByReference(a.page, r);
    await a.context.close();
  }
});

test('manual-confirmation doctor confirms a pending request from the dashboard', async ({
  browser,
}) => {
  test.setTimeout(240_000); // three sign-ins; may wait out the login rate limiter
  const doctorId = await doctorProfileId(browser, 'manualDoctor');
  const p = await sessionAs(browser, 'patient2');
  let appointmentId: string | null = null;
  try {
    // Patient books (API) the first free slot a few days ahead → pending_confirmation.
    const services = await apiFetch<{ id: string }[]>(
      p.page,
      'GET',
      `/doctors/${doctorId}/services`,
    );
    const serviceId = services.body!.data![0].id;
    const avail = await apiFetch<{ days: { date: string; slots: { starts_at: string }[] }[] }>(
      p.page,
      'GET',
      `/doctors/${doctorId}/availability?service_id=${serviceId}`,
    );
    const days = avail.body!.data!.days.filter((d) => d.slots.length);
    const slot = (days[2] ?? days[days.length - 1]).slots[0];
    const booked = await apiFetch<{ id: string; status: string; reference: string }>(
      p.page,
      'POST',
      '/appointments',
      {
        doctor_id: doctorId,
        service_id: serviceId,
        starts_at: slot.starts_at,
        notes: 'E2E manual',
      },
    );
    expect(booked.status).toBe(201);
    expect(booked.body!.data!.status).toBe('pending_confirmation');
    appointmentId = booked.body!.data!.id;
    const reference = booked.body!.data!.reference;

    // Doctor confirms in the UI.
    const d = await sessionAs(browser, 'manualDoctor');
    await d.page.goto('/dashboard/doctor');
    // Works for the overview pending list and appointment cards (both expose data-reference).
    const card = d.page.locator(`[data-reference="${reference}"]`).first();
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Confirm' }).click();
    await d.page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click();
    await expect(card).toHaveCount(0); // leaves the pending list

    const after = await apiFetch<{ status: string }>(
      p.page,
      'GET',
      `/appointments/${appointmentId}`,
    );
    expect(after.body!.data!.status).toBe('confirmed');
    await expectNoRuntimeErrors(d);
    await d.context.close();
  } finally {
    if (appointmentId)
      await apiFetch(p.page, 'POST', `/appointments/${appointmentId}/cancel`, {
        reason: 'E2E cleanup',
      });
    await p.context.close();
  }
});

test('guests are asked to sign in before booking and return to the doctor page', async ({
  browser,
}) => {
  const doctorId = await doctorProfileId(browser, 'doctor');
  const s = await newSession(browser);
  await s.page.goto(`/doctor/${doctorId}`);
  await s.page.getByRole('radio').first().click();
  const { slot } = await pickSlot(s.page, 1);
  await slot.click();
  await s.page.getByRole('button', { name: 'Sign in to complete your booking' }).click();
  await s.page.waitForURL(/\/auth\/login\?next=/);
  await s.page.locator('#email').fill((await import('./accounts')).accounts.patient2.email);
  await s.page.locator('#password').fill((await import('./accounts')).accounts.patient2.password);
  await s.page.locator('form button[type=submit]').click();
  await s.page.waitForURL(new RegExp(`/doctor/${doctorId}`));
  await expectNoRuntimeErrors(s);
  await s.context.close();
});
