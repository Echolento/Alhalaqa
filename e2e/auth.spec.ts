import { test, expect } from '@playwright/test'

test.describe('Auth pages', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('heading', { name: /تسجيل الدخول/i })).toBeVisible()
  })

  test('signup page loads', async ({ page }) => {
    await page.goto('/auth/signup')
    await expect(page.getByRole('heading', { name: /إنشاء حساب/i })).toBeVisible()
  })

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    await expect(page.getByRole('heading', { name: /نسيت كلمة المرور/i })).toBeVisible()
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', 'nonexistent@test.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page.getByText(/Invalid/i)).toBeVisible({ timeout: 10000 })
  })
})
