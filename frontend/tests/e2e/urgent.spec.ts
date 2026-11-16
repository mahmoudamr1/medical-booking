/**
 * Live urgent consultation E2E (spec 002): real API + dispatcher, demo data, no mocks.
 *   npx playwright test tests/e2e/urgent.spec.ts --reporter=line
 *
 * patient2 → directed request to dr.volunteer → doctor accepts via API → messages both ways →
 * doctor completes with an outcome note → patient sees it. The hourly request cap is raised for
 * the run and restored afterwards; every request created here is closed in cleanup.
 */
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  apiFetch,
  expectNoHorizontalOverflow,
  expectNoRuntimeErrors,
  newSession,
  PHONE,
  sessionAs,
  SHOTS_DIR,
  settle,
  type Session,
} from './helpers';

// UI sign-ins and dev-server compiles are slow; the flows themselves poll every 4–5 s.
test.describe.configure({ timeout: 300_000 });

const OPEN = ['created', 'searching', 'notifying', 'accepted', 'in_progress'];
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  PHONE,
];
/** Any emergency-number redirect or wording (EN + AR). Phone numbers like 0101234… are not matched. */
const EMERGENCY_TEXT = /ambulance|emergency|إسعاف|طوارئ|طارئ/i;
const STANDALONE_123 = /(^|[^\d])123([^\d]|$)/;

type Place = { id: string; name_en: string };
interface Volunteer {
  opted_in: boolean;
  available_now: boolean;
  accepts_online: boolean;
  specialties: Place[];
  locations: { governorate: Place; city: Place | null }[];
}
interface Urgent {
  id: string;
  status: string;
  directed_to_me?: boolean;
  outcome_note?: string | null;
}
interface Message {
  id: number;
  body: string;
  sender: 'patient' | 'doctor';
  mine: boolean;
}

// ---- helpers ------------------------------------------------------------------------------

async function cancelOpenPatientRequests(page: Page) {
  const list = await apiFetch<Urgent[]>(page, 'GET', '/patient/urgent-requests');
  for (const r of list.body?.data ?? []) {
    if (OPEN.includes(r.status)) {
      await apiFetch(page, 'POST', `/urgent-requests/${r.id}/cancel`, { reason: 'E2E cleanup' });
    }
  }
}

/** Finishes the volunteer's active consultations so the workload limit never hides them. */
async function finishVolunteerWork(page: Page) {
  const list = await apiFetch<Urgent[]>(page, 'GET', '/doctor/urgent-requests?status=accepted');
  for (const r of list.body?.data ?? []) {
    if (r.status === 'accepted') await apiFetch(page, 'POST', `/urgent-requests/${r.id}/start`);
    await apiFetch(page, 'POST', `/urgent-requests/${r.id}/complete`);
  }
}

/** dr.volunteer is a live volunteer; if the demo state drifted, open a 2 h window (fallback). */
async function ensureVolunteerAvailable(page: Page): Promise<Volunteer> {
  const res = await apiFetch<Volunteer>(page, 'GET', '/doctor/volunteer');
  let v = res.body!.data!;
  expect(v.opted_in, 'dr.volunteer is opted in').toBe(true);
  if (!v.available_now) {
    const open = await apiFetch<Volunteer>(page, 'POST', '/doctor/volunteer/availability', {
      kind: 'now',
      hours: 2,
      mode: 'both',
    });
    expect(open.status, 'volunteer availability').toBe(201);
    v = open.body!.data!;
  }
  return v;
}

/** No emergency number or emergency wording anywhere on the page. */
async function expectNoEmergencyRedirect(page: Page) {
  const text = await page.locator('body').innerText();
  expect(text, 'no emergency wording').not.toMatch(EMERGENCY_TEXT);
  expect(text, 'no standalone 123').not.toMatch(STANDALONE_123);
  await expect(page.locator('a[href^="tel:123"]')).toHaveCount(0);
}

async function shoot(s: Session, name: string) {
  const vp = s.page.viewportSize();
  const suffix = vp && vp.width < 500 ? 'phone' : 'desktop';
  // Full-page shots of a scrolled page repeat the sticky header mid-page.
  await s.page.evaluate(() => window.scrollTo(0, 0));
  await s.page.screenshot({ path: path.join(SHOTS_DIR, `${name}-${suffix}.png`), fullPage: true });
}

// ---- guest ------------------------------------------------------------------------------------

