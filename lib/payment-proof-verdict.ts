'use server'

// lib/payment-proof-verdict.ts
// #34 slice 6/8 — teacher one-tap Verify / Reject for payer receipt proofs.
// IMPORTS ONLY from conflict lanes (never edits them):
//   buildVerdictPayload (lib/push-payloads.ts, frozen /pay URL contract) +
//   sendPushNotification boundary (lib/push.ts, mocked in tests) +
//   logActivity (lib/log-activity.ts) +
//   getTeacherProofQueue (used by the /dashboard/unpaid route, not here).
// Server-writes-only posture (#25 / 030): every write goes through the
// service-role client with explicit ownership checks via assertOwnsStudent.
//
// Atomicity note (V1): proof-status flip + student_payments upsert run as
// sequential service writes; push + activity log are best-effort advisories
// (proof is kept even when push is unavailable, mirroring uploadPaymentProof).
// A true single-transaction RPC is a follow-up — see gaps in the slice report.

import { createServiceClient } from '@/lib/supabase/service'
import { requireUser } from '@/lib/action-context'
import { assertOwnsStudent, getOwnTeacherId } from '@/lib/ownership'
import { buildVerdictPayload } from '@/lib/push-payloads'
import { sendPushNotification } from '@/lib/push'
import { logActivity } from '@/lib/log-activity'
import { PAYMENT_PROOFS_BUCKET } from '@/lib/payment-proof-validation'
import { describePeriod } from '@/lib/period-label'
import { nextDueAfterSettle } from '@/lib/billing-cycle'
import { revalidatePath } from 'next/cache'

interface ProofRow {
  id: string
  student_id: string
  teacher_id: string
  payer_profile_id: string
  period_key: string
  storage_path: string
  status: 'pending' | 'verified' | 'rejected' | 'undone'
  teacher_note: string | null
}

interface StudentPriceRow {
  id: string
  name: string | null
  monthly_price: number | null
  frequency?: unknown
  next_due_date?: string | null
  teacher_id?: string
}

interface TeacherPriceRow {
  id: string
  default_monthly_price: number | null
}

async function fetchProof(service: ReturnType<typeof createServiceClient>, proofId: string) {
  const { data } = await service
    .from('payment_proofs')
    .select('id, student_id, teacher_id, payer_profile_id, period_key, storage_path, status, teacher_note')
    .eq('id', proofId)
    .maybeSingle()
  return (data ?? null) as ProofRow | null
}

async function notifyPayer(params: {
  service: ReturnType<typeof createServiceClient>
  payerProfileId: string
  studentName: string
  studentId: string
  periodKey: string
  verified: boolean
  note?: string
}) {
  // Best-effort: a missing subscription or transport failure never fails
  // the verdict itself (mirrors the upload slice's push posture).
  try {
    const { data: subscription } = await params.service
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('profile_id', params.payerProfileId)
      .maybeSingle()
    if (!subscription) return { pushed: false, reason: 'no_subscription' as const }
    const target = buildVerdictPayload({
      payerProfileId: params.payerProfileId,
      studentName: params.studentName,
      verified: params.verified,
      note: params.note,
      studentId: params.studentId,
      periodKey: params.periodKey,
    })
    const sent = await sendPushNotification(
      subscription as { endpoint: string; p256dh: string; auth: string },
      target.payload,
    )
    return { pushed: !!sent }
  } catch {
    return { pushed: false, reason: 'send_failed' as const }
  }
}

/**
 * One-tap Verify: proof -> verified + period row -> paid + activity log +
 * payer verdict push. Idempotent: a second call for an already-verified
 * proof returns { success: true, idempotent: true } with no further writes
 * and no duplicate push.
 */
