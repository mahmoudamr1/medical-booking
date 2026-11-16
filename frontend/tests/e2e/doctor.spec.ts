/**
 * Doctor dashboard E2E (real API, demo data):
 *   npx playwright test tests/e2e/doctor.spec.ts
 * Re-runnable: created appointments are cancelled, urgent requests are completed/cancelled and the
 * schedule and platform settings are restored.
 */
import { expect, test, type Page } from '@playwright/test';
import {
  apiFetch,
  expectNoRuntimeErrors,
  sessionAs,
  settle,
  uniqueSuffix,
  type Session,
  auditPage,
  DESKTOP,
  PHONE,
} from './helpers';

const OPEN_URGENT = ['created', 'searching', 'notifying', 'accepted', 'in_progress'];
type Place = { id: string; name_en: string };

interface ScheduleRow {
  clinic_branch_id: string | null;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  breaks: { starts_at: string; ends_at: string }[];
}

const DOCTOR_PAGES = [
  '/dashboard/doctor',
  '/dashboard/doctor/calendar',
  '/dashboard/doctor/schedule',
  '/dashboard/doctor/exceptions',
  '/dashboard/doctor/services',
  '/dashboard/doctor/preferences',
  '/dashboard/doctor/profile',
  '/dashboard/doctor/verification',
  '/dashboard/doctor/volunteer',
  '/dashboard/doctor/urgent',
];
const SHOT_NAMES: Record<string, string> = {
  '/dashboard/doctor': 'doctor-overview',
  '/dashboard/doctor/calendar': 'doctor-calendar',
};

test.describe.configure({ mode: 'serial' });

