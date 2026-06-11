import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('redirects unauthenticated user from students page', async ({ page }) => {
    await page.goto('/dashboard/students')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('redirects unauthenticated user from payments page', async ({ page }) => {
    await page.goto('/dashboard/payments')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
