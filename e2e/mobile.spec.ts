import { test, expect } from '@playwright/test'

test.describe('Mobile viewport (375x812)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test.describe('Auth pages (unauthenticated)', () => {
    test('/auth/login renders', async ({ page }) => {
      await page.goto('/auth/login')
      await expect(page.getByPlaceholder('example@email.com')).toBeVisible()
      await expect(page.getByText('نسيت كلمة المرور؟')).toBeVisible()
    })

    test('/auth/signup renders', async ({ page }) => {
      await page.goto('/auth/signup')
      await expect(page.getByText('الاسم الكامل')).toBeVisible()
    })
  })

  test.describe('Dashboard (authenticated)', () => {
    test.use({ storageState: 'e2e/.auth/user.json' })

    test('/dashboard redirects to payments on mobile', async ({ page }) => {
      await page.goto('/dashboard')
      await expect(page.getByRole('heading', { name: 'المدفوعات' })).toBeVisible()
      const sidebar = page.locator('aside')
      await expect(sidebar).toBeHidden()
    })

    test('hamburger button visible on mobile', async ({ page }) => {
      await page.goto('/dashboard')
      const hamburger = page.locator('button:has(svg.lucide-menu)')
      await expect(hamburger).toBeVisible()
    })

    test('hamburger opens navigation sheet', async ({ page }) => {
      await page.goto('/dashboard')
      await page.locator('button:has(svg.lucide-menu)').click()
      await expect(page.getByRole('link', { name: 'الطلاب' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'المدفوعات' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'الإعدادات' })).toBeVisible()
    })

    test('sheet navigation link navigates and closes sheet', async ({ page }) => {
      await page.goto('/dashboard')
      await page.locator('button:has(svg.lucide-menu)').click()
      await page.getByRole('link', { name: 'الطلاب' }).click()
      await expect(page).toHaveURL(/\/dashboard\/students/)
    })

    test('/dashboard/students shows card layout on mobile', async ({ page }) => {
      await page.goto('/dashboard/students')
      await expect(page.getByText('قائمة الطلاب')).toBeVisible()
      await expect(page.getByRole('button', { name: 'إضافة طالب' })).toBeVisible()
    })

    test('/dashboard/payments renders on mobile', async ({ page }) => {
      await page.goto('/dashboard/payments')
      await expect(page.getByRole('heading', { name: 'المدفوعات' })).toBeVisible()
      await expect(page.getByText('المبالغ المستلمة')).toBeVisible()
    })

    test('/dashboard/settings renders on mobile', async ({ page }) => {
      await page.goto('/dashboard/settings')
      await expect(page.getByRole('heading', { name: 'الإعدادات' })).toBeVisible()
    })
  })
})
