import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:3000',
    locale: 'ar',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'e2e',
      testMatch: /pages\.spec\.ts/,
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run build && npm run start',
    port: 3000,
    timeout: 90000,
    reuseExistingServer: true,
  },
})
