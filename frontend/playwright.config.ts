import { defineConfig, devices } from '@playwright/test';

// Unique artifacts dir per run so parallel runs (several agents/terminals) never wipe each other's traces.
// Set once in the main process; worker processes inherit the env var.
process.env.E2E_RUN_ID ??= String(Date.now());

/**
 * E2E tests against the already-running stack (web http://localhost:3000, API :8000 with demo data).
 * No webServer is started here. This is the only Playwright config: specs share demo data, so they run
 * serially (1 worker) and every spec cleans up or uses unique data so the suite is re-runnable. Each
 * session sets its own UI locale/viewport (tests/e2e/helpers.ts), so no per-area projects are needed.
 *
 *   npx playwright test                 # all specs
 *   npx playwright test tests/e2e/booking.spec.ts
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  outputDir: `./test-results/e2e-${process.env.E2E_RUN_ID}`,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    // Installed Google Chrome by default (no browser download). E2E_CHANNEL=chromium uses Playwright's build.
    channel:
      process.env.E2E_CHANNEL === 'chromium' ? undefined : (process.env.E2E_CHANNEL ?? 'chrome'),
  },
});
