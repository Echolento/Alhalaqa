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
import * as Sentry from '@sentry/nextjs'
import { requireUser } from '@/lib/action-context'
import { assertOwnsStudent } from '@/lib/ownership'
import {
  outstandingCycleKey,
  parseISODate,
} from '@/lib/billing-next'
import { billingState } from '@/lib/billing-state'
import { getInstaPayContract } from '@/lib/instapay'
import { buildReceiptUploadedPayload } from '@/lib/push-payloads'
import { getPushSubscription, sendPushNotification } from '@/lib/push'
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
  claimed_by: string | null
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
  try {
    const ctx = await requireUser()
    if ('error' in ctx) return ctx
    const { user, service } = ctx

    const fileCheck = validateProofFile({
      fileName: params.fileName,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
    })
    if (!fileCheck.ok) {
      Sentry.captureMessage('receipt upload rejected (validation)', {
        level: 'warning',
        tags: { area: 'receipt-upload', reason: 'validation' },
        extra: {
          studentId: params.studentId,
          fileName: params.fileName,
          mimeType: params.mimeType,
          sizeBytes: params.sizeBytes,
          rejection: fileCheck.error,
        },
      })
      return { error: fileCheck.error }
    }

    const { data: student } = await service
      .from('students')
      .select('id, teacher_id, name, frequency, monthly_price, next_due_date, claimed_by')
      .is('deleted_at', null)
      .eq('id', params.studentId)
      .maybeSingle()

    const s = student as StudentBillingRow | null
    if (!s) return { error: 'الطالب غير موجود' }

    // Upload gate (was missing): the caller must own the row — either the
    // teacher (ownership) or the claiming payer. Anyone else gets Forbidden
    // instead of injecting receipts into a stranger's review queue.
    const ownerTeacherId = await assertOwnsStudent(service, user.id, s.id)
    if (!ownerTeacherId && s.claimed_by !== user.id) {
      return { error: 'Forbidden' }
    }

    // Period key is server-computed from the OUTSTANDING next-due cycle —
    // never the wall clock, never trusted from the client.
    const periodKey = outstandingCycleKey(s)

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
    if (uploadError) {
      Sentry.captureException(new Error(`receipt storage upload failed: ${uploadError.message}`), {
        tags: { area: 'receipt-upload', reason: 'storage' },
        extra: {
          studentId: s.id,
          bucket: PAYMENT_PROOFS_BUCKET,
          storagePath,
          sizeBytes: params.sizeBytes,
          mimeType: fileCheck.normalizedMime,
        },
      })
      return { error: 'فشل رفع الإيصال — حاول مرة أخرى' }
    }

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

    if (insertError || !proof) {
      Sentry.captureException(new Error(`receipt proof insert failed: ${insertError?.message ?? 'no row'}`), {
        tags: { area: 'receipt-upload', reason: 'insert' },
        extra: { studentId: s.id, periodKey, storagePath },
      })
      // No orphan objects: the bytes just uploaded belong to no row.
      const { error: removeError } = await service.storage
        .from(PAYMENT_PROOFS_BUCKET)
        .remove([storagePath])
      if (removeError) {
        Sentry.captureException(
          new Error(`receipt orphan cleanup failed: ${removeError.message}`),
          {
            tags: { area: 'receipt-upload', reason: 'orphan' },
            extra: { studentId: s.id, storagePath },
          },
        )
      }
      return { error: 'فشل حفظ الإيصال — حاول مرة أخرى' }
    }

    // Liveness re-check after the insert: a delete racing the upload must not
    // leave a pending receipt (plus teacher push) on a trashed row. The
    // orphaned storage object is removed best-effort.
    const { data: live } = await service
      .from('students')
      .select('id')
      .is('deleted_at', null)
      .eq('id', s.id)
      .maybeSingle()
    if (!live) {
      await service.from('payment_proofs').delete().eq('id', (proof as { id: string }).id)
      const { error: removeError } = await service.storage
        .from(PAYMENT_PROOFS_BUCKET)
        .remove([storagePath])
      if (removeError) {
        Sentry.captureException(
          new Error(`receipt orphan cleanup failed: ${removeError.message}`),
          {
            tags: { area: 'receipt-upload', reason: 'orphan-liveness' },
            extra: { studentId: s.id, storagePath },
          },
        )
      }
      return { error: 'الطالب غير موجود' }
    }

    const proofId = (proof as { id: string }).id

    // Best-effort teacher push: proof is kept even when push is unavailable.
    // Final liveness gate: a delete racing the upload suppresses the push
    // (the receipt row itself was already verified live above).
    try {
      const { data: liveAgain } = await service
        .from('students')
        .select('id')
        .is('deleted_at', null)
        .eq('id', s.id)
        .maybeSingle()
      if (!liveAgain) return { success: true, proofId, periodKey, storagePath }

      const { data: teacher } = await service
        .from('teachers')
        .select('profile_id')
        .eq('id', s.teacher_id)
        .maybeSingle()

      const teacherProfileId = (teacher as { profile_id: string } | null)?.profile_id
      if (teacherProfileId) {
        const subscription = await getPushSubscription(service, teacherProfileId)

        if (subscription) {
          const target = buildReceiptUploadedPayload({
            teacherProfileId,
            studentName: s.name || 'طالب',
            receiptId: proofId,
          })
          await sendPushNotification(subscription, target.payload)
        }
      }
    } catch {
      // Push is advisory — ignore transport failures.
    }

    return { success: true, proofId, periodKey, storagePath }
  } catch (err) {
    // Anything unexpected (e.g. the Server Action body limit rejecting the
    // request, a missing service key) surfaces here — capture it so a "keeps
    // failing" upload is diagnosable instead of a silent generic toast.
    Sentry.captureException(err, {
      tags: { area: 'receipt-upload', reason: 'thrown' },
      extra: {
        studentId: params.studentId,
        fileName: params.fileName,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
      },
    })
    return { error: 'فشل رفع الإيصال — حاول مرة أخرى' }
  }
}