test('dr.karim: overview, calendar views and schedule render with real data', async ({
  browser,
}) => {
  const s = await sessionAs(browser, 'doctor', { viewport: DESKTOP });
  try {
    await auditPage(s, '/dashboard/doctor');
    await expect(s.page.getByTestId('doctor-stats')).toBeVisible();
    await expect(s.page.getByTestId('today-timeline')).toBeVisible();
    await expect(s.page.getByTestId('pending-panel')).toBeVisible();
    await expect(s.page.getByTestId('next-slot')).toBeVisible();

    await auditPage(s, '/dashboard/doctor/calendar');
    await expect(s.page.getByTestId('time-grid')).toBeVisible();
    await expect(s.page.getByTestId('calendar-legend')).toBeVisible();
    for (const [view, testId] of [
      ['Day', 'calendar-day'],
      ['Month', 'calendar-month'],
      ['Week', 'calendar-week'],
    ] as const) {
      await s.page.getByRole('tab', { name: view }).click();
      await expect(s.page.getByRole('tab', { name: view })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(s.page.getByTestId(testId)).toBeVisible();
    }
    // Month view: open an appointment (if any) in the detail sheet.
    await s.page.getByRole('tab', { name: 'Month' }).click();
    const chip = s.page.getByTestId('calendar-appointment').first();
    if (await chip.count()) {
      await chip.click();
      await expect(s.page.getByRole('dialog').getByTestId('appointment-details')).toBeVisible();
      await s.page.keyboard.press('Escape');
    }

    await auditPage(s, '/dashboard/doctor/schedule');
    await expect(s.page.getByRole('heading', { name: 'Weekly schedule' })).toBeVisible();
    await expect(s.page.getByTestId('sticky-save-bar')).toBeVisible();
    await expectNoRuntimeErrors(s, 'doctor pages');
  } finally {
    await s.context.close();
  }
});

test('dr.karim edits the weekly schedule; the change persists and is restored', async ({
  browser,
}) => {
  const s = await sessionAs(browser, 'doctor', { viewport: DESKTOP });
  const original = (await apiFetch<ScheduleRow[]>(s.page, 'GET', '/doctor/schedules')).body!.data!;
  const strip = (rows: ScheduleRow[]) =>
    rows.map(({ clinic_branch_id, day_of_week, starts_at, ends_at, breaks }) => ({
      clinic_branch_id,
      day_of_week,
      starts_at,
      ends_at,
      breaks,
    }));
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  try {
    const freeDay = [5, 6, 0, 1, 2, 3, 4].find((d) => !original.some((w) => w.day_of_week === d));
    test.skip(freeDay === undefined, 'dr.karim works every day; no free day to add a window');
    await s.page.goto('/dashboard/doctor/schedule');
    const section = s.page
      .locator('section')
      .filter({ has: s.page.getByRole('heading', { name: DAY_NAMES[freeDay!], exact: true }) });
    await section.getByRole('button', { name: 'Add window' }).click();
    await section.locator('select').first().selectOption('');
    await section.locator('input[type=time]').nth(0).fill('10:00');
    await section.locator('input[type=time]').nth(1).fill('12:00');
    await expect(s.page.getByText('You have unsaved changes')).toBeVisible();
    await s.page.getByRole('button', { name: 'Save schedule' }).click();
    await expect(s.page.getByText('All changes saved')).toBeVisible();
    const after = (await apiFetch<ScheduleRow[]>(s.page, 'GET', '/doctor/schedules')).body!.data!;
    expect(
      after.some(
        (w) =>
          w.day_of_week === freeDay &&
          w.starts_at === '10:00' &&
          w.ends_at === '12:00' &&
          w.clinic_branch_id === null,
      ),
    ).toBeTruthy();
  } finally {
    expect(
      (await apiFetch(s.page, 'PUT', '/doctor/schedules', { schedules: strip(original) })).status,
    ).toBe(200);
    await s.context.close();
  }
});

// ---- manual confirmation -------------------------------------------------------------------

test('manual-confirmation doctor confirms a pending request booked by patient2', async ({
  browser,
}) => {
  const doctor = await sessionAs(browser, 'manualDoctor', { viewport: DESKTOP });
  const patient = await sessionAs(browser, 'patient2', { viewport: DESKTOP });
  let appointmentId: string | null = null;
  try {
    const me = (
      await apiFetch<{ id: string; preferences: { booking_mode: string } }>(
        doctor.page,
        'GET',
        '/doctor/profile',
      )
    ).body!.data!;
    expect(me.preferences.booking_mode, 'dr.omar uses manual confirmation').toBe('manual');
    const services = (
      await apiFetch<{ id: string; is_active: boolean }[]>(doctor.page, 'GET', '/doctor/services')
    ).body!.data!;
    const service = services.find((x) => x.is_active)!;
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + 13 * 86400_000).toISOString().slice(0, 10);
    const availability = (
      await apiFetch<{ days: { slots: { starts_at: string }[] }[] }>(
        patient.page,
        'GET',
        `/doctors/${me.id}/availability?service_id=${service.id}&date_from=${from}&date_to=${to}`,
      )
    ).body!.data!;
    const slot = availability.days.flatMap((d) => d.slots)[0];
    expect(slot, 'dr.omar has a free slot in the next two weeks').toBeTruthy();

    const booked = await apiFetch<{ id: string; reference: string; status: string }>(
      patient.page,
      'POST',
      '/appointments',
      {
        doctor_id: me.id,
        service_id: service.id,
        starts_at: slot.starts_at,
        notes: `E2E manual confirm ${uniqueSuffix()}`,
      },
    );
    expect(booked.status, JSON.stringify(booked.body)).toBe(201);
    appointmentId = booked.body!.data!.id;
    const reference = booked.body!.data!.reference;
    expect(booked.body!.data!.status).toBe('pending_confirmation');

    // Quick confirm from the overview pending panel when it is on the first page, otherwise from the calendar sheet.
    await doctor.page.goto('/dashboard/doctor');
    const item = doctor.page.locator(`[data-testid=pending-item][data-reference="${reference}"]`);
    await expect(doctor.page.getByTestId('pending-panel')).toBeVisible();
    await settle(doctor.page);
    if (await item.count()) {
      await item.locator('[data-action=confirm]').click();
    } else {
      const key = new Date(slot.starts_at).toLocaleDateString('en-CA', {
        timeZone: 'Africa/Cairo',
      });
      await doctor.page.goto(`/dashboard/doctor/calendar?view=day&date=${key}`);
      await doctor.page
        .locator(`[data-testid=calendar-appointment][title*="${reference}"]`)
        .click();
      const sheet = doctor.page.getByRole('dialog');
      await sheet.locator('[data-action=confirm]').click();
      await doctor.page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click();
    }
    await expect(doctor.page.locator('[data-sonner-toast]').first()).toBeVisible();
    await expect
      .poll(
        async () =>
          (
            await apiFetch<{ status: string }>(
              patient.page,
              'GET',
              `/appointments/${appointmentId}`,
            )
          ).body?.data?.status,
      )
      .toBe('confirmed');
    await expectNoRuntimeErrors(doctor, 'manual confirm');
  } finally {
    if (appointmentId)
      await apiFetch(doctor.page, 'POST', `/appointments/${appointmentId}/cancel`, {
        reason: 'E2E cleanup',
      });
    await doctor.context.close();
    await patient.context.close();
  }
});

