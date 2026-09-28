/**
 * PWA invite-UX coverage (branch tdd/pwa-invite-ux) + old-flow regression.
 * Hits local dev (E2E_BASE_URL or http://localhost:3000). No push-delivery
 * asserts here (proven separately in push-proof.spec.ts — untouched lane);
 * this spec covers every NEW surface plus the classic claim→pay→verify loop.
 *
 * NEW: manifest/icons/sw + apple metas, claim phone-confirm + edit, install
 * coach + faint Later, /pay hub (grouped by teacher) + login form,
 * conditional مدفوعاتي, /pay install banner, no-teacher-bootstrap for payer
 * flows.
 * OLD: login → welcome → add student → invite link → claim → pay screen →
 * upload → pending → verify → paid hero.
 *
 * Self-cleaning: teardown deletes all created rows + auth users.
 */
import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env.test' })

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const SUPABASE_URL =
  process.env.E2E_SUPABASE_URL ?? 'https://mekubphfwjgojqulbmjg.supabase.co'
const ANON_KEY = process.env.E2E_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_KEY =
  process.env.E2E_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const stamp = Date.now()
const TEACHER_EMAIL = `e2e-pwa-teacher-${stamp}@example.com`
const PAYER_EMAIL = `e2e-pwa-payer-${stamp}@example.com`
const PLAIN_TEACHER_EMAIL = `e2e-pwa-plain-${stamp}@example.com`
const PASSWORD = 'E2ePassword123!'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const step = (name: string) => console.log(`[e2e-pwa] ${new Date().toISOString()} ${name}`)

async function passwordLogin(page: Page, email: string) {
  await page.goto(`${BASE_URL}/auth/login`)
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/welcome$|\/welcome\?|\/dashboard/, { timeout: 30000 })
}

async function onboardTeacher(page: Page) {
  if (page.url().includes('/welcome')) {
    await page.locator('#default_monthly_price').fill('200')
    await page.locator('#instapay_link').fill('https://ipn.eg/S/pwa123')
    await page.locator('#instapay_handle').fill('pwa@instapay')
    await page.locator('#default_payment_day').fill('5')
    await page.getByRole('button', { name: 'حفظ والمتابعة' }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 30000 })
  }
  await expect(page.getByText('المبالغ المستلمة')).toBeVisible({ timeout: 30000 })
}

async function addStudent(page: Page, name: string, phone: string) {
  await page.getByRole('button', { name: 'إضافة طالب' }).first().click()
  await page.locator('#name').fill(name)
  await page.locator('#phone').fill(phone)
  await page.getByRole('button', { name: 'إضافة', exact: true }).click()
  await expect(page.getByText(name)).toBeVisible({ timeout: 30000 })
}

async function extractClaimUrl(page: Page): Promise<string> {
  await page.getByRole('button', { name: /دعوة ولي الأمر/ }).first().click()
  const waLink = page.locator('a[href^="https://wa.me/"]').first()
  await expect(waLink).toBeVisible({ timeout: 30000 })
  const waHref = (await waLink.getAttribute('href')) ?? ''
  const messageText = decodeURIComponent(waHref.split('text=')[1] ?? '')
  const claimUrl = messageText.match(/https?:\/\/\S+\/claim\?token=\S+/)?.[0] ?? ''
  expect(claimUrl).toContain('/claim?token=clm_')
  await page.keyboard.press('Escape')
  return claimUrl
}

async function teacherRowId(profileId: string): Promise<string> {
  const { data: teacher } = await admin
    .from('teachers')
    .select('id')
    .eq('profile_id', profileId)
    .single()
  return (teacher as { id: string }).id
}

async function studentIdByName(profileId: string, name: string): Promise<string> {
  const { data: studentRow } = await admin
    .from('students')
    .select('id')
    .eq('teacher_id', await teacherRowId(profileId))
    .eq('name', name)
    .limit(1)
    .single()
  return (studentRow as { id: string }).id
}

async function userIdByEmail(email: string): Promise<string | null> {
  const { data } = await admin.auth.admin.listUsers()
  return data.users.find((u) => u.email === email)?.id ?? null
}

async function cleanup(ids: { teacher?: string | null; payer?: string | null; plain?: string | null }) {
  try {
    if (ids.teacher) {
      const { data: teachers } = await admin.from('teachers').select('id').eq('profile_id', ids.teacher)
      const teacherIds = (teachers ?? []).map((t: any) => t.id)
      if (teacherIds.length) {
        const { data: students } = await admin.from('students').select('id').in('teacher_id', teacherIds)
        const studentIds = (students ?? []).map((s: any) => s.id)
        if (studentIds.length) {
          await admin.from('payment_proofs').delete().in('student_id', studentIds)
          await admin.from('claim_tokens').delete().in('student_id', studentIds)
          await admin.from('student_payments').delete().in('student_id', studentIds)
          await admin.from('students').delete().in('id', studentIds)
        }
        await admin.from('teachers').delete().in('id', teacherIds)
      }
    }
    for (const uid of [ids.teacher, ids.payer, ids.plain]) {
      if (!uid) continue
      await admin.from('push_subscriptions').delete().eq('profile_id', uid)
      await admin.from('profiles').delete().eq('id', uid)
      await admin.auth.admin.deleteUser(uid)
    }
  } catch (e) {
    console.log('[e2e-pwa-cleanup] best-effort failed:', (e as Error).message)
  }
}

