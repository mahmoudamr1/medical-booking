/**
 * Patient dashboard E2E (real API, demo data):
 *   npx playwright test tests/e2e/patient.spec.ts
 * Rating a visit is permanent, so the rating test picks any reviewable visit and skips when none is left.
 */
import { expect, test } from '@playwright/test';
import {
  apiFetch,
  auditPage,
  DESKTOP,
  expectNoRuntimeErrors,
  PHONE,
  sessionAs,
  type Session,
} from './helpers';

type Group = 'upcoming' | 'pending' | 'completed' | 'cancelled';
/** "upcoming" is the default tab, so it is visited last (clicking the active tab changes nothing). */
const GROUPS: Group[] = ['pending', 'completed', 'cancelled', 'upcoming'];

interface Appt {
  id: string;
  reference: string;
  can: { review: boolean } | null;
}

test.describe.configure({ mode: 'serial' });

test('patient dashboard: tabs show API counts and their lists, detail page shows the timeline', async ({
  browser,
}) => {
  const s = await sessionAs(browser, 'patient', { viewport: DESKTOP });
  try {
    const summary = (
      await apiFetch<Record<Group, number>>(s.page, 'GET', '/patient/appointments/summary')
    ).body!.data!;
    await auditPage(s, '/dashboard/patient');
    await expect(
      s.page.getByTestId('urgent-card').getByRole('link', { name: 'Urgent request history' }),
    ).toHaveAttribute('href', '/urgent/history');
    await expect(s.page.getByTestId('recent-notifications')).toBeVisible();

    for (const group of GROUPS) {
      await s.page.getByTestId(`tab-${group}`).click();
      await expect(s.page).toHaveURL(new RegExp(`tab=${group}`));
      await expect(s.page.getByTestId(`count-${group}`)).toHaveText(String(summary[group]));
      const cards = s.page.getByTestId('appointment-card');
      if (summary[group] > 0) {
        await expect(cards.first()).toBeVisible();
        expect(await cards.count()).toBeLessThanOrEqual(10); // paginated
      } else {
        await expect(cards).toHaveCount(0);
      }
    }

    // Open a completed (or any) appointment: details + status timeline.
    const first = s.page.getByTestId('appointment-card').first();
    if (await first.count()) {
      await first.getByRole('link', { name: 'Details' }).click();
      await expect(s.page.getByTestId('appointment-details')).toBeVisible();
      await expect(s.page.getByTestId('appointment-timeline')).toBeVisible();
    }
    await expectNoRuntimeErrors(s, 'patient dashboard');
  } finally {
    await s.context.close();
  }
});

/** First completed visit without a review, scanning the paginated list. */
async function findReviewable(s: Session): Promise<Appt | undefined> {
  for (let page = 1; page <= 20; page++) {
    const items =
      (
        await apiFetch<Appt[]>(
          s.page,
          'GET',
          `/patient/appointments?group=completed&page=${page}&per_page=10`,
        )
      ).body?.data ?? [];
    const hit = items.find((a) => a.can?.review);
    if (hit || items.length < 10) return hit;
  }
  return undefined;
}

test('patient rates a completed visit (when one is reviewable)', async ({ browser }) => {
  // Try the demo patient, then patient2.
  let s = await sessionAs(browser, 'patient', { viewport: DESKTOP });
  let target = await findReviewable(s);
  if (!target) {
    await s.context.close();
    s = await sessionAs(browser, 'patient2', { viewport: DESKTOP });
    target = await findReviewable(s);
  }
  try {
    test.skip(!target, 'Neither patient nor patient2 has a completed visit without a review');

    await s.page.goto(`/dashboard/patient/appointments/${target!.id}`);
    await expect(s.page.getByTestId('appointment-details')).toBeVisible();
    await s.page.locator('[data-action=rate]').click();
    const dialog = s.page.getByRole('dialog');
    await dialog.getByRole('radio').nth(4).click();
    await dialog.locator('textarea').fill('E2E: clear explanation and on time.');
    await dialog.getByRole('button', { name: 'Submit review' }).click();
    await expect(s.page.locator('[data-sonner-toast]').first()).toBeVisible();
    await expect(s.page.locator('[data-action=rate]')).toHaveCount(0);
    const after = await apiFetch<Appt>(s.page, 'GET', `/appointments/${target!.id}`);
    expect(after.body!.data!.can?.review).toBe(false);
    await expectNoRuntimeErrors(s, 'rate visit');
  } finally {
    await s.context.close();
  }
});

for (const [label, viewport] of [
  ['desktop 1366', DESKTOP],
  ['phone 390', PHONE],
] as const) {
  test(`patient pages at ${label}: no horizontal overflow, no runtime errors`, async ({
    browser,
  }) => {
    test.setTimeout(240_000); // 7 page loads against the dev server
    const s = await sessionAs(browser, 'patient', {
      viewport,
      locale: viewport === PHONE ? 'ar' : 'en',
    });
    try {
      await auditPage(s, '/dashboard/patient', 'patient-dashboard');
      for (const group of GROUPS) await auditPage(s, `/dashboard/patient?tab=${group}`);
      const list = await apiFetch<Appt[]>(
        s.page,
        'GET',
        '/patient/appointments?group=completed&per_page=1',
      );
      const one = list.body?.data?.[0];
      if (one)
        await auditPage(s, `/dashboard/patient/appointments/${one.id}`, 'patient-appointment');
      await auditPage(s, '/dashboard/patient/profile');
    } finally {
      await s.context.close();
    }
  });
}
