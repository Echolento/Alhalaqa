import { defineConfig } from '@playwright/test'

// Standalone e2e config: hits the Vercel preview (real domain, real VAPID),
// no local webServer, no setup-project dependency.
export default defineConfig({
  testDir: './e2e',
  timeout: 120000,
  retries: 0,
  fullyParallel: false,
  reporter: 'line',
  use: {
    locale: 'ar',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // Real Chrome (full headless=new): the bundled headless shell reports
    // Notification.permission as denied no matter the grant, which makes
    // push subscribe untestable. Channel chrome = true permission behavior.
    launchOptions: {
      channel: 'chrome',
    },
  },
})
