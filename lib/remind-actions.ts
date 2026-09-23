'use server'

// lib/remind-actions.ts
// #32 slice 2/8 — teacher-side wrapper around the slice-1 trigger.
// IMPORTS ONLY from conflict lanes (never edits them):
//   triggerManualRemind (lib/push-triggers.ts) + logActivity.
// Manual path deliberately ignores the auto-reminders toggle (the trigger
// itself already does) — the button always sends when invoked.

import { triggerManualRemind } from '@/lib/push-triggers'
import { logActivity } from '@/lib/log-activity'
import { REMIND_COPY } from '@/lib/remind-copy'

export interface SendManualRemindParams {
  studentId: string
  studentName: string
  payerProfileId?: string | null
  amount?: number
  currency?: string
  periodKey?: string
}

export type SendManualRemindResult =
  | { success: true; testMode: false }
  | { success: false; reason: 'no_payer_yet'; testMode: true }
  | { success: false; reason: 'no_subscription' | 'send_failed' | string; testMode: false }
  | { success: false; error: string; testMode: false }

export async function sendManualRemind(
  params: SendManualRemindParams,
): Promise<SendManualRemindResult> {
  // Test path until payer identity lands: no payer linked yet → log + toast,
  // no push transport attempted.
  if (!params.payerProfileId) {
    await logActivity(
      {
        // 'manual_remind' lands in a later slice's ActionType union; cast keeps
        // this slice additive-only (no edits to shared types/log files).
        actionType: 'manual_remind' as never,
        entityType: 'student',
        entityId: params.studentId,
        details: {
          student_name: params.studentName,
          mode: 'test_no_payer',
          description: REMIND_COPY.remindLogTestMode(params.studentName),
        },
      } as never,
    )
    return { success: false, reason: 'no_payer_yet', testMode: true }
  }

  const result = (await triggerManualRemind({
    studentId: params.studentId,
    payerProfileId: params.payerProfileId,
    studentName: params.studentName,
    amount: params.amount,
    currency: params.currency,
    periodKey: params.periodKey,
  })) as { success?: boolean; reason?: string; error?: string }

  if (result.error) {
    return { success: false, error: result.error, testMode: false }
  }

  if (!result.success) {
    await logActivity(
      {
        actionType: 'manual_remind' as never,
        entityType: 'student',
        entityId: params.studentId,
        details: {
          student_name: params.studentName,
          reason: result.reason ?? 'send_failed',
          description: REMIND_COPY.remindLogManual(params.studentName),
        },
      } as never,
    )
    return { success: false, reason: result.reason ?? 'send_failed', testMode: false }
  }

  await logActivity(
    {
      actionType: 'manual_remind' as never,
      entityType: 'student',
      entityId: params.studentId,
      details: {
        student_name: params.studentName,
        description: REMIND_COPY.remindLogManual(params.studentName),
      },
    } as never,
  )
  return { success: true, testMode: false }
}
