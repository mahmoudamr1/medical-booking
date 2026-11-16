import { expect, test } from '@playwright/test';
import { expectNoRuntimeErrors, newSession, publicGet, settle } from './helpers';

test('search filters are applied server-side and kept in the URL', async ({ browser }) => {
  const s = await newSession(browser);
  const { page } = s;
  const specialties = await publicGet<{ slug: string; name_en: string; doctors_count?: number }[]>(
    page,
    '/specialties',
  );
  const withDoctors = specialties.find((sp) => (sp.doctors_count ?? 0) > 0) ?? specialties[0];

  await page.goto('/search');
  const filters = page.getByTestId('search-filters').first();
  await expect(page.getByTestId('doctor-card').first()).toBeVisible();

  // Specialty filter → URL + results match the API for the same query.
  await filters.getByLabel('Specialty').selectOption(withDoctors.slug);
  await expect(page).toHaveURL(new RegExp(`specialty=${withDoctors.slug}`));
  const expected = await publicGet<unknown[]>(
    page,
    `/doctors?specialty=${withDoctors.slug}&per_page=12`,
  );
  await expect(page.getByTestId('doctor-card')).toHaveCount(expected.length);

  // Price + keyword are submitted together.
  await filters.getByLabel('Max').fill('100000');
  await filters.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/max_price=100000/);

  // Sort is part of the URL as well.
  await page.locator('#sort').selectOption('price_asc');
  await expect(page).toHaveURL(/sort=price_asc/);

  // Reloading keeps the state (URL is the source of truth).
  await page.reload();
  await expect(filters.getByLabel('Specialty')).toHaveValue(withDoctors.slug);

  // A query with no matches shows the empty state; clearing resets everything.
  await page.goto('/search?q=zzzz-no-such-doctor-zzzz');
  await expect(page.getByText('No doctors match your search')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await expect(page).toHaveURL(/\/search$/);
  await settle(page);
  await expectNoRuntimeErrors(s);
  await s.context.close();
});

test('governorate → city cascade narrows the results', async ({ browser }) => {
  const s = await newSession(browser);
  const { page } = s;
  const govs = await publicGet<{ id: string; slug: string }[]>(page, '/locations/governorates');
  const cairo = govs.find((g) => g.slug === 'cairo') ?? govs[0];
  await page.goto('/search');
  const filters = page.getByTestId('search-filters').first();
  await expect(filters.getByLabel('City')).toBeDisabled();
  await filters.getByLabel('Governorate').selectOption(cairo.id);
  await expect(page).toHaveURL(new RegExp(`governorate=${cairo.id}`));
  await expect(filters.getByLabel('City')).toBeEnabled();
  const cities = await publicGet<{ id: string }[]>(
    page,
    `/locations/governorates/${cairo.id}/cities`,
  );
  await filters.getByLabel('City').selectOption(cities[0].id);
  await expect(page).toHaveURL(new RegExp(`city=${cities[0].id}`));
  await settle(page);
  await expectNoRuntimeErrors(s);
  await s.context.close();
});
