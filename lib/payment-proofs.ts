'use server'

// lib/payment-proofs.ts
// Payer receipt-proof upload + history (#33 slice 5/8).
// Server-writes-only posture (#25 / 030): every write goes through the
// service-role client with explicit ownership checks; no anon writes.
// Push on upload follows the slice-1 trigger pattern (service-role +
// subscription lookup + sendPushNotification boundary, mocked in tests —
// never real delivery) and deep-links via the frozen queue-item URL
// contract buildReceiptUploadedPayload from lib/push-payloads.ts.

import { describePeriod } from '@/lib/period-label'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { assertOwnsStudent } from '@/lib/ownership'
import { normalizeFrequency } from '@/lib/billing-period'
import {
  duePeriodKey,
  firstOfNextMonth,
  parseISODate,
} from '@/lib/billing-next'
import { getInstaPayContract } from '@/lib/instapay'
import { buildReceiptUploadedPayload } from '@/lib/push-payloads'
import { sendPushNotification } from '@/lib/push'
import {
  PAYMENT_PROOFS_BUCKET,
  PROOF_HISTORY_LIMIT,
  validateProofFile,
  buildProofStoragePath,
  type PaymentProof,
} from '@/lib/payment-proof-validation'

export type { PaymentProof }

interface StudentBillingRow {
  id: string
  teacher_id: string
  name: string | null
  frequency: unknown
  monthly_price: number | null
  next_due_date: string | null
}

/** Outstanding cycle due date; legacy rows without one bill the 1st of next month. */
function outstandingDueISO(s: Pick<StudentBillingRow, 'next_due_date'>): string {
  return s.next_due_date ?? firstOfNextMonth()
}

interface TeacherBillingRow {
  id: string
  profile_id: string
  currency: string | null
  default_monthly_price: number | null
  instapay_link: string | null
  instapay_handle: string | null
}