test('guest sees live doctors and is asked to sign in, returning to the request', async ({
  browser,
}) => {
  const s = await newSession(browser);
  await s.page.goto('/urgent');
  await expect(s.page.getByRole('heading', { level: 1 })).toContainText('verified doctor');
  await expect(s.page.getByTestId('available-count')).toBeVisible();
  await expectNoEmergencyRedirect(s.page);

  await s.page.getByTestId('request-first').click();
  const signIn = s.page.getByRole('dialog').getByRole('link', { name: 'Sign in' });
  await expect(signIn).toHaveAttribute(
    'href',
    `/auth/login?next=${encodeURIComponent('/urgent?request=all')}`,
  );
  await expect(s.page.locator('#u-description')).toHaveCount(0);
  await expectNoRuntimeErrors(s);

  // Responsive: no horizontal overflow at the four target widths (Arabic RTL too).
  for (const locale of ['en', 'ar'] as const) {
    const r = await newSession(browser, { locale });
    for (const viewport of VIEWPORTS) {
      await r.page.setViewportSize(viewport);
      await r.page.goto('/urgent');
      await expect(r.page.getByTestId('available-count')).toBeVisible();
      await expectNoHorizontalOverflow(r.page);
    }
    await expectNoEmergencyRedirect(r.page);
    await expectNoRuntimeErrors(r);
    await r.context.close();
  }
  await s.context.close();
});

// ---- directed request → accept → messages → outcome note ------------------------------------