/**
 * Payer history: teacher-owners see every proof for the student;
 * everyone else sees only their own uploads (wrong-payer isolation).
 */
export async function listProofHistory(studentId: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  const { data: student } = await service
    .from('students')
    .select('id, teacher_id, frequency')
    .is('deleted_at', null)
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
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  const ownerTeacherId = await assertOwnsStudent(service, user.id, studentId)
  if (!ownerTeacherId) return { error: 'Forbidden' }

  const { data, error } = await service
    .from('payment_proofs')
    .select('id, student_id, period_key, storage_path, status, teacher_note, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }

  // Frequency travels with the proofs so callers can label periods correctly.
  const { data: studentRow } = await service
    .from('students')
    .select('frequency')
    .is('deleted_at', null)
    .eq('id', studentId)
    .maybeSingle()
  const frequency = ((studentRow as { frequency?: string | null } | null)?.frequency) || 'monthly'

  return { proofs: (data ?? []) as PaymentProof[], frequency }
}

/**
 * Pay-screen data: the OUTSTANDING next-due cycle at the per-cycle price +
 * teacher InstaPay contract via getInstaPayContract. Requires auth; the link
 * is shared with payers through the frozen /pay URL contract (see
 * payScreenUrl). Prepay model: next_due_date opens the period being paid for.
 */
export async function getPayScreenInfo(studentId: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  const { data: student } = await service
    .from('students')
    .select('id, teacher_id, name, frequency, monthly_price, next_due_date')
    .is('deleted_at', null)
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
  const contract = getInstaPayContract({
    instapay_link: t.instapay_link,
    instapay_handle: t.instapay_handle,
  })

  const ownerTeacherId = await assertOwnsStudent(service, user.id, studentId)

  // All payer-facing status comes from ONE billing-state call: the outstanding
  // cycle, whether it is paid / pending / overdue / reopened, and the
  // "previous period paid" reassurance. Proofs are scoped to the caller first
  // (wrong-payer isolation) so the state only sees what the caller may see.
  const proofQuery = service
    .from('payment_proofs')
    .select('period_key, status')
    .eq('student_id', studentId)
  const [{ data: rows }, { data: proofs }] = await Promise.all([
    service.from('student_payments').select('month, paid').eq('student_id', studentId),
    ownerTeacherId ? proofQuery : proofQuery.eq('payer_profile_id', user.id),
  ])

  const state = billingState({
    student: s,
    payments: ((rows ?? []) as { month: string; paid: boolean }[]).map((r) => ({
      month: String(r.month),
      paid: !!r.paid,
    })),
    proofs: ((proofs ?? []) as { period_key: string; status: string }[]).map((p) => ({
      period_key: String(p.period_key),
      status: String(p.status),
    })),
    today: new Date(),
  })

  return {
    studentId: s.id,
    studentName: s.name || 'طالب',
    periodKey: state.cycleKey,
    periodLabel: state.periodLabel,
    amount: effectivePrice,
    dueDate: parseISODate(state.dueISO).toISOString(),
    currency: t.currency || 'EGP',
    instapayLink: contract.instapayLink,
    instapayHandle: contract.instapayHandle,
    hasPending: state.isPending,
    isPaidForPeriod: state.isPaidForPeriod,
    isPaidUp: state.isSettled && !state.isPaidForPeriod,
    paidLastPeriod: state.paidLastPeriod,
  }
}
