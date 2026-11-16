/**
 * Visits every page as guest / patient / doctor / admin / clinic owner and fails on runtime errors
 * (uncaught page errors, Next.js error overlay) or HTTP >= 500 responses. Ported from the
 * coordinator's uicheck/crawl.mjs.
 */
import { expect, test } from '@playwright/test';
import type { AccountKey } from './accounts';
import { loginUI, newSession, publicGet, settle } from './helpers';

const OVERLAY = /Runtime (Type)?Error|Unhandled|\d+ Issues?/;

async function pagesFor(
  who: AccountKey | 'guest',
  page: import('@playwright/test').Page,
): Promise<string[]> {
  const doctors = await publicGet<{ id: string }[]>(page, '/doctors?per_page=1');
  const clinics = await publicGet<{ slug: string }[]>(page, '/clinics?per_page=1').catch(() => []);
  const doctor = `/doctor/${doctors[0].id}`;
  const clinic = clinics[0] ? [`/clinics/${clinics[0].slug}`] : [];
  switch (who) {
    case 'guest':
      return [
        '/',
        '/specialties',
        '/search',
        '/search?specialty=cardiology&sort=rating',
        doctor,
        '/clinics',
        ...clinic,
        '/urgent',
        '/about',
        '/support',
        '/privacy',
        '/terms',
        '/auth/login',
        '/auth/register',
        '/doctor/register',
        '/auth/forgot-password',
        '/auth/reset-password?token=x&email=a%40b.c',
      ];
    case 'patient':
      return [
        '/',
        '/dashboard/patient',
        '/dashboard/patient?tab=completed',
        '/dashboard/patient?tab=cancelled',
        '/dashboard/patient/profile',
        '/notifications',
        '/urgent',
        '/urgent/history',
        doctor,
      ];
    case 'doctor':
      return [
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
        '/notifications',
      ];
    case 'admin':
      return [
        '/dashboard/admin',
        '/dashboard/admin/doctors',
        '/dashboard/admin/users',
        '/dashboard/admin/specialties',
        '/dashboard/admin/clinics',
        '/dashboard/admin/appointments',
        '/dashboard/admin/urgent',
        '/dashboard/admin/reviews',
        '/dashboard/admin/audit',
        '/dashboard/admin/settings',
      ];
    case 'owner':
      return ['/dashboard/clinic', '/notifications'];
    default:
      return [];
  }
}

for (const who of ['guest', 'patient', 'doctor', 'admin', 'owner'] as const) {
  for (const locale of ['en', 'ar'] as const) {
    test(`crawl as ${who} (${locale}) without runtime errors`, async ({ browser }) => {
      const s = await newSession(browser, { locale });
      const serverErrors: string[] = [];
      s.page.on('response', (r) => {
        if (r.status() >= 500) serverErrors.push(`HTTP ${r.status()} ${r.url()}`);
      });
      if (who !== 'guest') await loginUI(s.page, who);
      const problems: string[] = [];
      for (const path of await pagesFor(who, s.page)) {
        s.errors.length = 0;
        serverErrors.length = 0;
        const res = await s.page.goto(path);
        await settle(s.page);
        const overlay = await s.page.locator('nextjs-portal').getByText(OVERLAY).count();
        const status = res?.status() ?? 0;
        if (status >= 400 || overlay || s.errors.length || serverErrors.length) {
          problems.push(
            `${path} → ${status}${overlay ? ' [overlay]' : ''} ${[...s.errors, ...serverErrors].join(' | ')}`,
          );
        }
      }
      expect(problems, problems.join('\n')).toEqual([]);
      await s.context.close();
    });
  }
}