export async function uploadPaymentProof(params: {
  studentId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  fileBytes: Uint8Array | Buffer
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const fileCheck = validateProofFile({
    fileName: params.fileName,
    mimeType: params.mimeType,
    sizeBytes: params.sizeBytes,
  })
  if (!fileCheck.ok) return { error: fileCheck.error }

  const service = createServiceClient()

  const { data: student } = await service
    .from('students')
    .select('id, teacher_id, name, frequency, monthly_price, next_due_date')
    .eq('id', params.studentId)
    .maybeSingle()

  const s = student as StudentBillingRow | null
  if (!s) return { error: 'الطالب غير موجود' }

  // Period key is server-computed from the OUTSTANDING next-due cycle —
  // never the wall clock, never trusted from the client.
  const periodKey = duePeriodKey(outstandingDueISO(s), normalizeFrequency(s.frequency))

  const storagePath = buildProofStoragePath({
    teacherId: s.teacher_id,
    studentId: s.id,
    periodKey,
    fileName: params.fileName,
  })

  const { error: uploadError } = await service.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .upload(storagePath, params.fileBytes, {
      contentType: fileCheck.normalizedMime,
      upsert: false,
    })
  if (uploadError) return { error: 'فشل رفع الإيصال — حاول مرة أخرى' }

  const { data: proof, error: insertError } = await service
    .from('payment_proofs')
    .insert({
      student_id: s.id,
      teacher_id: s.teacher_id,
      payer_profile_id: user.id,
      period_key: periodKey,
      storage_path: storagePath,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !proof) return { error: 'فشل حفظ الإيصال — حاول مرة أخرى' }

  const proofId = (proof as { id: string }).id

  // Best-effort teacher push: proof is kept even when push is unavailable.
  try {
    const { data: teacher } = await service
      .from('teachers')
      .select('profile_id')
      .eq('id', s.teacher_id)
      .maybeSingle()

    const teacherProfileId = (teacher as { profile_id: string } | null)?.profile_id
    if (teacherProfileId) {
      const { data: subscription } = await service
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('profile_id', teacherProfileId)
        .maybeSingle()

      if (subscription) {
        const target = buildReceiptUploadedPayload({
          teacherProfileId,
          studentName: s.name || 'طالب',
          receiptId: proofId,
        })
        await sendPushNotification(
          subscription as { endpoint: string; p256dh: string; auth: string },
          target.payload,
        )
      }
    }
  } catch {
    // Push is advisory — ignore transport failures.
  }

  return { success: true, proofId, periodKey, storagePath }
}

/**
 * Payer history: teacher-owners see every proof for the student;
 * everyone else sees only their own uploads (wrong-payer isolation).
 */
export async function listProofHistory(studentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const service = createServiceClient()

  const { data: student } = await service
    .from('students')
    .select('id, teacher_id, frequency')
    .eq('id', studentId)
    .maybeSingle()
  if (!student) return { error: 'الطالب غير موجود' }

  const frequency = (student as { frequency?: string | null }).frequency ?? 'monthly'

  const ownerTeacherId = await assertOwnsStudent(service, user.id, studentId)

  const base = service
    .from('payment_proofs')
    .select('id, student_id, period_key, storage_path, status, teacher_note, created_at')
    .eq('student_id', studentId)

  const { data, error } = ownerTeacherId
    ? await base.limit(PROOF_HISTORY_LIMIT).order('created_at', { ascending: false })
    : await base
        .eq('payer_profile_id', user.id)
        .limit(PROOF_HISTORY_LIMIT)
        .order('created_at', { ascending: false })

  if (error) return { error: error.message }

  // Signed view URLs so the log opens full receipts (1h expiry, service-side),
  // plus human period labels (month / batch / week — never raw keys).
  const proofs = (data ?? []) as PaymentProof[]
  const withUrls = await Promise.all(
    proofs.map(async (proof) => {
      let imageUrl: string | null = null
      try {
        const { data: signed } = await service.storage
          .from(PAYMENT_PROOFS_BUCKET)
          .createSignedUrl(proof.storage_path, 3600)
        imageUrl = ((signed as { signedUrl?: string } | null)?.signedUrl ?? null) as string | null
      } catch {
        imageUrl = null
      }
      return {
        ...proof,
        imageUrl,
        periodLabel: describePeriod(
          proof.period_key,
          frequency as 'weekly' | 'biweekly' | 'monthly',
        ).payerLabel,
      }
    }),
  )
  return { proofs: withUrls }
}

/** Teacher-only queue read. Wrong teacher => Forbidden. */
export async function getTeacherProofQueue(studentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const service = createServiceClient()

  const ownerTeacherId = await assertOwnsStudent(service, user.id, studentId)
  if (!ownerTeacherId) return { error: 'Forbidden' }

  const { data, error } = await service
    .from('payment_proofs')
    .select('id, student_id, period_key, storage_path, status, teacher_note, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { proofs: (data ?? []) as PaymentProof[] }
}

/**
 * Pay-screen data: the OUTSTANDING next-due cycle at the per-cycle price +
 * teacher InstaPay contract via getInstaPayContract. Requires auth; the link
 * is shared with payers through the frozen /pay URL contract (see
 * payScreenUrl). Prepay model: next_due_date opens the period being paid for.
 */
export async function getPayScreenInfo(studentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const service = createServiceClient()

  const { data: student } = await service
    .from('students')
    .select('id, teacher_id, name, frequency, monthly_price, next_due_date')
    .eq('id', studentId)
    .maybeSingle()

  const s = student as StudentBillingRow | null
  if (!s) return { error: 'الطالب غير موجود' }

  const { data: teacher } = await service
    .from('teachers')
    .select('id, profile_id, currency, default_monthly_price, instapay_link, instapay_handle')
    .eq('id', s.teacher_id)
    .maybeSingle()

  const t = teacher as TeacherBillingRow | null
  if (!t) return { error: 'الطالب غير موجود' }

  const effectivePrice = Number(s.monthly_price) || Number(t.default_monthly_price) || 0
  const freq = normalizeFrequency(s.frequency)
  const dueISO = outstandingDueISO(s)
  const periodKey = duePeriodKey(dueISO, freq)
  const contract = getInstaPayContract({
    instapay_link: t.instapay_link,
    instapay_handle: t.instapay_handle,
  })

  const ownerTeacherId = await assertOwnsStudent(service, user.id, studentId)
  const pendingQuery = service
    .from('payment_proofs')
    .select('id')
    .eq('student_id', studentId)
    .eq('period_key', periodKey)
    .eq('status', 'pending')

  const { data: pending } = ownerTeacherId
    ? await pendingQuery.maybeSingle()
    : await pendingQuery.eq('payer_profile_id', user.id).maybeSingle()

  const { data: paidRow } = await service
    .from('student_payments')
    .select('id')
    .eq('student_id', studentId)
    .eq('month', periodKey)
    .eq('paid', true)
    .maybeSingle()

  return {
    studentId: s.id,
    studentName: s.name || 'طالب',
    periodKey,
    periodLabel: describePeriod(periodKey, s.frequency as 'weekly' | 'biweekly' | 'monthly' | null).payerLabel,
    amount: effectivePrice,
    dueDate: parseISODate(dueISO).toISOString(),
    currency: t.currency || 'EGP',
    instapayLink: contract.instapayLink,
    instapayHandle: contract.instapayHandle,
    hasPending: !!pending,
    isPaidForPeriod: !!paidRow,
  }
}
