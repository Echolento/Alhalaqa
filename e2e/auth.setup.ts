import { test as setup } from '@playwright/test'

// Playwright config declares a `setup` project that depends on this file.
// Each e2e spec seeds its own users and logs in via the real form, so no
// shared storageState is required — this is just a passing anchor so
// `npm run test:e2e` doesn't trip over a missing match.
setup('auth setup anchor', async () => {
  // intentionally empty
})
