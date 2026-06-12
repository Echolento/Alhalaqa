import { test, expect } from '@playwright/test'

test.describe('Visual regression — Auth pages', () => {
  test('/auth/login matches snapshot', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('load')
    await expect(page).toHaveScreenshot('auth-login.png', { fullPage: true })
  })

  test('/auth/signup matches snapshot', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.waitForLoadState('load')
    await expect(page).toHaveScreenshot('auth-signup.png', { fullPage: true })
  })

  test('/auth/forgot-password matches snapshot', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    await page.waitForLoadState('load')
    await expect(page).toHaveScreenshot('auth-forgot-password.png', { fullPage: true })
  })
})

test.describe('Visual regression — Dashboard (authenticated)', () => {
  test.use({ storageState: 'e2e/.auth/user.json' })

  test('/dashboard matches snapshot', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('load')
    const main = page.locator('main')
    await expect(main).toHaveScreenshot('dashboard.png')
  })

  test('/dashboard/students matches snapshot', async ({ page }) => {
    await page.goto('/dashboard/students')
    await page.waitForLoadState('load')
    const main = page.locator('main')
    await expect(main).toHaveScreenshot('dashboard-students.png')
  })

  test('/dashboard/payments matches snapshot', async ({ page }) => {
    await page.goto('/dashboard/payments')
    await page.waitForLoadState('load')
    const main = page.locator('main')
    await expect(main).toHaveScreenshot('dashboard-payments.png')
  })

  test('/dashboard/settings matches snapshot', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('load')
    const main = page.locator('main')
    await expect(main).toHaveScreenshot('dashboard-settings.png')
  })
})

test.describe('Visual regression — Mobile viewport', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('/auth/login mobile matches snapshot', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('load')
    await expect(page).toHaveScreenshot('auth-login-mobile.png', { fullPage: true })
  })

  test('/auth/signup mobile matches snapshot', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.waitForLoadState('load')
    await expect(page).toHaveScreenshot('auth-signup-mobile.png', { fullPage: true })
  })
})

test.describe('Visual regression — Mobile dashboard (authenticated)', () => {
  test.use({ storageState: 'e2e/.auth/user.json', viewport: { width: 375, height: 812 } })

  test('/dashboard mobile matches snapshot', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('load')
    const main = page.locator('main')
    await expect(main).toHaveScreenshot('dashboard-mobile.png')
  })

  test('/dashboard/students mobile matches snapshot', async ({ page }) => {
    await page.goto('/dashboard/students')
    await page.waitForLoadState('load')
    const main = page.locator('main')
    await expect(main).toHaveScreenshot('dashboard-students-mobile.png')
  })
})
