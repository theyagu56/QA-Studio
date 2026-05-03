import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, TIMEOUT } from './utils/config';

/**
 * Playwright Configuration
 * See: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // ─── Test Discovery ───────────────────────────────────────────────
  testDir: './tests',
  testMatch: '**/*.spec.ts',

  // ─── Execution ────────────────────────────────────────────────────
  fullyParallel: true,       // Run tests in parallel for speed
  workers: process.env.CI ? 1 : 4, // Use 1 worker in CI, 4 locally
  retries: process.env.CI ? 2 : 0, // Retry failed tests 2x in CI only
  timeout: TIMEOUT,          // Per-test timeout (from config.ts)

  // ─── Reporting ────────────────────────────────────────────────────
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],  // Real-time console output
  ],

  // ─── Shared Browser Settings ──────────────────────────────────────
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',       // Capture trace on first retry
    screenshot: 'only-on-failure', // Screenshot on failures
    video: 'off',                  // Set to 'on' to always record video
    actionTimeout: 8000,           // Max time per action (click, fill, etc.)
    navigationTimeout: 15000,      // Max time for page.goto()
  },

  // ─── Browser Projects ─────────────────────────────────────────────
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to run on more browsers:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // ─── Output ───────────────────────────────────────────────────────
  outputDir: 'test-results',
});
