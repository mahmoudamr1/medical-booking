/**
 * Shared E2E helpers. Credentials always come from ./accounts (never hard-coded).
 * API calls are made from inside the page (same origin, Sanctum cookie + XSRF header), so they act
 * as the signed-in user exactly like the app does.
 */
import path from 'node:path';
import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { accounts, type AccountKey } from './accounts';

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
export type Locale = 'ar' | 'en';

export const DESKTOP = { width: 1366, height: 900 };
export const PHONE = { width: 390, height: 844 };
/** Screenshot folder (override with E2E_SHOTS_DIR). */
export const SHOTS_DIR = process.env.E2E_SHOTS_DIR ?? path.join('test-results', 'shots');

export interface Session {
  context: BrowserContext;
  page: Page;
  /** Uncaught page errors collected during the session. */
  errors: string[];
}

/** New isolated browser session with a fixed UI locale and page-error collection. */
export async function newSession(
  browser: Browser,
  opts: { locale?: Locale; viewport?: { width: number; height: number } } = {},
): Promise<Session> {
  const locale = opts.locale ?? 'en';
  const context = await browser.newContext({
    locale: locale === 'ar' ? 'ar-EG' : 'en-US',
    viewport: opts.viewport,
  });
  await context.addCookies([{ name: 'locale', value: locale, url: BASE_URL }]);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { context, page, errors };
}

/** Signs in through the real login form and waits until the app navigated away from /auth/login. */
export async function loginUI(page: Page, who: AccountKey, next?: string): Promise<void> {
  const { email, password } = accounts[who];
  await page.goto(next ? `/auth/login?next=${encodeURIComponent(next)}` : '/auth/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  // Sign-in is rate limited (throttle:login); when the suite hits it, wait as instructed and retry.
  for (let attempt = 0; ; attempt++) {
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST',
      ),
      page.locator('form button[type=submit]').click(),
    ]);
    if (response.status() !== 429 || attempt >= 4) break;
    const wait = Number(response.headers()['retry-after'] ?? 20);
    await page.waitForTimeout(Math.min(65, Math.max(1, wait)) * 1000);
  }
  await page.waitForURL((u) => !u.pathname.startsWith('/auth/login'), { timeout: 30_000 });
}

/** Opens a signed-in session (UI login). */
export async function sessionAs(
  browser: Browser,
  who: AccountKey,
  opts: { locale?: Locale; viewport?: { width: number; height: number } } = {},
): Promise<Session> {
  const s = await newSession(browser, opts);
  await loginUI(s.page, who);
  return s;
}

export interface ApiResult<T = unknown> {
  status: number;
  body: {
    success?: boolean;
    message?: string;
    data?: T;
    code?: string;
    errors?: Record<string, string[]>;
    meta?: unknown;
  } | null;
}

/** Calls the API from the page context (same origin; sends the XSRF header for mutations). */
export async function apiFetch<T = unknown>(
  page: Page,
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  if (!page.url().startsWith(BASE_URL)) await page.goto('/');
  return page.evaluate(
    async ({ method, path, body }) => {
      const read = () =>
        document.cookie
          .split('; ')
          .find((c) => c.startsWith('XSRF-TOKEN='))
          ?.slice(11);
      if (method !== 'GET' && !read())
        await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' });
      const token = read();
      const send = () =>
        fetch(`/api/v1${path}`, {
          method,
          credentials: 'same-origin',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Accept-Language': 'en',
            ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      let res = await send();
      for (let attempt = 0; res.status === 429 && attempt < 5; attempt++) {
        const wait = Number(res.headers.get('retry-after') ?? 5);
        await new Promise((r) => setTimeout(r, Math.min(30, Math.max(1, wait)) * 1000));
        res = await send();
      }
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      return { status: res.status, body: json };
    },
    { method, path, body },
  );
}

/** Public GET straight to the API (no session). */
export async function publicGet<T>(page: Page, path: string): Promise<T> {
  // The API rate-limits per IP (throttle:api); back off and retry instead of failing the test.
  for (let attempt = 0; ; attempt++) {
    const res = await page.request.get(`${BASE_URL}/api/v1${path}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.status() === 429 && attempt < 5) {
      const wait = Number(res.headers()['retry-after'] ?? 5);
      await page.waitForTimeout(Math.min(30, Math.max(1, wait)) * 1000);
      continue;
    }
    expect(res.ok(), `GET ${path} -> ${res.status()}`).toBeTruthy();
    return ((await res.json()) as { data: T }).data;
  }
}

/** Fails if the Next.js dev overlay reports a runtime error, or the page threw. */
export async function expectNoRuntimeErrors(s: Session, where = ''): Promise<void> {
  const overlay = await s.page
    .locator('nextjs-portal')
    .getByText(/Runtime (Type)?Error|Unhandled|\d+ Issues?/)
    .count();
  expect(overlay, `Next.js error overlay on ${where || s.page.url()}`).toBe(0);
  expect(s.errors, `page errors on ${where || s.page.url()}`).toEqual([]);
}

/** Waits for in-flight queries to settle (no spinners/skeletons announced as status). */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

/** No horizontal page overflow (mobile layouts). */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(
    scroll,
    `horizontal overflow on ${page.url()} (${scroll} > ${client})`,
  ).toBeLessThanOrEqual(client + 1);
}

export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Opens `url`, waits for the page heading and loaded content, then checks overflow and errors. */
export async function auditPage(s: Session, url: string, shot?: string): Promise<void> {
  await s.page.goto(url);
  await expect(s.page.locator('main h1').first()).toBeVisible();
  await settle(s.page);
  // Skeletons/spinners announce themselves with role=status + aria-label; wait until they are gone.
  await expect(s.page.locator('main [role=status][aria-label]')).toHaveCount(0, {
    timeout: 20_000,
  });
  await expectNoHorizontalOverflow(s.page);
  await expectNoRuntimeErrors(s, `${url} ${await overlayText(s)}`);
  if (shot) {
    const vp = s.page.viewportSize();
    const suffix = vp && vp.width < 500 ? 'phone' : 'desktop';
    await s.page.screenshot({
      path: path.join(SHOTS_DIR, `${shot}-${suffix}.png`),
      fullPage: true,
    });
  }
}

/** Text of the Next.js dev overlay issue (if any), so a failure says what the issue was. */
async function overlayText(s: Session): Promise<string> {
  const badge = s.page.locator('nextjs-portal').getByText(/\d+ Issues?/);
  if (!(await badge.count())) return '';
  await badge
    .first()
    .click()
    .catch(() => undefined);
  return (await s.page.locator('nextjs-portal').allInnerTexts()).join(' ').slice(0, 600);
}