test('directed request reaches the volunteer, messages flow both ways, outcome note is shown', async ({
  browser,
}) => {
  const admin = await sessionAs(browser, 'admin');
  const settings = await apiFetch<{ urgent_requests_per_hour: number }>(
    admin.page,
    'GET',
    '/admin/settings',
  );
  const originalCap = settings.body!.data!.urgent_requests_per_hour;
  const raised = await apiFetch(admin.page, 'PUT', '/admin/settings', {
    urgent_requests_per_hour: 50,
  });
  expect(raised.status, 'raise hourly cap').toBe(200);

  const doctor = await sessionAs(browser, 'volunteer');
  const patient = await sessionAs(browser, 'patient2', { viewport: { width: 1440, height: 900 } });
  let requestId: string | null = null;

  try {
    await finishVolunteerWork(doctor.page);
    const volunteer = await ensureVolunteerAvailable(doctor.page);
    const me = await apiFetch<{ name: string; doctor_profile: { id: string } | null }>(
      doctor.page,
      'GET',
      '/auth/me',
    );
    const doctorId = me.body!.data!.doctor_profile!.id;
    await cancelOpenPatientRequests(patient.page);

    // 1. The live list shows dr.volunteer.
    await patient.page.goto('/urgent');
    const card = patient.page
      .getByTestId('available-doctor')
      .filter({ has: patient.page.locator(`a[href="/doctor/${doctorId}"]`) });
    await expect(card).toBeVisible();
    const doctorName = (await card.locator('h3').innerText()).trim();
    await expectNoEmergencyRedirect(patient.page);
    await settle(patient.page);
    await shoot(patient, 'urgent');

    // 2. Directed request through the dialog.
    await card.getByRole('button', { name: 'Request this doctor' }).click();
    const dialog = patient.page.getByRole('dialog');
    await expect(dialog).toContainText(`Request a consultation with ${doctorName}`);
    await dialog.getByLabel(/^Critical/).check();
    await patient.page
      .locator('#u-description')
      .fill('E2E: high fever since last night and a sore throat.');
    const governorate = volunteer.locations[0].governorate;
    await expect(patient.page.locator(`#u-gov option[value="${governorate.id}"]`)).toBeAttached();
    await patient.page.locator('#u-gov').selectOption(governorate.id);
    await patient.page.locator('#u-phone').fill('01098765432');
    await patient.page.locator('#u-consent').check();
    await dialog.getByRole('button', { name: 'Send request' }).click();
    await patient.page.waitForURL(/\/urgent\/[0-9a-z]{26}$/, { timeout: 30_000 });
    requestId = patient.page.url().split('/').pop()!;
    await expect(patient.page.getByTestId('urgent-timeline')).toContainText(
      `Sent to ${doctorName}`,
    );
    await expect(patient.page.getByTestId('step-directed-detail')).toContainText('Waiting for');

    // 3. It reaches the doctor (directed to them) and they accept via the API.
    const open = await apiFetch<Urgent[]>(
      doctor.page,
      'GET',
      '/doctor/urgent-requests?status=open',
    );
    const mine = (open.body?.data ?? []).find((r) => r.id === requestId);
    expect(mine, 'request reached the volunteer').toBeTruthy();
    expect(mine!.directed_to_me).toBe(true);
    const accepted = await apiFetch<Urgent>(
      doctor.page,
      'POST',
      `/urgent-requests/${requestId}/accept`,
    );
    expect(accepted.status, `accept → ${accepted.body?.code ?? ''}`).toBe(200);
    await expect(patient.page.getByTestId('urgent-status-title')).toHaveText(
      'A doctor accepted your request',
      { timeout: 15_000 },
    );
    await expect(patient.page.getByTestId('accepted-doctor')).toContainText(doctorName);

    // 4. Doctor → patient message (polled every 4 s).
    const fromDoctor = `Hello from the doctor ${Date.now()}`;
    const posted = await apiFetch<Message>(
      doctor.page,
      'POST',
      `/urgent-requests/${requestId}/messages`,
      { body: fromDoctor },
    );
    expect(posted.status, `doctor message → ${posted.body?.code ?? ''}`).toBe(201);
    const incoming = patient.page.getByTestId('message').filter({ hasText: fromDoctor });
    await expect(incoming).toBeVisible({ timeout: 15_000 });
    await expect(incoming).toHaveAttribute('data-mine', 'false');

    // 5. Patient → doctor message from the UI (Enter sends).
    const fromPatient = `Thanks, the fever is 38.5 ${Date.now()}`;
    await patient.page.getByTestId('message-input').fill(fromPatient);
    await patient.page.getByTestId('message-input').press('Enter');
    await expect(
      patient.page.getByTestId('message').filter({ hasText: fromPatient }),
    ).toHaveAttribute('data-mine', 'true');
    await expect
      .poll(
        async () => {
          const list = await apiFetch<Message[]>(
            doctor.page,
            'GET',
            `/urgent-requests/${requestId}/messages`,
          );
          return (list.body?.data ?? []).some(
            (m) => m.body === fromPatient && m.sender === 'patient' && !m.mine,
          );
        },
        { timeout: 15_000 },
      )
      .toBe(true);
    await expectNoEmergencyRedirect(patient.page);
    await expectNoRuntimeErrors(patient, 'status page (accepted)');
    await shoot(patient, 'urgent-id');
    await patient.page.setViewportSize(PHONE);
    await expectNoHorizontalOverflow(patient.page);
    await shoot(patient, 'urgent-id');
    await patient.page.goto('/urgent');
    await expect(patient.page.getByTestId('available-count')).toBeVisible();
    await settle(patient.page);
    await shoot(patient, 'urgent');
    await patient.page.goto(`/urgent/${requestId}`);

    // 6. Doctor completes with an outcome note; the patient sees it.
    const note = `Rest, fluids and paracetamol. Follow up in 2 days. ${Date.now()}`;
    await apiFetch(doctor.page, 'POST', `/urgent-requests/${requestId}/start`);
    const done = await apiFetch<Urgent>(
      doctor.page,
      'POST',
      `/urgent-requests/${requestId}/complete`,
      { outcome_note: note },
    );
    expect(done.status, `complete → ${done.body?.code ?? ''}`).toBe(200);
    await expect(patient.page.getByTestId('outcome-note')).toContainText(note, { timeout: 15_000 });
    await expect(patient.page.getByTestId('urgent-status-title')).toHaveText(
      'Consultation completed',
    );
    await expectNoEmergencyRedirect(patient.page);
    await shoot(patient, 'urgent-id-completed');

    // 7. History shows severity and time-to-accept.
    await patient.page.goto('/urgent/history');
    const item = patient.page.locator(`a[href="/urgent/${requestId}"]`);
    await expect(item).toContainText('Critical');
    await expect(item.getByTestId('time-to-accept')).toBeVisible();
    await expectNoRuntimeErrors(patient, 'history');
  } finally {
    if (requestId) {
      await apiFetch(doctor.page, 'POST', `/urgent-requests/${requestId}/start`);
      await apiFetch(doctor.page, 'POST', `/urgent-requests/${requestId}/complete`);
    }
    await cancelOpenPatientRequests(patient.page);
    await apiFetch(admin.page, 'PUT', '/admin/settings', { urgent_requests_per_hour: originalCap });
    await Promise.all([admin.context.close(), doctor.context.close(), patient.context.close()]);
  }
});
