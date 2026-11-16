/**
 * Patient rates a completed visit (real API, demo data):
 *   npx playwright test tests/e2e/reviews.spec.ts
 *
 * Data: the demo patient's MB-RATE… visits (DemoActivitySeeder::RATING_FIXTURES) are completed and never
 * reviewed by the seeder. A review cannot be deleted through the API, so every run uses up one fixture;
 * `php artisan demo:seed` removes those reviews and makes all fixtures reviewable again.
 */
import { expect, test } from '@playwright/test';
import {
  apiFetch,
  DESKTOP,
  expectNoRuntimeErrors,
  publicGet,
  sessionAs,
  uniqueSuffix,
} from './helpers';

const FIXTURE_PREFIX = 'MB-RATE';

interface Visit {
  id: string;
  reference: string;
  doctor: { id: string };
  review: { rating: number; comment: string | null } | null;
  can: { review: boolean } | null;
}

test('patient rates a completed visit; the review is published on the doctor profile', async ({
  browser,
}) => {
  const s = await sessionAs(browser, 'patient', { viewport: DESKTOP });
  const comment = `E2E review ${uniqueSuffix()}: clear explanation and on time.`;
  try {
    const completed =
      (
        await apiFetch<Visit[]>(
          s.page,
          'GET',
          '/patient/appointments?group=completed&per_page=50',
        )
      ).body?.data ?? [];
    const visit = completed.find((a) => a.reference.startsWith(FIXTURE_PREFIX) && a.can?.review);
    expect(
      visit,
      `no reviewable ${FIXTURE_PREFIX}… visit left — run "php artisan demo:seed" to reset the rating fixtures`,
    ).toBeTruthy();
    const { id, doctor } = visit!;

    await s.page.goto(`/dashboard/patient/appointments/${id}`);
    await expect(s.page.getByTestId('appointment-details')).toBeVisible();
    await s.page.locator('[data-action=rate]').click();

    const dialog = s.page.getByRole('dialog');
    const submit = dialog.getByRole('button', { name: 'Submit review' });
    await expect(submit).toBeDisabled(); // a rating is required
    const fiveStars = dialog.getByRole('radio').nth(4);
    await fiveStars.click();
    await expect(fiveStars).toHaveAttribute('aria-checked', 'true');
    await dialog.locator('#review-comment').fill(comment);
    await submit.click();
    await expect(dialog).toBeHidden();
    await expect(s.page.locator('[data-action=rate]')).toHaveCount(0);

    // Stored once: the visit carries the review and cannot be rated again.
    const after = (await apiFetch<Visit>(s.page, 'GET', `/appointments/${id}`)).body!.data!;
    expect(after.review).toEqual({ rating: 5, comment });
    expect(after.can?.review).toBe(false);
    const again = await apiFetch(s.page, 'POST', `/appointments/${id}/review`, { rating: 1 });
    expect(again.status).toBe(409);
    expect(again.body?.code).toBe('already_reviewed');

    // Published: newest first in the public API and on the doctor's public profile.
    const published = await publicGet<{ rating: number; comment: string | null }[]>(
      s.page,
      `/doctors/${doctor.id}/reviews?per_page=5`,
    );
    expect(published[0]).toMatchObject({ rating: 5, comment });
    await s.page.goto(`/doctor/${doctor.id}`);
    await expect(s.page.getByTestId('reviews-list').getByText(comment)).toBeVisible();
    await expectNoRuntimeErrors(s, 'rate visit');
  } finally {
    await s.context.close();
  }
});
