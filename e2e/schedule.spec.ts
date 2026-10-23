/**
 * QA pass for the class-schedule + 4-state billing model, end to end.
 *
 * Self-seeding + self-cleaning: creates a fresh teacher (confirmed, no inbox),
 * seeds one debtor student directly via the admin client, adds a second student
 * through the real add dialog, then walks the real UI for every schedule-specific
 * behaviour. Every DB expectation below mirrors the server-action contract
 * (lib/schedule-actions.ts, lib/student-actions.ts, lib/payment-actions.ts).
 *
 * Flow:
 *   onboarding (weekly + Monday) → seed debtor B (overdue since yesterday,
 *   never paid) → UI-add student A (starts next Monday → awaiting-start section)
 *   → mark-paid round trip on B (settle_cycle / reopen_cycle)
 *   → class change weekly → monthly (B deferred to pending_*, A applied now)
 *   → custom +45d date on A → /pay awaiting card → reset A to class schedule
 *   → custom past date on B → reset B blocked while owing
 *   → settle B's deferred debt → pending class schedule promoted by settle_cycle
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
// The server advances due dates with this exact helper — importing it (same
// code, same process TZ) keeps the expectation byte-identical to the action,
// including across DST windows where ms-based and calendar arithmetic differ.
import { advanceDueDate } from '../lib/billing-next'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env.test' })

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? 'https://mekubphfwjgojqulbmjg.supabase.co'
const SERVICE_KEY = process.env.E2E_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const stamp = Date.now()
const TEACHER_EMAIL = `e2e-sched-${stamp}@example.com`
const PASSWORD = 'E2ePassword123!'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const STUDENT_COLS =
  'id, frequency, next_due_date, starts_on, schedule_overridden, pending_frequency, pending_next_due, monthly_price'

function isoDateOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return isoDateOf(d)
}

/** firstBillDate(monthly, today): the 1st when today isn't already the 1st. */
function firstOfMonthOnOrAfterToday(): string {
  const d = new Date()
  if (d.getDate() === 1) return isoDateOf(d)
  return isoDateOf(new Date(d.getFullYear(), d.getMonth() + 1, 1))
}

/** firstBillDate(weekly, today, weekday): today when it already matches. */
function nextWeekdayISO(weekday: number): string {
  const d = new Date()
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1)
  return isoDateOf(d)
}

type StudentRow = {
  id: string
  frequency: string
  next_due_date: string
  starts_on: string
  schedule_overridden: boolean
  pending_frequency: string | null
  pending_next_due: string | null
  monthly_price: number
}

async function fetchStudent(id: string): Promise<StudentRow> {
  const { data, error } = await admin.from('students').select(STUDENT_COLS).eq('id', id).single()
  expect(error).toBeNull()
  return data as StudentRow
}

async function fetchTeacher(id: string) {
  const { data } = await admin
    .from('teachers')
    .select('default_frequency, default_weekday, default_monthly_price')
    .eq('id', id)
    .single()
  return data as { default_frequency: string; default_weekday: number | null; default_monthly_price: number }
}

async function paymentFor(studentId: string, month: string): Promise<{ paid: boolean } | null> {
  const { data } = await admin
    .from('student_payments')
    .select('paid')
    .eq('student_id', studentId)
    .eq('month', month)
    .maybeSingle()
  return (data as { paid: boolean } | null) ?? null
}

async function cleanup(uid: string) {
  try {
    const { data: teachers } = await admin.from('teachers').select('id').eq('profile_id', uid)
    const teacherIds = (teachers ?? []).map((t: { id: string }) => t.id)
    if (teacherIds.length) {
      const { data: students } = await admin.from('students').select('id').in('teacher_id', teacherIds)
      const studentIds = (students ?? []).map((s: { id: string }) => s.id)
      if (studentIds.length) {
        await admin.from('payment_proofs').delete().in('student_id', studentIds)
        await admin.from('claim_tokens').delete().in('student_id', studentIds)
        await admin.from('student_payments').delete().in('student_id', studentIds)
        await admin.from('students').delete().in('id', studentIds)
      }
      await admin.from('teachers').delete().in('id', teacherIds)
    }
    await admin.from('profiles').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid)
  } catch (e) {
    console.log('[sched-cleanup] best-effort:', (e as Error).message)
  }
}