export async function verifyProof(proofId: string, teacherNote?: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  const proof = await fetchProof(service, proofId)
  if (!proof) return { error: 'الإيصال غير موجود' }

  const ownerTeacherId = await assertOwnsStudent(service, user.id, proof.student_id)
  if (!ownerTeacherId || ownerTeacherId !== proof.teacher_id) {
    return { error: 'Forbidden' }
  }

  if (proof.status === 'verified') {
    return { success: true as const, idempotent: true as const, proofId: proof.id }
  }
  // Only a pending receipt may flip to verified. A rejected or undone one
  // stays as the teacher left it — the payer re-uploads for a fresh review.
  if (proof.status !== 'pending') {
    return { error: 'الإيصال غير قابل للتحقق بهذه الحالة — اطلب إيصالًا جديدًا' }
  }

  const [{ data: student }, { data: teacher }] = await Promise.all([
    service
      .from('students')
      .select('id, name, monthly_price, frequency, next_due_date')
      .is('deleted_at', null)
      .eq('id', proof.student_id)
      .maybeSingle(),
    service
      .from('teachers')
      .select('id, default_monthly_price')
      .eq('id', proof.teacher_id)
      .maybeSingle(),
  ])

  const s = (student ?? null) as StudentPriceRow | null
  const t = (teacher ?? null) as TeacherPriceRow | null
  // A receipt for a missing or soft-deleted student settles nothing: no
  // fallback defaults, no ledger write, no push — fail loudly instead.
  if (!s) return { error: 'الطالب غير موجود' }
  const studentName = s.name || 'طالب'
  const effectiveAmount = Number(s.monthly_price) || Number(t?.default_monthly_price) || 0
  // Atomic settlement: proof -> verified, payment row -> paid, next_due
  // advanced (or left alone) in ONE transaction via the settle_cycle RPC. The
  // ratchet decision stays pure (nextDueAfterSettle); push + activity are
  // advisory and follow.
  const nextDue = nextDueAfterSettle(
    proof.period_key,
    s.frequency,
    s.next_due_date,
  )

  const { error: settleError } = await service.rpc('settle_cycle', {
    p_student_id: proof.student_id,
    p_cycle_key: proof.period_key,
    p_amount: effectiveAmount,
    p_next_due: nextDue,
    p_proof_id: proof.id,
    p_teacher_note: teacherNote?.trim() ? teacherNote.trim() : null,
  })
  if (settleError) {
    // A delete racing the tap: the RPC refused a trashed row — report it as
    // missing, with no log and no push on this path.
    if (String(settleError.message).includes('student_deleted')) {
      return { error: 'الطالب غير موجود' }
    }
    // A concurrent verify won first: the proof is verified now — report the
    // idempotent outcome instead of an error. Re-validate ownership so a
    // future transfer model cannot launder a foreign verify into success.
    if (String(settleError.message).includes('proof_not_pending')) {
      const again = await fetchProof(service, proof.id)
      const stillOwner =
        again && (await assertOwnsStudent(service, user.id, again.student_id)) === proof.teacher_id
      if (again?.status === 'verified' && stillOwner) {
        return { success: true as const, idempotent: true as const, proofId: proof.id }
      }
      return { error: 'الإيصال غير قابل للتحقق بهذه الحالة — اطلب إيصالًا جديدًا' }
    }
    return { error: settleError.message }
  }

  await logActivity(
    {
      actionType: 'proof_verified',
      entityType: 'payment_proof',
      entityId: proof.id,
      details: {
        student_name: studentName,
        student_id: proof.student_id,
        period_key: proof.period_key,
        amount: effectiveAmount,
        description: `تحقق من إيصال — ${studentName}`,
      },
    },
    user.id,
  )

  await notifyPayer({
    service,
    payerProfileId: proof.payer_profile_id,
    studentName,
    studentId: proof.student_id,
    periodKey: proof.period_key,
    verified: true,
  })

  revalidatePath('/dashboard/unpaid')
  revalidatePath('/dashboard')
  return {
    success: true as const,
    proofId: proof.id,
    periodKey: proof.period_key,
    amount: effectiveAmount,
  }
}

/**
 * Reject: proof -> rejected (note REQUIRED), period row left unpaid,
 * payer still notified with the teacher note. Idempotent on double-reject.
 */
export async function rejectProof(proofId: string, teacherNote: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  const note = (teacherNote ?? '').trim()
  if (!note) return { error: 'سبب الرفض مطلوب — اكتب ملاحظة لولي الأمر.' }

  const proof = await fetchProof(service, proofId)
  if (!proof) return { error: 'الإيصال غير موجود' }

  const ownerTeacherId = await assertOwnsStudent(service, user.id, proof.student_id)
  if (!ownerTeacherId || ownerTeacherId !== proof.teacher_id) {
    return { error: 'Forbidden' }
  }

  if (proof.status === 'rejected') {
    return { success: true as const, idempotent: true as const, proofId: proof.id }
  }
  // Only a pending receipt may be rejected. A verified one is settled ledger
  // — undo the payment instead of flipping the proof under it. An undone one
  // is already out of the queue.
  if (proof.status !== 'pending') {
    return {
      error:
        proof.status === 'verified'
          ? 'الإيصال تم التحقق منه وقيده مدفوع — استخدم التراجع عن الدفع بدل الرفض'
          : 'الإيصال غير قابل للرفض بهذه الحالة',
    }
  }

  // Atomic reject: liveness + pending-only enforced inside the RPC, so a
  // delete or verify racing the tap cannot flip, log, or push for a row
  // that is no longer pending on a live student.
  const { error: rejectError } = await service.rpc('reject_proof', {
    p_proof_id: proof.id,
    p_teacher_note: note,
  })
  if (rejectError) {
    const msg = String(rejectError.message)
    if (msg.includes('student_deleted')) return { error: 'الطالب غير موجود' }
    if (msg.includes('proof_not_pending')) {
      const again = await fetchProof(service, proof.id)
      if (again?.status === 'rejected') {
        return { success: true as const, idempotent: true as const, proofId: proof.id }
      }
      return {
        error:
          again?.status === 'verified'
            ? 'الإيصال تم التحقق منه وقيده مدفوع — استخدم التراجع عن الدفع بدل الرفض'
            : 'الإيصال غير قابل للرفض بهذه الحالة',
      }
    }
    return { error: rejectError.message }
  }

  // Intentionally NO student_payments write: the period stays unpaid.

  const { data: student } = await service
    .from('students')
    .select('id, name')
    .is('deleted_at', null)
    .eq('id', proof.student_id)
    .maybeSingle()
  const studentName = ((student as { name?: string | null } | null)?.name || 'طالب') as string

  await logActivity(
    {
      actionType: 'proof_rejected',
      entityType: 'payment_proof',
      entityId: proof.id,
      details: {
        student_name: studentName,
        student_id: proof.student_id,
        period_key: proof.period_key,
        note,
        description: `رفض إيصال — ${studentName}`,
      },
    },
    user.id,
  )

  await notifyPayer({
    service,
    payerProfileId: proof.payer_profile_id,
    studentName,
    studentId: proof.student_id,
    periodKey: proof.period_key,
    verified: false,
    note,
  })

  revalidatePath('/dashboard/unpaid')
  revalidatePath('/dashboard')
  return { success: true as const, proofId: proof.id, periodKey: proof.period_key }
}

