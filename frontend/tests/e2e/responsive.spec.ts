/**
 * Responsive layout checks: no horizontal overflow and no page errors at common widths, in both
 * directions. Screenshots of key pages are written to E2E_SHOTS_DIR (default test-results/shots).
 */
import path from 'node:path';
import { test } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  expectNoRuntimeErrors,
  newSession,
  publicGet,
  PHONE,
  settle,
  SHOTS_DIR,
  DESKTOP,
} from './helpers';

const WIDTHS = [1440, 1366, 1024, 768, 390] as const;

for (const width of WIDTHS) {
  for (const locale of ['ar', 'en'] as const) {
    test(`no horizontal overflow at ${width}px (${locale})`, async ({ browser }) => {
      const s = await newSession(browser, {
        locale,
        viewport: { width, height: width >= 1024 ? 900 : 844 },
      });
      const doctors = await publicGet<{ id: string }[]>(s.page, '/doctors?per_page=1');
      const paths = [
        '/',
        '/search',
        `/doctor/${doctors[0].id}`,
        '/clinics',
        '/auth/login',
        '/specialties',
        '/about',
      ];
      for (const p of paths) {
        await s.page.goto(p);
        await settle(s.page);
        await expectNoHorizontalOverflow(s.page);
        await expectNoRuntimeErrors(s, `${p} @${width}`);
      }
      await s.context.close();
    });
  }
}

test('screenshots of key pages (desktop 1366 and phone 390)', async ({ browser }) => {
  for (const [name, viewport] of [
    ['desktop', DESKTOP],
    ['phone', PHONE],
  ] as const) {
    for (const locale of ['ar', 'en'] as const) {
      const s = await newSession(browser, { locale, viewport });
      const doctors = await publicGet<{ id: string }[]>(s.page, '/doctors?per_page=1');
      for (const [slug, p] of [
        ['home', '/'],
        ['search', '/search'],
        ['doctor', `/doctor/${doctors[0].id}`],
      ] as const) {
        await s.page.goto(p);
        await settle(s.page);
        await s.page.waitForTimeout(500);
        await s.page.screenshot({
          path: path.join(SHOTS_DIR, `${slug}-${name}-${locale}.png`),
          fullPage: true,
        });
      }
      await expectNoRuntimeErrors(s);
      await s.context.close();
    }
  }
});
