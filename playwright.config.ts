import { defineConfig } from '@playwright/test'
import { WEB_URL } from './e2e/support/servers'

// The tests start their own servers in global setup (not Playwright's
// webServer), because one test stops and starts the backend.
export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  fullyParallel: false,
  // A test.only left behind would skip the rest and still pass.
  forbidOnly: true,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: WEB_URL,
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    locale: 'ko-KR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'app', testIgnore: /perf[\\/]/ },
    { name: 'perf', testMatch: /perf[\\/].*\.spec\.ts/, dependencies: ['app'] },
  ],
})