async function teacherIdFor(uid: string): Promise<string> {
  const { data } = await admin.from('teachers').select('id').eq('profile_id', uid).single()
  return data!.id as string
}

test('schedule model + 4-state billing: onboarding → roster → toggle → class change → custom/reset', async ({
  page,
}) => {
  test.setTimeout(240000)

  const { data: created, error } = await admin.auth.admin.createUser({
    email: TEACHER_EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'E2E Schedule', role: 'teacher' },
  })
  expect(error).toBeNull()
  const uid = created.user!.id

  // admin.createUser bypasses signUp (which mints the profile with role
  // 'teacher'); force the row so the role-gated settings cards render.
  const { error: profileErr } = await admin.from('profiles').upsert(
    { id: uid, full_name: 'E2E Schedule', email: TEACHER_EMAIL, role: 'teacher' },
    { onConflict: 'id' },
  )
  expect(profileErr).toBeNull()

  const startISO = nextWeekdayISO(1) // Monday — the onboarding weekday
  const firstNextMonth = firstOfMonthOnOrAfterToday()
  const seedDue = isoDaysFromNow(-1) // B: started, owes since yesterday
  const settleNext = advanceDueDate(seedDue, 'weekly')
  const plus45 = isoDaysFromNow(45)
  const customPast = isoDaysFromNow(-2)

  try {
    // ---- login → onboarding (weekly + Monday) ----
    await page.goto(`${BASE_URL}/auth/login`)
    await page.locator('#email').fill(TEACHER_EMAIL)
    await page.locator('#password').fill(PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/welcome/, { timeout: 20000 })

    await expect(page.getByTestId('weekday-select')).toBeHidden()
    await page.getByTestId('frequency-select').selectOption('weekly')
    await expect(page.getByTestId('weekday-select')).toBeVisible()
    await page.getByTestId('weekday-select').selectOption('1') // الاثنين
    await page.getByTestId('price-input').fill('200')
    await page.getByRole('button', { name: 'متابعة' }).click()

    await page.waitForURL(/\/welcome\/instapay/, { timeout: 20000 })
    await page.locator('#instapay_link').fill('https://ipn.eg/S/e2esched')
    await page.locator('#instapay_handle').fill('e2esched@instapay')
    await page.getByRole('button', { name: 'إنهاء الإعداد' }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 20000 })
    await expect(page.getByPlaceholder('البحث عن طالب...')).toBeVisible({ timeout: 20000 })

    const teacherId = await teacherIdFor(uid)
    const teacher = await fetchTeacher(teacherId)
    expect(teacher.default_frequency).toBe('weekly')
    expect(teacher.default_weekday).toBe(1)
    expect(Number(teacher.default_monthly_price)).toBe(200)

    // ---- seed debtor B: started today, never paid → main roster, unpaid ----
    const { data: seeded, error: seedErr } = await admin
      .from('students')
      .insert({
        teacher_id: teacherId,
        name: 'طالب مستحق',
        monthly_price: 200,
        frequency: 'weekly',
        next_due_date: seedDue,
        starts_on: seedDue,
        schedule_overridden: false,
      })
      .select('id')
      .single()
    expect(seedErr).toBeNull()
    const bId = seeded!.id as string

    await page.goto(`${BASE_URL}/dashboard`)
    await expect(page.getByText('طالب مستحق')).toBeVisible({ timeout: 20000 })
    await expect(page.getByTestId('awaiting-start-toggle')).toBeHidden()
    await expect(page.getByTestId(`custom-schedule-${bId}`)).toBeHidden()

    // ---- add student A through the real dialog (phone optional, skip it) ----
    await page.getByRole('button', { name: 'إضافة طالب' }).click()
    await page.locator('#name').fill('طالب واجب')
    await page.getByRole('button', { name: 'إضافة', exact: true }).click()
    await page.waitForTimeout(500)
    await page.reload()

    const { data: aRow, error: aErr } = await admin
      .from('students')
      .select(STUDENT_COLS)
      .eq('teacher_id', teacherId)
      .eq('name', 'طالب واجب')
      .single()
    expect(aErr).toBeNull()
    const a = aRow as StudentRow

    // added with no explicit date → class schedule, starts next Monday
    expect(a.frequency).toBe('weekly')
    expect(a.schedule_overridden).toBe(false)
    expect(a.starts_on).toBe(startISO)
    expect(a.next_due_date).toBe(startISO)
    expect(Number(a.monthly_price)).toBe(200)

    // A is not started → collapsed awaiting section, not the main roster
    const toggle = page.getByTestId('awaiting-start-toggle')
    await expect(toggle).toBeVisible({ timeout: 20000 })
    await expect(toggle).toContainText('1')
    await toggle.click()
    await expect(page.getByText('طالب واجب')).toBeVisible()
    await expect(page.getByText('طالب مستحق')).toBeVisible() // B still in main roster

    // ---- mark-paid round trip on B (settle_cycle → reopen_cycle) ----
    await page.getByRole('button', { name: 'تحديد كمدفوع' }).click()
    await expect
      .poll(async () => (await paymentFor(bId, seedDue))?.paid, { timeout: 15000 })
      .toBe(true)
    await expect.poll(async () => (await fetchStudent(bId)).next_due_date, { timeout: 15000 }).toBe(settleNext)

    await expect(page.getByTestId(`undo-${bId}`)).toBeVisible({ timeout: 20000 })
    await page.getByTestId(`undo-${bId}`).click()
    await page.getByRole('button', { name: 'نعم، تراجع' }).click()
    await expect
      .poll(
        async () => {
          const [row, student] = [await paymentFor(bId, seedDue), await fetchStudent(bId)]
          return { paid: row?.paid ?? false, nextDue: student.next_due_date }
        },
        { timeout: 15000 },
      )
      .toEqual({ paid: false, nextDue: seedDue })
    await expect(page.getByTestId(`undo-${bId}`)).toBeHidden({ timeout: 10000 })

    // ---- class change weekly → monthly ----
    await page.goto(`${BASE_URL}/dashboard/settings`)
    const freqSelect = page.locator('#default_frequency')
    await expect(freqSelect).toHaveValue('weekly', { timeout: 15000 })
    await freqSelect.selectOption('monthly')
    await expect(page.locator('#default_weekday')).toBeHidden()
    await page.getByRole('button', { name: 'حفظ الجدول' }).click()
    await expect(page.getByText('تم تحديث الجدول')).toBeVisible({ timeout: 20000 })

    await expect
      .poll(async () => fetchTeacher(teacherId), { timeout: 15000 })
      .toMatchObject({ default_frequency: 'monthly', default_weekday: null })

    // A (awaiting, not a debtor): applied immediately — 1st of next month
    const aAfterChange = await fetchStudent(a.id)
    expect(aAfterChange.frequency).toBe('monthly')
    expect(aAfterChange.starts_on).toBe(firstNextMonth)
    expect(aAfterChange.next_due_date).toBe(firstNextMonth)
    expect(aAfterChange.pending_frequency).toBeNull()

    // B (owes the current cycle): old rhythm kept, new one deferred
    const bAfterChange = await fetchStudent(bId)
    expect(bAfterChange.frequency).toBe('weekly')
    expect(bAfterChange.next_due_date).toBe(seedDue)
    expect(bAfterChange.pending_frequency).toBe('monthly')
    expect(bAfterChange.pending_next_due).toBe(firstNextMonth)
    expect(bAfterChange.schedule_overridden).toBe(false)

    // A still lands in the awaiting section after the class change
    await page.goto(`${BASE_URL}/dashboard`)
    await expect(page.getByTestId('awaiting-start-toggle')).toBeVisible({ timeout: 20000 })
    await expect(page.getByTestId(`custom-schedule-${bId}`)).toBeHidden()

    // ---- custom +45d date on A → overridden + awaiting card on /pay ----
    await page.goto(`${BASE_URL}/dashboard/students/${a.id}`)
    await page.getByRole('button', { name: 'تعديل' }).nth(3).click()
    await page.getByTestId('profile-next-due').fill(plus45)
    await page.getByTestId('profile-next-due-save').click()
    await expect(page.getByTestId('profile-custom-schedule')).toBeVisible({ timeout: 20000 })

    const aCustom = await fetchStudent(a.id)
    expect(aCustom.schedule_overridden).toBe(true)
    expect(aCustom.starts_on).toBe(plus45)
    expect(aCustom.next_due_date).toBe(plus45)
    expect(aCustom.frequency).toBe('monthly')
    expect(aCustom.pending_frequency).toBeNull()

    await page.goto(`${BASE_URL}/pay?student=${a.id}`)
    await expect(page.getByTestId('awaiting-start')).toBeVisible({ timeout: 20000 })

    // ---- reset A → back to the class schedule (monthly, 1st) ----
    await page.goto(`${BASE_URL}/dashboard/students/${a.id}`)
    await expect(page.getByTestId('profile-reset-schedule')).toBeVisible({ timeout: 20000 })
    await page.getByTestId('profile-reset-schedule').click()
    await page.getByRole('button', { name: 'رجوع للجدول' }).click()
    await expect
      .poll(async () => fetchStudent(a.id), { timeout: 15000 })
      .toMatchObject({
        schedule_overridden: false,
        frequency: 'monthly',
        starts_on: firstNextMonth,
        next_due_date: firstNextMonth,
      })

    // reset kept A not-yet-started → still awaiting
    await page.goto(`${BASE_URL}/dashboard`)
    await expect(page.getByTestId('awaiting-start-toggle')).toBeVisible({ timeout: 20000 })

    // ---- custom PAST date on B (still owed) → overridden in main roster ----
    await page.goto(`${BASE_URL}/dashboard/students/${bId}`)
    await page.getByRole('button', { name: 'تعديل' }).nth(3).click()
    await page.getByTestId('profile-next-due').fill(customPast)
    await page.getByTestId('profile-next-due-save').click()
    await expect(page.getByTestId('profile-custom-schedule')).toBeVisible({ timeout: 20000 })

    const bCustom = await fetchStudent(bId)
    expect(bCustom.schedule_overridden).toBe(true)
    expect(bCustom.starts_on).toBe(customPast)
    expect(bCustom.next_due_date).toBe(customPast)
    expect(bCustom.frequency).toBe('weekly')
    // the deferred class change survives the custom date
    expect(bCustom.pending_frequency).toBe('monthly')
    expect(bCustom.pending_next_due).toBe(firstNextMonth)

    await page.goto(`${BASE_URL}/dashboard`)
    await expect(page.getByTestId(`custom-schedule-${bId}`)).toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('button', { name: 'تحديد كمدفوع' })).toBeVisible() // B still owes

    // ---- reset B blocked while owing: error toast, DB untouched ----
    await page.goto(`${BASE_URL}/dashboard/students/${bId}`)
    await expect(page.getByTestId('profile-reset-schedule')).toBeVisible({ timeout: 20000 })
    await page.getByTestId('profile-reset-schedule').click()
    await page.getByRole('button', { name: 'رجوع للجدول' }).click()
    // .first(): the text renders in the visible toast div AND Radix's
    // aria-live announcement span (role=status) — either proves the error fired.
    await expect(
      page.getByText('سدّد الدورة الحالية أولًا، ثم ارجع الطالب لجدول المجموعة').first(),
    ).toBeVisible({ timeout: 15000 })

    const bBlocked = await fetchStudent(bId)
    expect(bBlocked.schedule_overridden).toBe(true)
    expect(bBlocked.next_due_date).toBe(customPast)
    expect(bBlocked.frequency).toBe('weekly')

    // ---- settle the deferred debt → pending class schedule promoted ----
    // settle_cycle promotes pending_frequency once the last old-rhythm cycle
    // is paid: monthly rhythm + pending_next_due win, custom flag survives.
    await page.getByRole('button', { name: 'تحديد كمدفوع' }).click()
    await expect
      .poll(async () => (await paymentFor(bId, customPast))?.paid, { timeout: 15000 })
      .toBe(true)
    await expect
      .poll(async () => fetchStudent(bId), { timeout: 15000 })
      .toMatchObject({
        frequency: 'monthly',
        next_due_date: firstNextMonth,
        pending_frequency: null,
        pending_next_due: null,
        schedule_overridden: true,
      })
  } finally {
    await cleanup(uid)
  }
})
