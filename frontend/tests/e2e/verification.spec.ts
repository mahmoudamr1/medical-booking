/**
 * Doctor verification E2E (real API + queue worker):
 *   npx playwright test tests/e2e/verification.spec.ts
 *
 * Self-contained: every run registers its own doctor applicant, so the admin always has a pending request
 * to reject and then approve. The approved throwaway doctor is suspended at the end (hidden from search).
 */
import { expect, test, type Page } from '@playwright/test';
import {
  apiFetch,
  DESKTOP,
  expectNoRuntimeErrors,
  newSession,
  publicGet,
  sessionAs,
  uniqueSuffix,
} from './helpers';

const LICENSE_FILE = 'e2e-license.pdf';
const SYNTHETIC_PDF = '%PDF-1.4\n% Synthetic E2E license document - not a real license\n%%EOF\n';

interface DoctorProfile {
  id: string;
  verification_status: string;
  verification_notes: string | null;
}

async function profile(page: Page): Promise<DoctorProfile> {
  return (await apiFetch<DoctorProfile>(page, 'GET', '/doctor/profile')).body!.data!;
}

/** Registers a doctor account (signed in afterwards) with the details a verification request needs. */
async function registerApplicant(page: Page, email: string): Promise<string> {
  const password = `E2e-${uniqueSuffix()}-Passw0rd!`;
  const registered = await apiFetch(page, 'POST', '/auth/register', {
    name: 'E2E Doctor Applicant',
    email,
    password,
    password_confirmation: password,
    account_type: 'doctor',
    locale: 'en',
    accept_terms: true,
  });
  expect(registered.status, JSON.stringify(registered.body)).toBe(201);

  const license = { license_number: `E2E-${uniqueSuffix()}`, title_en: 'E2E applicant' };
  expect((await apiFetch(page, 'PUT', '/doctor/profile', license)).status).toBe(200);
  const [specialty] = await publicGet<{ id: string }[]>(page, '/specialties');
  const specialties = { specialty_ids: [specialty.id], primary_id: specialty.id };
  expect((await apiFetch(page, 'PUT', '/doctor/specialties', specialties)).status).toBe(200);
  return (await profile(page)).id;
}

/** Sends the request for review from the doctor's verification page. */
async function submitForVerification(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Submit for verification' }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Submit for verification' })
    .click();
  await expect(page.getByRole('alertdialog')).toBeHidden();
  await expect.poll(async () => (await profile(page)).verification_status).toBe('pending');
}

/** Kinds of the notifications the signed-in user has received so far. */
async function notificationKinds(page: Page): Promise<(string | null)[]> {
  const list = await apiFetch<{ kind: string | null }[]>(page, 'GET', '/notifications?per_page=20');
  return (list.body?.data ?? []).map((n) => n.kind);
}

/** Opens the applicant's sheet from the pending queue of the admin doctors page. */
async function openPendingRequest(page: Page, email: string) {
  await page.goto(`/dashboard/admin/doctors?q=${encodeURIComponent(email)}`);
  await page.getByTestId(`doctor-row-${email}`).getByRole('button', { name: 'View' }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByText(email)).toBeVisible();
  return sheet;
}

test('a doctor applies; the admin reads the document, rejects with notes, then approves the resubmission', async ({
  browser,
}) => {
  test.setTimeout(240_000); // two sessions, three decisions and queued notifications
  const email = `e2e.applicant.${uniqueSuffix()}@example.test`;
  const notes = `E2E ${uniqueSuffix()}: the license scan is unreadable, please upload it again.`;
  const applicant = await newSession(browser, { viewport: DESKTOP });
  const admin = await sessionAs(browser, 'admin', { viewport: DESKTOP });
  let doctorId: string | null = null;
  try {
    // 1. The doctor uploads a license document and submits the request.
    doctorId = await registerApplicant(applicant.page, email);
    await applicant.page.goto('/dashboard/doctor/verification');
    await applicant.page.locator('#doc-file').setInputFiles({
      name: LICENSE_FILE,
      mimeType: 'application/pdf',
      buffer: Buffer.from(SYNTHETIC_PDF),
    });
    await applicant.page.getByRole('button', { name: 'Upload document' }).click();
    await expect(applicant.page.getByText(LICENSE_FILE)).toBeVisible();
    await submitForVerification(applicant.page);

    // 2. The admin opens the request and reads the uploaded document.
    let sheet = await openPendingRequest(admin.page, email);
    await expect(sheet.getByRole('heading', { name: 'Documents' })).toBeVisible();
    await expect(sheet.getByText(LICENSE_FILE)).toBeVisible();
    const href = await sheet.getByRole('link', { name: 'Download' }).getAttribute('href');
    expect(href).toMatch(new RegExp(`/admin/doctors/${doctorId}/documents/[0-9a-z]{26}/download$`));
    const download = await admin.page.request.get(href!);
    expect(download.status()).toBe(200);
    expect(download.headers()['content-type']).toContain('application/pdf');
    expect(await download.text()).toBe(SYNTHETIC_PDF);

    // 3. Rejecting requires notes; the doctor is notified and sees them.
    await sheet.getByRole('button', { name: 'Reject' }).click();
    let confirm = admin.page.getByRole('alertdialog');
    await expect(confirm).toContainText('Reject this verification request?');
    await expect(confirm.getByRole('button', { name: 'Reject' })).toBeDisabled();
    await confirm.locator('#confirm-reason').fill(notes);
    await confirm.getByRole('button', { name: 'Reject' }).click();
    await expect(confirm).toBeHidden();
    await expect(sheet.getByText('Rejected').first()).toBeVisible();
    await expect(sheet.getByText(notes)).toBeVisible();

    await expect
      .poll(() => notificationKinds(applicant.page), { timeout: 60_000 })
      .toContain('doctor.verification.rejected');
    await applicant.page.goto('/dashboard/doctor/verification');
    await expect(applicant.page.getByText(notes)).toBeVisible();

    // 4. The doctor resubmits and the admin approves: the profile becomes public.
    await submitForVerification(applicant.page);
    sheet = await openPendingRequest(admin.page, email);
    await sheet.getByRole('button', { name: 'Approve' }).click();
    confirm = admin.page.getByRole('alertdialog');
    await expect(confirm).toContainText('Approve this doctor?');
    await confirm.getByRole('button', { name: 'Approve' }).click();
    await expect(confirm).toBeHidden();
    await expect(sheet.getByText('Verified').first()).toBeVisible();

    expect((await profile(applicant.page)).verification_status).toBe('approved');
    await expect
      .poll(() => notificationKinds(applicant.page), { timeout: 60_000 })
      .toContain('doctor.verification.approved');
    expect((await publicGet<{ id: string }>(admin.page, `/doctors/${doctorId}`)).id).toBe(doctorId);
    await expectNoRuntimeErrors(applicant, 'doctor verification page');
    await expectNoRuntimeErrors(admin, 'admin doctor verification');
  } finally {
    if (doctorId)
      await apiFetch(admin.page, 'POST', `/admin/doctors/${doctorId}/suspend`, {
        notes: 'E2E cleanup: throwaway applicant',
      });
    await applicant.context.close();
    await admin.context.close();
  }
});