test.describe('PWA invite UX + old-flow regression', () => {
  let teacherId: string | null = null
  let payerId: string | null = null
  let plainId: string | null = null

  test.beforeAll(async () => {
    const mk = async (email: string, role: string) => {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: 'E2E', role },
      })
      expect(error).toBeNull()
      return data.user!.id
    }
    teacherId = await mk(TEACHER_EMAIL, 'teacher')
    payerId = await mk(PAYER_EMAIL, 'student')
    plainId = await mk(PLAIN_TEACHER_EMAIL, 'teacher')
  })

  test.afterAll(async () => {
    await cleanup({ teacher: teacherId, payer: payerId, plain: plainId })
  })

  test('installability: manifest + icons + metas', async ({ page }) => {
    const manifestRes = await page.request.get(`${BASE_URL}/manifest.json`)
    expect(manifestRes.ok()).toBeTruthy()
    const manifest = await manifestRes.json()
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    const sizes = (manifest.icons as Array<{ sizes: string }>).map((i) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    for (const icon of manifest.icons as Array<{ src: string }>) {
      const r = await page.request.get(`${BASE_URL}${icon.src}`)
      expect(r.ok(), `icon ${icon.src} serves`).toBeTruthy()
    }
    const sw = await page.request.get(`${BASE_URL}/sw.js`)
    expect(sw.ok()).toBeTruthy()

    await page.goto(`${BASE_URL}/pay`)
    const appleCapable = await page.evaluate(() =>
      document.querySelector('meta[name="mobile-web-app-capable"], meta[name="apple-mobile-web-app-capable"]'),
    )
    expect(appleCapable).toBeTruthy()
    step('installability ok')
  })

  test('claim phone-confirm → edit → coach → Later → pay (new)', async ({ browser }) => {
    // Role isolation: teacher and payer each get their own context, so no
    // session ever leaks across the /auth/login redirect.
    const tCtx = await browser.newContext({ locale: 'ar' })
    const pCtx = await browser.newContext({ locale: 'ar' })
    const teacher = await tCtx.newPage()
    const payer = await pCtx.newPage()
    try {
      await passwordLogin(teacher, TEACHER_EMAIL)
      await onboardTeacher(teacher)
      await addStudent(teacher, 'طالب تجريبي', '1012345678')
      const claimUrl = await extractClaimUrl(teacher)
      const sid = await studentIdByName(teacherId!, 'طالب تجريبي')

      // Payer claims.
      await passwordLogin(payer, PAYER_EMAIL)
      await payer.goto(claimUrl)
      await expect(payer.getByText('طالب تجريبي', { exact: true })).toBeVisible({ timeout: 60000 })
      await payer.getByRole('button', { name: /تأكيد الربط/ }).click()
      await expect(payer.getByText('تم ربط الحساب بنجاح')).toBeVisible({ timeout: 60000 })

      // NEW: phone-confirm step shows the teacher-entered number.
      const confirm = payer.getByTestId('claim-phone-confirm')
      await expect(confirm).toBeVisible({ timeout: 60000 })
      await expect(confirm.getByText(/1012345678/)).toBeVisible()

      // NEW: edit the number → normalized E.164 in DB.
      await payer.getByRole('button', { name: /تعديل الرقم/ }).click()
      await payer.getByTestId('claim-phone-input').fill('01055556666')
      await payer.getByRole('button', { name: /حفظ الرقم/ }).click()
      await expect(payer.getByTestId('install-coach')).toBeVisible({ timeout: 60000 })
      const { data: updated } = await admin.from('students').select('phone').eq('id', sid).single()
      expect((updated as { phone: string }).phone).toBe('+201055556666')
      step('phone edited + normalized')

      // NEW: faint Later skips to pay.
      await payer.getByRole('button', { name: /لاحق/ }).click()
      await payer.waitForURL(/\/pay\?student=/, { timeout: 60000 })
      await expect(payer.getByTestId('amount-due')).toBeVisible({ timeout: 60000 })
      step('coach → Later → pay ok')
    } finally {
      await tCtx.close().catch(() => {})
      await pCtx.close().catch(() => {})
    }
  })

  test('payer hub + login form + no teacher bootstrap (new)', async ({ browser }) => {
    // Logged-out /pay shows the generic OTP login.
    const anonCtx = await browser.newContext({ locale: 'ar' })
    const anon = await anonCtx.newPage()
    await anon.goto(`${BASE_URL}/pay`)
    await expect(anon.getByTestId('payer-login-email')).toBeVisible({ timeout: 30000 })
    await anonCtx.close()

    // Logged-in hub lists the claimed student under the teacher section.
    // Self-sufficient: own student + own claim (no dependence on test 2).
    const tCtx = await browser.newContext({ locale: 'ar' })
    const teacher = await tCtx.newPage()
    await passwordLogin(teacher, TEACHER_EMAIL)
    await onboardTeacher(teacher)
    await addStudent(teacher, 'طالب هب', '1033333333')
    const hubClaimUrl = await extractClaimUrl(teacher)
    await tCtx.close()

    const ctx = await browser.newContext({ locale: 'ar' })
    const payer = await ctx.newPage()
    await passwordLogin(payer, PAYER_EMAIL)
    await payer.goto(hubClaimUrl)
    await payer.getByRole('button', { name: /تأكيد الربط/ }).click()
    await expect(payer.getByTestId('claim-phone-confirm')).toBeVisible({ timeout: 30000 })
    await payer.getByRole('button', { name: /الرقم صحيح/ }).click()
    await expect(payer.getByTestId('install-coach')).toBeVisible({ timeout: 30000 })
    const sid = await studentIdByName(teacherId!, 'طالب هب')

    await payer.goto(`${BASE_URL}/pay`)
    await expect(payer.getByTestId('payer-hub')).toBeVisible({ timeout: 30000 })
    const row = payer.getByTestId(`hub-student-${sid}`)
    await expect(row).toBeVisible()
    expect(await row.getAttribute('href')).toContain(`student=${sid}`)
    await expect(payer.getByTestId('hub-claim-another')).toBeVisible()
    await ctx.close()

    // NOTE: no teacher-row assertion here on purpose. The e2e payer signs
    // in via the teacher password form (no inbox for OTP), and THAT action
    // mints a teacher row by design (pre-existing auth-actions behavior).
    // The callback gate (OTP logins via ?next=/pay or /claim never touching
    // teachers) is covered by unit tests in
    // app/auth/callback/__tests__/route.test.ts.
    step('hub + login ok')
  })

  test('conditional مدفوعاتي + classic pay→verify loop (old)', async ({ browser }) => {
    // Plain teacher (no claims) sees no shortcut.
    const plainCtx = await browser.newContext({ locale: 'ar' })
    const plain = await plainCtx.newPage()
    await passwordLogin(plain, PLAIN_TEACHER_EMAIL)
    await onboardTeacher(plain)
    await expect(plain.getByTestId('my-payments-link')).toHaveCount(0)
    await plainCtx.close()
    step('plain teacher: no shortcut')

    // Teacher claims her own second student → shortcut appears.
    const tCtx = await browser.newContext({ locale: 'ar' })
    const teacher = await tCtx.newPage()
    await passwordLogin(teacher, TEACHER_EMAIL)
    await onboardTeacher(teacher)
    await addStudent(teacher, 'طالب ثان', '1022222222')
    const claimUrl2 = await extractClaimUrl(teacher)
    await teacher.goto(claimUrl2)
    await teacher.getByRole('button', { name: /تأكيد الربط/ }).click()
    await expect(teacher.getByTestId('claim-phone-confirm')).toBeVisible({ timeout: 30000 })
    await teacher.getByRole('button', { name: /الرقم صحيح/ }).click()
    await expect(teacher.getByTestId('install-coach')).toBeVisible({ timeout: 30000 })
    await teacher.goto(`${BASE_URL}/dashboard`)
    const myPay = teacher.getByTestId('my-payments-link')
    await expect(myPay).toBeVisible({ timeout: 30000 })
    expect(await myPay.getAttribute('href')).toBe('/pay')
    step('teacher-payer: shortcut visible')

    // OLD regression: upload → pending → verify → paid hero.
    const pCtx = await browser.newContext({ locale: 'ar' })
    const payer = await pCtx.newPage()
    await passwordLogin(payer, PAYER_EMAIL)
    const sid = await studentIdByName(teacherId!, 'طالب ثان')
    await payer.goto(`${BASE_URL}/pay?student=${sid}`)
    await expect(payer.getByTestId('install-banner')).toBeVisible({ timeout: 30000 })
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    await payer.locator('#receipt-upload').setInputFiles({
      name: 'receipt.png',
      mimeType: 'image/png',
      buffer: png,
    })
    await payer.getByTestId('upload-confirm').click()
    await expect(payer.getByTestId('pending-banner')).toBeVisible({ timeout: 30000 })
    await teacher.goto(`${BASE_URL}/dashboard/unpaid?student=${sid}`)
    await teacher.getByTestId(/verify-/).first().click()
    await expect(teacher.getByText(/تم التحقق/)).toBeVisible({ timeout: 30000 })
    await payer.goto(`${BASE_URL}/pay?student=${sid}`)
    await expect(payer.getByTestId('paid-disclaimer')).toBeVisible({ timeout: 30000 })
    step('classic loop ok')

    await tCtx.close()
    await pCtx.close()
  })
})
