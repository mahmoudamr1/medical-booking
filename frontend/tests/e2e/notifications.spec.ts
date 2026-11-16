/**
 * Notification bell E2E (real API + queue worker, demo data):
 *   npx playwright test tests/e2e/notifications.spec.ts
 *
 * A booking made through the API notifies the patient ("appointment booked"). The test starts from zero
 * unread notifications, follows that notification from the bell to the appointment and cancels the visit.
 */
import { expect, test, type Page } from '@playwright/test';
import {
  apiFetch,
  DESKTOP,
  expectNoRuntimeErrors,
  publicGet,
  sessionAs,
  uniqueSuffix,
} from './helpers';

interface Booked {
  id: string;
  reference: string;
}
interface AppNotification {
  id: string;
  kind: string | null;
  data: { appointment_id?: string };
  read_at: string | null;
}
type Availability = { days: { date: string; slots: { starts_at: string }[] }[] };

/** Books the first free slot a few days ahead (outside cancellation windows) with a listed doctor. */
async function bookVisit(page: Page): Promise<Booked> {
  const doctors = await publicGet<{ id: string }[]>(page, '/doctors?per_page=5');
  for (const doctor of doctors) {
    const services = await publicGet<{ id: string }[]>(page, `/doctors/${doctor.id}/services`);
    if (!services.length) continue;
    const availability = await publicGet<Availability>(
      page,
      `/doctors/${doctor.id}/availability?service_id=${services[0].id}`,
    );
    const slot = availability.days.filter((d) => d.slots.length)[3]?.slots[0];
    if (!slot) continue;
    const booked = await apiFetch<Booked>(page, 'POST', '/appointments', {
      doctor_id: doctor.id,
      service_id: services[0].id,
      starts_at: slot.starts_at,
      notes: `E2E notification ${uniqueSuffix()}`,
    });
    if (booked.status === 201) return booked.body!.data!;
  }
  throw new Error('No listed doctor had a bookable slot a few days ahead');
}

/** The patient's notification about one appointment, once the queue worker has delivered it. */
async function notificationFor(page: Page, appointmentId: string): Promise<AppNotification | null> {
  const list = await apiFetch<AppNotification[]>(page, 'GET', '/notifications?per_page=20');
  return list.body?.data?.find((n) => n.data.appointment_id === appointmentId) ?? null;
}

test('the bell counts a new notification, opens the appointment and marks it read', async ({
  browser,
}) => {
  const s = await sessionAs(browser, 'patient2', { viewport: DESKTOP });
  const { page } = s;
  let appointment: Booked | null = null;
  try {
    expect((await apiFetch(page, 'POST', '/notifications/read-all')).status).toBe(200);
    appointment = await bookVisit(page);
    const { id, reference } = appointment;
    await expect
      .poll(async () => (await notificationFor(page, id))?.kind, { timeout: 60_000 })
      .toBe('appointment.booked_patient');

    // The bell shows the unread count and lists the notification.
    await page.goto('/dashboard/patient');
    const bell = page.getByRole('button', { name: /^Notifications/ });
    await expect(bell).toHaveAccessibleName(/^Notifications \(\d+\)$/);
    await bell.click();
    const item = page.getByRole('dialog').getByRole('link', { name: new RegExp(reference) });
    await expect(item).toBeVisible();

    // Following it opens the appointment and marks the notification read.
    await item.click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/patient/appointments/${id}$`));
    await expect(page.getByTestId('appointment-details')).toContainText(reference);
    await expect.poll(async () => (await notificationFor(page, id))?.read_at).toBeTruthy();

    // The full list keeps it; nothing is unread any more, so the bell loses its count.
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: reference }).first()).toBeVisible();
    await expect(bell).toHaveAccessibleName('Notifications');
    await expectNoRuntimeErrors(s, 'notifications');
  } finally {
    if (appointment)
      await apiFetch(page, 'POST', `/appointments/${appointment.id}/cancel`, {
        reason: 'E2E cleanup',
      });
    await s.context.close();
  }
});
