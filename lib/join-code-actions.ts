'use server'

// lib/join-code-actions.ts
// Teacher-facing join-code actions. The code is minted lazily on first read and
// rotatable on demand. Rotation replaces ONLY the code row: existing claims
// (students.claimed_by) and invite links (claim_tokens) are untouched, so
// parents who already onboarded keep working.

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/action-context'
import { getOwnTeacherId } from '@/lib/ownership'
import { ensureJoinCode, rotateJoinCode } from '@/lib/join-code-store'
import { logActivity } from '@/lib/log-activity'

/** Return the caller's teacher code, minting one on first use. */
export async function getMyJoinCode() {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx

  const teacherId = await getOwnTeacherId(ctx.service, ctx.user.id)
  if (!teacherId) return { error: 'Forbidden' }

  try {
    return { code: await ensureJoinCode(ctx.service, teacherId) }
  } catch {
    return { error: 'تعذر تحميل الكود — حاول مرة أخرى' }
  }
}

/** Rotate the caller's code. Old code stops working; existing claims remain. */
export async function regenerateMyJoinCode() {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx

  const teacherId = await getOwnTeacherId(ctx.service, ctx.user.id)
  if (!teacherId) return { error: 'Forbidden' }

  let code: string
  try {
    code = await rotateJoinCode(ctx.service, teacherId)
  } catch {
    return { error: 'تعذر تغيير الكود — حاول مرة أخرى' }
  }

  // The code is already rotated at this point. logActivity is best-effort and
  // never rejects, so a logging failure cannot turn success into an error.
  await logActivity(
    {
      actionType: 'join_code_rotated',
      entityType: 'teacher',
      entityId: teacherId,
      details: { description: 'تغيير كود الانضمام' },
    },
    ctx.user.id,
  )

  revalidatePath('/dashboard')
  return { code }
}
