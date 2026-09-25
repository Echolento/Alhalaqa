/**
 * Push dispatch proof on the Vercel preview (real domain, real VAPID).
 * Two isolated Chromium contexts (teacher + payer), both granted
 * notifications. Covers: login → welcome → add student → invite → claim →
 * auto-subscribe → upload → teacher receipt notification → verify →
 * paid hero → verdict notification.
 *
 * Notification *rendering* (OS pixels) is unobservable headless; delivery
 * is proven via serviceWorker.getNotifications() in each context, which
 * only lists what the push service actually delivered.
 *
 * Self-cleaning: teardown deletes all created rows + auth users.
 *
 * Env: E2E_BASE_URL (preview), E2E_SUPABASE_URL, E2E_ANON_KEY,
 * E2E_SERVICE_KEY. Falls back to the known project when unset.
 */
import { test, expect, type Page, chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env.test' })

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const SUPABASE_URL =
  process.env.E2E_SUPABASE_URL ?? 'https://mekubphfwjgojqulbmjg.supabase.co'
const ANON_KEY = process.env.E2E_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_KEY =
  process.env.E2E_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const stamp = Date.now()
const TEACHER_EMAIL = `e2e-teacher-${stamp}@example.com`
const PAYER_EMAIL = `e2e-payer-${stamp}@example.com`
const PASSWORD = 'E2ePassword123!'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const step = (name: string) => console.log(`[e2e] ${new Date().toISOString()} ${name}`)

async function listedNotifications(page: Page) {
  return page.evaluate(async () => {
    const ready = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('sw-ready-timeout')), 20000),
      ),
    ])
    const notes = await ready.getNotifications()
    return notes.map((n) => ({ title: n.title, body: n.body ?? '' }))
  })
}

async function userIdByEmail(email: string): Promise<string | null> {
  const { data } = await admin.auth.admin.listUsers()
  return data.users.find((u) => u.email === email)?.id ?? null
}