// ---- volunteer -----------------------------------------------------------------------------

async function finishVolunteerWork(page: Page) {
  const list = await apiFetch<{ id: string; status: string }[]>(
    page,
    'GET',
    '/doctor/urgent-requests?status=accepted',
  );
  for (const r of list.body?.data ?? []) {
    if (r.status === 'accepted') await apiFetch(page, 'POST', `/urgent-requests/${r.id}/start`);
    await apiFetch(page, 'POST', `/urgent-requests/${r.id}/complete`);
  }
}

async function cancelPatientUrgent(page: Page) {
  const list = await apiFetch<{ id: string; status: string }[]>(
    page,
    'GET',
    '/patient/urgent-requests',
  );
  for (const r of list.body?.data ?? []) {
    if (OPEN_URGENT.includes(r.status))
      await apiFetch(page, 'POST', `/urgent-requests/${r.id}/cancel`, { reason: 'E2E cleanup' });
  }
}

/** Opt-in covering Cairo + general practice (restores drifted demo state), via the API. */
async function ensureVolunteerCoversCairoGp(page: Page): Promise<{ cairo: Place; gp: Place }> {
  const cairo = (await apiFetch<Place[]>(page, 'GET', '/locations/governorates')).body!.data!.find(
    (g) => g.name_en === 'Cairo',
  )!;
  const gp = (
    await apiFetch<(Place & { is_general_practice: boolean })[]>(page, 'GET', '/specialties')
  ).body!.data!.find((x) => x.is_general_practice)!;
  const v = (
    await apiFetch<{
      opted_in: boolean;
      accepts_online: boolean;
      specialties: Place[];
      locations: { governorate: Place; city: Place | null }[];
    }>(page, 'GET', '/doctor/volunteer')
  ).body!.data!;
  const covers =
    v.opted_in &&
    v.accepts_online &&
    v.specialties.some((x) => x.id === gp.id) &&
    v.locations.some((l) => l.governorate.id === cairo.id && !l.city);
  if (!covers) {
    const res = await apiFetch(page, 'PUT', '/doctor/volunteer', {
      opt_in: true,
      specialty_ids: Array.from(new Set([gp.id, ...v.specialties.map((x) => x.id)])).slice(0, 5),
      locations: [
        { governorate_id: cairo.id },
        ...v.locations
          .filter((l) => l.governorate.id !== cairo.id)
          .map((l) => ({ governorate_id: l.governorate.id, city_id: l.city?.id ?? null })),
      ],
      accepts_online: true,
      accepts_in_person: true,
      max_concurrent_requests: 2,
    });
    expect(res.status, 'volunteer opt-in').toBe(200);
  }
  return { cairo, gp };
}

test('volunteer page shows the doctor opted in and available', async ({ browser }) => {
  const s = await sessionAs(browser, 'volunteer', { viewport: DESKTOP });
  try {
    await ensureVolunteerCoversCairoGp(s.page);
    await auditPage(s, '/dashboard/doctor/volunteer');
    await expect(s.page.getByTestId('volunteer-optin')).toHaveAttribute('data-opted-in', 'true');
    const status = s.page.getByTestId('volunteer-availability');
    if ((await status.getAttribute('data-available')) !== 'true') {
      // Not available right now: use the page's own "Available now" action.
      await s.page.getByTestId('go-available-now').click();
    }
    await expect(status).toHaveAttribute('data-available', 'true');
    await expect(s.page.getByTestId('volunteer-windows')).toBeVisible();
    await expect(s.page.getByTestId('window-countdown').first()).toContainText(/Ends in/);
    await expectNoRuntimeErrors(s, 'volunteer');
  } finally {
    await s.context.close();
  }
});

