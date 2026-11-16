import { expect, test, type Page } from '@playwright/test';
import { apiFetch, expectNoRuntimeErrors, sessionAs } from './helpers';

const OPEN = ['created', 'searching', 'notifying', 'accepted', 'in_progress'];

interface Volunteer {
  opted_in: boolean;
  available_now: boolean;
  locations: { governorate: { id: string } }[];
  specialties: { id: string }[];
}

async function closeOpenRequests(patient: Page) {
  const mine = await apiFetch<{ id: string; status: string }[]>(
    patient,
    'GET',
    '/patient/urgent-requests',
  );
  for (const r of mine.body?.data ?? []) {
    if (OPEN.includes(r.status))
      await apiFetch(patient, 'POST', `/urgent-requests/${r.id}/cancel`, { reason: 'E2E cleanup' });
  }
}

/** Finish anything the volunteer still holds so max-concurrent limits never block the next run. */
async function finishVolunteerRequests(doctor: Page) {
  const accepted = await apiFetch<{ id: string; status: string }[]>(
    doctor,
    'GET',
    '/doctor/urgent-requests?status=accepted',
  );
  for (const r of accepted.body?.data ?? []) {
    if (r.status === 'accepted') await apiFetch(doctor, 'POST', `/urgent-requests/${r.id}/start`);
    await apiFetch(doctor, 'POST', `/urgent-requests/${r.id}/complete`);
  }
}

test('volunteer doctor accepts an urgent request from the dashboard and the patient sees it accepted', async ({
  browser,
}) => {
  const doctor = await sessionAs(browser, 'volunteer');
  const patient = await sessionAs(browser, 'patient2');
  let requestId: string | null = null;
  try {
    await finishVolunteerRequests(doctor.page);
    await closeOpenRequests(patient.page);

    const v = (await apiFetch<Volunteer>(doctor.page, 'GET', '/doctor/volunteer')).body!.data!;
    expect(v.opted_in, 'demo volunteer is opted in').toBeTruthy();
    if (!v.available_now) {
      const r = await apiFetch(doctor.page, 'POST', '/doctor/volunteer/availability', {
        kind: 'now',
        hours: 2,
        mode: 'both',
      });
      expect(r.status).toBe(201);
    }

    const created = await apiFetch<{ id: string; status: string }>(
      patient.page,
      'POST',
      '/urgent-requests',
      {
        life_threatening: false,
        disclaimer_acknowledged: true,
        consent: true,
        description: 'E2E: high fever since last night, need advice',
        consultation_type: 'online',
        governorate_id: v.locations[0].governorate.id,
        contact_phone: '01012345678',
      },
    );
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    requestId = created.body!.data!.id;

    // The request reaches the volunteer's "New" tab (dispatch may take a moment).
    await doctor.page.goto('/dashboard/doctor/urgent?tab=open');
    const card = doctor.page
      .getByTestId('urgent-request-card')
      .filter({ hasText: 'E2E: high fever' });
    await expect(card).toBeVisible({ timeout: 60_000 });

    // Detail is redacted before accepting.
    await card.getByRole('button', { name: 'View' }).click();
    const detail = doctor.page.getByRole('dialog');
    await expect(
      detail.getByText('Patient and location details appear after you accept.'),
    ).toBeVisible();
    await detail.getByRole('button', { name: 'Accept request' }).click();
    await doctor.page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Accept request' })
      .click();
    await expect(detail.getByText('01012345678')).toBeVisible();

    const seen = await apiFetch<{
      status: string;
      accepted_doctor: { name: string | null } | null;
    }>(patient.page, 'GET', `/urgent-requests/${requestId}`);
    expect(seen.body!.data!.status).toBe('accepted');
    expect(seen.body!.data!.accepted_doctor?.name).toBeTruthy();

    // Patient status page shows the accepted doctor.
    await patient.page.goto(`/urgent/${requestId}`);
    await expect(
      patient.page.getByText(seen.body!.data!.accepted_doctor!.name!).first(),
    ).toBeVisible();
    await expectNoRuntimeErrors(doctor);
  } finally {
    await finishVolunteerRequests(doctor.page);
    await closeOpenRequests(patient.page);
    await doctor.context.close();
    await patient.context.close();
  }
});