export interface UnpaidQueueItem {
  id: string
  studentId: string
  studentName: string
  periodKey: string
  /** Teacher-facing human label (month, batch + range, or week range). */
  periodLabel: string
  /** Student billing frequency — lets labels stay correct without re-derivation. */
  frequency?: string
  storagePath: string
  imageUrl: string | null
  status: 'pending'
  teacherNote: string | null
  createdAt: string
}

/**
 * Teacher-global pending queue for /dashboard/unpaid. Returns pending
 * proofs with student names + short-lived screenshot URLs (private bucket
 * is service-role only, so URLs are signed here, never exposed raw).
 */
export async function getUnpaidQueue() {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx
  const ownTeacherId = await getOwnTeacherId(service, user.id)
  if (!ownTeacherId) return { error: 'Forbidden' }

  const { data, error } = await service
    .from('payment_proofs')
    .select(
      'id, student_id, period_key, storage_path, status, teacher_note, created_at',
    )
    .eq('teacher_id', ownTeacherId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return { error: (error as { message: string }).message }
  const proofs = ((data ?? []) as Array<Record<string, unknown>>) ?? []

  const studentIds = Array.from(
    new Set(proofs.map((p) => p['student_id']).filter(Boolean)),
  ) as string[]
  let nameById = new Map<string, string>()
  let frequencyById = new Map<string, string>()
  if (studentIds.length > 0) {
    const { data: students } = await service
      .from('students')
      .select('id, name, frequency')
      .is('deleted_at', null)
      .in('id', studentIds)
    for (const s of ((students ?? []) as Array<{ id: string; name: string | null; frequency?: string | null }>) ?? []) {
      nameById.set(s.id, s.name || 'طالب')
      frequencyById.set(s.id, s.frequency || 'monthly')
    }
  }

  const items: UnpaidQueueItem[] = []
  for (const p of proofs) {
    // A receipt whose student vanished from the live-student map (deleted)
    // stays out of the queue — the row survives as history, not as work.
    if (!nameById.has(String(p['student_id']))) continue
    const storagePath = String(p['storage_path'] ?? '')
    let imageUrl: string | null = null
    try {
      const { data: signed } = await service.storage
        .from(PAYMENT_PROOFS_BUCKET)
        .createSignedUrl(storagePath, 3600)
      imageUrl = ((signed as { signedUrl?: string } | null)?.signedUrl ?? null) as string | null
    } catch {
      imageUrl = null
    }
    items.push({
      id: String(p['id']),
      studentId: String(p['student_id']),
      studentName: nameById.get(String(p['student_id'])) ?? 'طالب',
      periodKey: String(p['period_key']),
      periodLabel: describePeriod(
        String(p['period_key']),
        (frequencyById.get(String(p['student_id'])) ?? 'monthly') as 'weekly' | 'biweekly' | 'monthly',
      ).teacherLabel,
      frequency: frequencyById.get(String(p['student_id'])) ?? 'monthly',
      storagePath,
      imageUrl,
      status: 'pending',
      teacherNote: (p['teacher_note'] as string | null) ?? null,
      createdAt: String(p['created_at'] ?? ''),
    })
  }
  return { items }
}

/**
 * Single-receipt deep-link for /dashboard/unpaid?receipt=<id> (frozen URL
 * from unpaidQueueItemUrl). Ownership-checked; wrong teacher => Forbidden.
 */
export async function getProofReceipt(proofId: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx
  const proof = await fetchProof(service, proofId)
  if (!proof) return { error: 'الإيصال غير موجود' }

  const ownerTeacherId = await assertOwnsStudent(service, user.id, proof.student_id)
  if (!ownerTeacherId || ownerTeacherId !== proof.teacher_id) {
    return { error: 'Forbidden' }
  }

  const { data: student } = await service
    .from('students')
    .select('id, name, frequency')
    .is('deleted_at', null)
    .eq('id', proof.student_id)
    .maybeSingle()
  const studentName = ((student as { name?: string | null } | null)?.name || 'طالب') as string
  const frequency = ((student as { frequency?: string | null } | null)?.frequency) || 'monthly'

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
    proof: { ...proof, studentName, imageUrl, frequency },
  }
}
