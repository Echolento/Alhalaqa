import { test, expect } from '@playwright/test'

test.describe('Auth pages (unauthenticated)', () => {
  test('/auth/login renders form fields', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByPlaceholder('example@email.com')).toBeVisible()
    await expect(page.getByText('نسيت كلمة المرور؟')).toBeVisible()
    await expect(page.getByText('إنشاء حساب جديد')).toBeVisible()
  })

  test('/auth/signup renders form fields', async ({ page }) => {
    await page.goto('/auth/signup')
    await expect(page.getByText('الاسم الكامل')).toBeVisible()
    await expect(page.getByText('إنشاء حساب معلم')).toBeVisible()
  })

  test('/auth/forgot-password renders form', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    await expect(page.getByText('إرسال الرابط')).toBeVisible()
  })

  test('/auth/update-password renders form', async ({ page }) => {
    await page.goto('/auth/update-password')
    await expect(page.getByText('تحديث كلمة المرور')).toBeVisible()
  })

  test('navigation: login -> signup -> login', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByText('إنشاء حساب جديد').click()
    await expect(page).toHaveURL('/auth/signup')
    await page.getByText('تسجيل الدخول').click()
    await expect(page).toHaveURL('/auth/login')
  })

  test('navigation: login -> forgot-password', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByText('نسيت كلمة المرور؟').click()
    await expect(page).toHaveURL('/auth/forgot-password')
  })
})

test.describe('Auth redirects (unauthenticated)', () => {
  test('/dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('/dashboard/students redirects to login', async ({ page }) => {
    await page.goto('/dashboard/students')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('/dashboard/payments redirects to login', async ({ page }) => {
    await page.goto('/dashboard/payments')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('/dashboard/settings redirects to login', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

test.describe('Authenticated dashboard pages', () => {
  test.use({ storageState: 'e2e/.auth/user.json' })

  test('/ loads dashboard', async ({ page }) => {
    const resp = await page.goto('/')
    expect(resp?.status()).toBe(200)
  })

  test('/dashboard renders with data', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible()
    await expect(page.getByText('إجمالي الطلاب')).toBeVisible()
  })

  test('/dashboard/students renders', async ({ page }) => {
    await page.goto('/dashboard/students')
    await expect(page.getByText('قائمة الطلاب')).toBeVisible()
  })

  test('/dashboard/payments renders', async ({ page }) => {
    await page.goto('/dashboard/payments')
    await expect(page.getByRole('heading', { name: 'المدفوعات' })).toBeVisible()
  })

  test('/dashboard/settings renders', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await expect(page.getByRole('heading', { name: 'الإعدادات' })).toBeVisible()
  })
})

test.describe('Student CRUD (self-cleaning)', () => {
  test.use({ storageState: 'e2e/.auth/user.json' })
  const testName = '__test_delete_me__'

  test('adds a student, verifies it, then deletes it', async ({ page }) => {
    await page.goto('/dashboard/students')
    await expect(page.getByText('قائمة الطلاب')).toBeVisible()

    // Open add dialog
    await page.getByRole('button', { name: 'إضافة طالب' }).click()
    await expect(page.getByText('إضافة طالب جديد')).toBeVisible()
    await page.getByLabel('الاسم').fill(testName)

    // Submit add form — triggers window.location.reload()
    await page.getByRole('button', { name: 'إضافة', exact: true }).click()

    // Wait for student to appear in the page after reload
    await expect(page.getByText(testName).last()).toBeAttached({ timeout: 20000 })

    // Click the last delete button — our test student was added last
    const deleteBtns = page.getByRole('button', { name: 'حذف' })
    await deleteBtns.last().click()
    await expect(page.getByRole('dialog')).toBeAttached()
    await expect(page.getByRole('dialog')).toContainText(testName)

    // Confirm deletion — triggers window.location.reload() on success
    await page.getByRole('button', { name: 'تأكيد الحذف' }).click()

    // Wait for page to fully reload after deletion
    await expect(page.getByRole('button', { name: 'إضافة' })).toBeVisible({ timeout: 15000 })

    // Verify student is gone from the table
    await expect(page.getByText(testName)).toHaveCount(0, { timeout: 20000 })
  })
})

test.describe('Public / error pages', () => {
  test('/auth/error renders', async ({ page }) => {
    await page.goto('/auth/error')
    await expect(page.locator('body')).toBeVisible()
  })

  test('/_not-found renders', async ({ page }) => {
    const resp = await page.goto('/this-path-does-not-exist')
    expect(resp?.status()).toBe(404)
  })
})