// ---- full urgent flow ----------------------------------------------------------------------

/** Raises the per-patient hourly limit if needed; returns a restore function. */
async function withUrgentQuota(admin: Session): Promise<() => Promise<void>> {
  const settings = (await apiFetch<Record<string, unknown>>(admin.page, 'GET', '/admin/settings'))
    .body!.data!;
  const original = Number(settings.urgent_requests_per_hour);
  const res = await apiFetch(admin.page, 'PUT', '/admin/settings', {
    urgent_requests_per_hour: 50,
  });
  expect(res.status, 'raise urgent_requests_per_hour').toBe(200);
  return async () => {
    await apiFetch(admin.page, 'PUT', '/admin/settings', { urgent_requests_per_hour: original });
  };
}

test('urgent flow: patient2 requests online GP help in Cairo; the volunteer accepts, starts and completes it in the UI', async ({
  browser,
}) => {
  const doctor = await sessionAs(browser, 'volunteer', { viewport: DESKTOP });
  const patient = await sessionAs(browser, 'patient2', { viewport: DESKTOP });
  let admin: Session | null = null;
  let restore: (() => Promise<void>) | null = null;
  let requestId: string | null = null;
  const description = `E2E urgent ${uniqueSuffix()}: fever and sore throat since last night`;
  try {
    await finishVolunteerWork(doctor.page);
    await cancelPatientUrgent(patient.page);
    const { cairo, gp } = await ensureVolunteerCoversCairoGp(doctor.page);
    const v = (await apiFetch<{ available_now: boolean }>(doctor.page, 'GET', '/doctor/volunteer'))
      .body!.data!;
    if (!v.available_now)
      expect(
        (
          await apiFetch(doctor.page, 'POST', '/doctor/volunteer/availability', {
            kind: 'now',
            hours: 2,
            mode: 'both',
          })
        ).status,
      ).toBe(201);

    // v2 contract (severity; no life_threatening/disclaimer). Falls back to the v1 fields while the
    // backend migrates.
    const payload = {
      severity: 'critical',
      consent: true,
      specialty_id: gp.id,
      description,
      consultation_type: 'online',
      governorate_id: cairo.id,
      contact_phone: '01012345678',
    };
    type Created = { id: string; severity?: string };
    const create = async () => {
      const res = await apiFetch<Created>(patient.page, 'POST', '/urgent-requests', payload);
      if (res.status !== 422 || !res.body?.errors?.life_threatening) return res;
      return apiFetch<Created>(patient.page, 'POST', '/urgent-requests', {
        ...payload,
        life_threatening: false,
        disclaimer_acknowledged: true,
      });
    };
    let created = await create();
    if (created.status === 429 && created.body?.code === 'rate_limited') {
      admin = await sessionAs(browser, 'admin', { viewport: DESKTOP });
      restore = await withUrgentQuota(admin);
      created = await create();
    }
    test.skip(
      created.status === 429,
      `IP throttle reached (${created.body?.message ?? ''}); rerun later`,
    );
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    requestId = created.body!.data!.id;

    // The volunteer sees it in "New" (polled every 10 s; dispatch may take a moment).
    await doctor.page.goto('/dashboard/doctor/urgent?tab=open');
    const card = doctor.page.locator(`[data-testid=urgent-request-card][data-id="${requestId}"]`);
    await expect(card).toBeVisible({ timeout: 60_000 });
    await expect(card).toContainText('Patient details appear after you accept');
    await expect(card.getByTestId('urgent-waiting')).toBeVisible();
    const v2Live = !!created.body?.data?.severity;
    if (v2Live) {
      await expect(card).toHaveAttribute('data-severity', 'critical');
      await expect(doctor.page.getByTestId('critical-alert')).toBeVisible();
      await expect.poll(() => doctor.page.title()).toMatch(/^\(! \d+\)/);
    }

    await card.getByRole('button', { name: 'View' }).click();
    const sheet = doctor.page.getByRole('dialog');
    await expect(sheet.getByTestId('urgent-detail')).toBeVisible();
    await expect(
      sheet.getByText('Patient and location details appear after you accept.'),
    ).toBeVisible();
    await sheet.locator('[data-action=accept]').click();
    await doctor.page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Accept request' })
      .click();
    await expect(sheet.getByTestId('urgent-patient-contact')).toContainText('01012345678');

    await sheet.locator('[data-action=start]').click();
    await doctor.page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Start consultation' })
      .click();
    await expect(sheet.locator('[data-action=start]')).toHaveCount(0);

    // Messages both ways, once the v2 messages endpoint is live.
    const messagesUrl = `/urgent-requests/${requestId}/messages`;
    if ((await apiFetch(doctor.page, 'GET', messagesUrl)).status === 200) {
      const thread = sheet.getByTestId('urgent-thread');
      await thread
        .getByTestId('urgent-message-input')
        .fill('Hello, I am the doctor on call. How high is the fever?');
      await thread.getByTestId('urgent-message-send').click();
      await expect(
        thread.locator('[data-testid=urgent-message][data-mine=true]').last(),
      ).toContainText('doctor on call');
      const reply = await apiFetch(patient.page, 'POST', messagesUrl, {
        body: 'About 38.5, since last night.',
      });
      expect(reply.status).toBe(201);
      await expect(
        thread.locator('[data-testid=urgent-message][data-mine=false]').last(),
      ).toContainText('38.5', { timeout: 15_000 });
    } else {
      test.info().annotations.push({
        type: 'note',
        description: 'messages endpoint not live; thread skipped',
      });
    }

    const note = 'E2E outcome: rest, fluids and paracetamol; see a GP if the fever lasts 3 days.';
    await sheet.locator('[data-action=complete]').click();
    const completeDialog = doctor.page.getByRole('alertdialog');
    await completeDialog.locator('textarea').fill(note);
    await completeDialog.getByRole('button', { name: 'Complete' }).click();
    await expect(sheet.locator('[data-action=complete]')).toHaveCount(0);

    const final = await apiFetch<{ status: string; outcome_note?: string | null }>(
      patient.page,
      'GET',
      `/urgent-requests/${requestId}`,
    );
    expect(final.body!.data!.status).toBe('completed');
    if (v2Live) expect(final.body!.data!.outcome_note).toBe(note);

    // Closed tab lists it.
    await doctor.page.keyboard.press('Escape');
    await doctor.page.getByRole('tab', { name: /Closed/ }).click();
    await expect(
      doctor.page.locator(`[data-testid=urgent-request-card][data-id="${requestId}"]`),
    ).toBeVisible();
    await expectNoRuntimeErrors(doctor, 'urgent flow');
  } finally {
    await finishVolunteerWork(doctor.page);
    await cancelPatientUrgent(patient.page);
    if (restore) await restore();
    await admin?.context.close();
    await doctor.context.close();
    await patient.context.close();
  }
});

// ---- responsive audit + screenshots ---------------------------------------------------------

for (const [label, viewport] of [
  ['desktop 1366', DESKTOP],
  ['phone 390', PHONE],
] as const) {
  test(`doctor pages at ${label}: no horizontal overflow, no runtime errors`, async ({
    browser,
  }) => {
    test.setTimeout(300_000); // 15 page loads against the dev server
    const karim = await sessionAs(browser, 'doctor', { viewport });
    const volunteer = await sessionAs(browser, 'volunteer', {
      viewport,
      locale: viewport === PHONE ? 'ar' : 'en',
    });
    try {
      for (const url of DOCTOR_PAGES) await auditPage(karim, url, SHOT_NAMES[url]);
      for (const view of ['day', 'month'])
        await auditPage(karim, `/dashboard/doctor/calendar?view=${view}`);
      await auditPage(volunteer, '/dashboard/doctor/volunteer', 'doctor-volunteer');
      await auditPage(volunteer, '/dashboard/doctor/urgent', 'doctor-urgent');
      await auditPage(volunteer, '/dashboard/doctor/urgent?tab=closed');
    } finally {
      await karim.context.close();
      await volunteer.context.close();
    }
  });
}