async function cleanup(ids: { teacher?: string | null; payer?: string | null }) {
  try {
    if (ids.teacher) {
      const { data: teachers } = await admin
        .from('teachers')
        .select('id')
        .eq('profile_id', ids.teacher)
      const teacherIds = (teachers ?? []).map((t: any) => t.id)
      if (teacherIds.length) {
        const { data: students } = await admin
          .from('students')
          .select('id')
          .in('teacher_id', teacherIds)
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
    for (const uid of [ids.teacher, ids.payer]) {
      if (!uid) continue
      await admin.from('push_subscriptions').delete().eq('profile_id', uid)
      await admin.from('profiles').delete().eq('id', uid)
      await admin.auth.admin.deleteUser(uid)
    }
  } catch (e) {
    console.log('[e2e-cleanup] best-effort failed:', (e as Error).message)
  }
}

test('push dispatch proof: claim → upload → verify → verdict', async () => {
  test.setTimeout(300000)
  // Persistent (non-incognito) profiles: Chrome disables the Push API in
  // incognito contexts, so the standard test fixture can never subscribe.
  const profileRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-push-'))

  // ---- admin setup: confirmed users, no inbox needed ----
  const { data: tCreated, error: tErr } = await admin.auth.admin.createUser({
    email: TEACHER_EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'E2E Teacher', role: 'teacher' },
  })
  expect(tErr).toBeNull()
  const { data: pCreated, error: pErr } = await admin.auth.admin.createUser({
    email: PAYER_EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'E2E Payer', role: 'student' },
  })
  expect(pErr).toBeNull()
  const teacherId = tCreated.user!.id
  const payerId = pCreated.user!.id

  const teacherCtx = await chromium.launchPersistentContext(
    path.join(profileRoot, 'teacher'),
    { channel: 'chrome', permissions: ['notifications'], locale: 'ar' },
  )
  const payerCtx = await chromium.launchPersistentContext(
    path.join(profileRoot, 'payer'),
    { channel: 'chrome', permissions: ['notifications'], locale: 'ar' },
  )
  const teacher = await teacherCtx.newPage()
  const payer = await payerCtx.newPage()

  try {
    // ---- teacher: login → welcome → dashboard ----
    await teacher.goto(`${BASE_URL}/auth/login`)
    await teacher.locator('#email').fill(TEACHER_EMAIL)
    await teacher.locator('#password').fill(PASSWORD)
    await teacher.locator('button[type="submit"]').click()
    await teacher.waitForURL(/\/welcome$|\/welcome\?|\/dashboard/, { timeout: 15000 })

    if (teacher.url().includes('/welcome')) {
      await teacher.locator('#default_monthly_price').fill('200')
      await teacher.locator('#instapay_link').fill('https://ipn.eg/S/e2e123')
      await teacher.locator('#instapay_handle').fill('e2e@instapay')
      await teacher.locator('#default_payment_day').fill('5')
      await teacher.getByRole('button', { name: 'حفظ والمتابعة' }).click()
      await teacher.waitForURL(/\/dashboard/, { timeout: 15000 })
    }
    await expect(teacher.getByText('المبالغ المستلمة')).toBeVisible({ timeout: 15000 })
    step('teacher on dashboard')

    // ---- teacher: add student ----
    await teacher.getByRole('button', { name: 'إضافة طالب' }).first().click()
    await teacher.locator('#name').fill('طالب تجريبي')
    await teacher.locator('#phone').fill('1012345678')
    await teacher.getByRole('button', { name: 'إضافة', exact: true }).click()
    await expect(teacher.getByText('طالب تجريبي')).toBeVisible({ timeout: 15000 })

    // ---- teacher: invite dialog → extract claim URL (no send) ----
    await teacher.getByRole('button', { name: /دعوة ولي الأمر/ }).first().click()
    const waLink = teacher.locator('a[href^="https://wa.me/"]').first()
    await expect(waLink).toBeVisible({ timeout: 15000 })
    const waHref = (await waLink.getAttribute('href')) ?? ''
    const messageText = decodeURIComponent(waHref.split('text=')[1] ?? '')
    const claimUrl = messageText.match(/https?:\/\/\S+\/claim\?token=\S+/)?.[0] ?? ''
    expect(claimUrl).toContain('/claim?token=clm_')
    await teacher.keyboard.press('Escape')
    step('claim URL extracted')

    // Student id for later DB + pay assertions.
    const { data: studentRow } = await admin
      .from('students')
      .select('id')
      .eq('teacher_id', (await admin.from('teachers').select('id').eq('profile_id', teacherId).single()).data!.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    const studentId = studentRow!.id as string

    // ---- payer: login → claim → confirm ----
    await payer.goto(`${BASE_URL}/auth/login`)
    await payer.locator('#email').fill(PAYER_EMAIL)
    await payer.locator('#password').fill(PASSWORD)
    await payer.locator('button[type="submit"]').click()
    await payer.waitForURL(/\/welcome$|\/welcome\?|\/dashboard/, { timeout: 15000 })
    step('payer logged in')

    await payer.goto(claimUrl)
    await expect(payer.getByText('طالب تجريبي', { exact: true })).toBeVisible({ timeout: 15000 })
    await payer.getByRole('button', { name: /تأكيد الربط/ }).click()
    await expect(payer.getByText('تم ربط الحساب بنجاح')).toBeVisible({ timeout: 15000 })
    step('payer claimed')

    // ---- payer: pay screen → auto-subscribed? ----
    await payer.goto(`${BASE_URL}/pay?student=${studentId}`)
    await expect(payer.getByTestId('amount-due')).toBeVisible({ timeout: 15000 })
    // Silent subscriber round-trip (first-hit server compile is slow — poll).
    await expect
      .poll(
        async () => {
          const { data } = await admin
            .from('push_subscriptions')
            .select('endpoint')
            .eq('profile_id', payerId)
            .maybeSingle()
          return (data as { endpoint?: string } | null)?.endpoint ?? null
        },
        { timeout: 60000 },
      )
      .toBeTruthy()

    // ---- payer: upload screenshot → pending ----
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
    await expect(payer.getByTestId('pending-banner')).toBeVisible({ timeout: 15000 })
    step('payer uploaded, pending')

    // ---- teacher: receipt push DELIVERED? ----
    step('reading teacher notifications')
    await teacher.reload()
    await teacher.waitForTimeout(8000) // FCM delivery window
    const teacherNotes = await listedNotifications(teacher)
    step(`teacher notes: ${JSON.stringify(teacherNotes)}`)
    const receiptNote = teacherNotes.find((n) => n.title.includes('إيصال'))
    expect(receiptNote, `teacher receipt push delivered, got: ${JSON.stringify(teacherNotes)}`).toBeTruthy()

    // ---- teacher: verify in queue ----
    await teacher.goto(`${BASE_URL}/dashboard/unpaid?student=${studentId}`)
    await teacher.getByTestId(/verify-/).first().click()
    await expect(teacher.getByText(/تم التحقق/)).toBeVisible({ timeout: 15000 })
    step('teacher verified')

    // ---- payer: paid hero + verdict push DELIVERED? ----
    await payer.goto(`${BASE_URL}/pay?student=${studentId}`)
    await expect(payer.getByTestId('paid-disclaimer')).toBeVisible({ timeout: 15000 })
    await payer.waitForTimeout(8000)
    const payerNotes = await listedNotifications(payer)
    const verdictNote = payerNotes.find(
      (n) => n.title.includes('قبول') || n.title.includes('مراجعة'),
    )
    expect(verdictNote, `payer verdict push delivered, got: ${JSON.stringify(payerNotes)}`).toBeTruthy()
  } finally {
    await teacherCtx.close().catch(() => {})
    await payerCtx.close().catch(() => {})
    await cleanup({ teacher: teacherId, payer: payerId })
    fs.rmSync(profileRoot, { recursive: true, force: true })
  }
})
