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

  test('/dashboard redirects to payments', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'المدفوعات' })).toBeVisible()
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

  test('shows empty state when search has no results', async ({ page }) => {
    await page.goto('/dashboard/students')
    await page.getByPlaceholder('البحث عن طالب...').fill('ZZZZ_EMPTY_SEARCH_ZZZZ')
    await page.waitForTimeout(500)
    await expect(page.getByRole('cell', { name: 'لا يوجد طلاب' })).toBeVisible()
  })

  test('payments page shows stat cards', async ({ page }) => {
    await page.goto('/dashboard/payments')
    await expect(page.getByText('المبالغ المستلمة')).toBeVisible()
    await expect(page.getByText('المبالغ المتبقية')).toBeVisible()
  })
})

test.describe.serial('Data mutating tests', () => {
  test.use({ storageState: 'e2e/.auth/user.json' })

  test('adds a student, verifies it, then deletes it', async ({ page }) => {
    const testName = `__test_delete_me_${Date.now()}__`

    await page.goto('/dashboard/students')
    await expect(page.getByText('قائمة الطلاب')).toBeVisible()

    await page.getByRole('button', { name: 'إضافة طالب' }).click()
    await expect(page.getByText('إضافة طالب جديد')).toBeVisible()
    await page.getByLabel('الاسم').fill(testName)
    await page.getByRole('button', { name: 'إضافة', exact: true }).click()

    await expect(page.getByText(testName).last()).toBeAttached({ timeout: 20000 })

    await page.waitForLoadState('load')

    const searchInput = page.getByPlaceholder('البحث عن طالب...')
    await searchInput.fill(testName)
    await page.waitForTimeout(500)

    const deleteBtns = page.getByRole('button', { name: 'حذف' })
    await deleteBtns.last().click()
    await expect(page.getByRole('dialog')).toBeAttached({ timeout: 10000 })
    await expect(page.getByRole('dialog')).toContainText(testName)

    await page.getByRole('button', { name: 'تأكيد الحذف' }).click()
    await expect(page.getByRole('button', { name: 'إضافة' })).toBeVisible({ timeout: 15000 })
    await page.waitForLoadState('load')
    await expect(page.getByText(testName)).toHaveCount(0, { timeout: 20000 })
  })

  test('marks a student paid, then undoes it', async ({ page }) => {
    const testName = `__test_payment_toggle_${Date.now()}__`

    await page.goto('/dashboard/students')
    await expect(page.getByText('قائمة الطلاب')).toBeVisible()
    await page.getByRole('button', { name: 'إضافة طالب' }).click()
    await expect(page.getByText('إضافة طالب جديد')).toBeVisible()
    await page.getByLabel('الاسم').fill(testName)
    await page.getByRole('button', { name: 'إضافة', exact: true }).click()
    await expect(page.getByText(testName).last()).toBeAttached({ timeout: 20000 })
    await page.waitForLoadState('load')

    await page.getByRole('link', { name: 'المدفوعات' }).click()
    await page.waitForURL('/dashboard/payments')
    await expect(page.getByRole('heading', { name: 'المدفوعات' })).toBeVisible()

    const card = page.getByText(testName).first().locator('xpath=ancestor::div[@data-slot="card"]')
    await card.locator('button:has-text("تحديد كمدفوع")').click()
    await expect(card.locator('button:has-text("تراجع")')).toBeVisible({ timeout: 15000 })

    await card.locator('button:has-text("تراجع")').click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.getByRole('button', { name: 'نعم، تراجع' }).click()
    await expect(card.locator('button:has-text("تحديد كمدفوع")')).toBeVisible({ timeout: 15000 })

    await page.goto('/dashboard/students')
    await page.waitForLoadState('load')
    const searchInput = page.getByPlaceholder('البحث عن طالب...')
    await searchInput.fill(testName)
    await page.waitForTimeout(500)
    const deleteBtns = page.getByRole('button', { name: 'حذف' })
    await deleteBtns.last().click()
    await expect(page.getByRole('dialog')).toContainText(testName)
    await page.getByRole('button', { name: 'تأكيد الحذف' }).click()
    await expect(page.getByRole('button', { name: 'إضافة' })).toBeVisible({ timeout: 15000 })
    await page.waitForLoadState('load')
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
