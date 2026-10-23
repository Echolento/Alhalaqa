// lib/push-payloads.ts
// Pure push payload builders reused by the 4 V1 triggers (#29).
// No DB, no network — transport happens at the sendPushNotification boundary.

import { CURRENCY_CODE } from '@/lib/currency'

export const PUSH_URLS = {
  DASHBOARD: '/dashboard',
  PAYMENTS: '/dashboard/payments',
  UNPAID_QUEUE: '/dashboard/unpaid',
  PAY_SCREEN: '/pay',
} as const

export interface PushPayload {
  title: string
  body: string
  url: string
}

export interface PushTarget {
  profileId: string
  payload: PushPayload
}

export function payScreenUrl(studentId: string, periodKey?: string): string {
  const base = `${PUSH_URLS.PAY_SCREEN}?student=${encodeURIComponent(studentId)}`
  return periodKey ? `${base}&period=${encodeURIComponent(periodKey)}` : base
}

export function buildAutoDuePayload(params: {
  payerProfileId: string
  studentName: string
  amount?: number
  studentId: string
  periodKey?: string
  autoRemindersEnabled?: boolean
}): PushTarget | null {
  if (params.autoRemindersEnabled === false) return null
  const amountPart =
    params.amount !== undefined ? ` — ${params.amount} ${CURRENCY_CODE}` : ''
  return {
    profileId: params.payerProfileId,
    payload: {
      title: `تذكير بالدفع — ${params.studentName}`,
      body: `السلام عليكم، رسوم ${params.studentName} الشهرية${amountPart} مستحقة. ادفع وارفع الإيصال.`,
      url: payScreenUrl(params.studentId, params.periodKey),
    },
  }
}

export function buildManualRemindPayload(params: {
  payerProfileId: string
  studentName: string
  amount?: number
  studentId: string
  periodKey?: string
  autoRemindersEnabled?: boolean
}): PushTarget {
  const amountPart =
    params.amount !== undefined ? ` — ${params.amount} ${CURRENCY_CODE}` : ''
  return {
    profileId: params.payerProfileId,
    payload: {
      title: `تذكير من المعلم — ${params.studentName}`,
      body: `السلام عليكم، يذكركم المعلم بأن رسوم ${params.studentName}${amountPart} مستحقة. ادفع وارفع الإيصال.`,
      url: payScreenUrl(params.studentId, params.periodKey),
    },
  }
}

export function unpaidQueueItemUrl(receiptId: string): string {
  return `${PUSH_URLS.UNPAID_QUEUE}?receipt=${encodeURIComponent(receiptId)}`
}

export function buildReceiptUploadedPayload(params: {
  teacherProfileId: string
  studentName: string
  receiptId: string
}): PushTarget {
  return {
    profileId: params.teacherProfileId,
    payload: {
      title: `إيصال جديد — ${params.studentName}`,
      body: `${params.studentName} رفع إيصال دفع جديد. اضغط للمراجعة والتحقق.`,
      url: unpaidQueueItemUrl(params.receiptId),
    },
  }
}

export function buildVerdictPayload(params: {
  payerProfileId: string
  studentName: string
  verified: boolean
  note?: string
  studentId: string
  periodKey?: string
}): PushTarget {
  return {
    profileId: params.payerProfileId,
    payload: params.verified
      ? {
          title: `تم قبول الدفع — ${params.studentName}`,
          body: `تم التحقق من إيصال ${params.studentName} وتسجيل الدفعة. جزاكم الله خيراً.`,
          url: payScreenUrl(params.studentId, params.periodKey),
        }
      : {
          title: `يحتاج الإيصال إلى مراجعة — ${params.studentName}`,
          body: params.note
            ? `قال المعلم: "${params.note}" — ${params.studentName}.`
            : `لم يتم قبول إيصال ${params.studentName}. يرجى رفع إيصال أوضح.`,
          url: payScreenUrl(params.studentId, params.periodKey),
        },
  }
}

/**
 * Escalation (overdue day 3+, daily): the payer kept getting nags, now the
 * teacher gets told too. Toggle is dead — automation always on.
 */
export function buildOverdueEscalationPayload(params: {
  teacherProfileId: string
  overdue: Array<{ name: string; daysOverdue: number }>
}): PushTarget | null {
  if (params.overdue.length === 0) return null
  const bits = params.overdue.slice(0, 3).map((o) => `${o.name} (${o.daysOverdue} أيام)`)
  const remaining = params.overdue.length - 3
  const body =
    remaining > 0
      ? `${bits.join('، ')} +${remaining} آخرين — التذكير اليومي لم يكفِ`
      : `${bits.join('، ')} — التذكير اليومي لم يكفِ`
  return {
    profileId: params.teacherProfileId,
    payload: {
      title: `متأخرات تحتاج تدخلك — ${params.overdue.length}`,
      body,
      url: PUSH_URLS.DASHBOARD,
    },
  }
}

/**
 * Daily teacher digest (08:00 Cairo): overdue + pending receipts + unreachable
 * (unclaimed) counts. Counts only, one item per line, ordered by urgency — a
 * scannable summary rather than a run-on name list.
 */
export function buildDailyDigestPayload(params: {
  teacherProfileId: string
  pendingCount: number
  overdueCount: number
  unclaimedCount: number
}): PushTarget | null {
  if (
    params.pendingCount === 0 &&
    params.overdueCount === 0 &&
    params.unclaimedCount === 0
  ) {
    return null
  }
  const lines: string[] = []
  if (params.overdueCount > 0) lines.push(`متأخرون عن الدفع: ${params.overdueCount}`)
  if (params.pendingCount > 0) lines.push(`بانتظار مراجعتك: ${params.pendingCount}`)
  if (params.unclaimedCount > 0) lines.push(`بلا ولي أمر: ${params.unclaimedCount}`)
  return {
    profileId: params.teacherProfileId,
    payload: {
      title: 'متابعة اليوم',
      body: lines.join('\n'),
      url: PUSH_URLS.UNPAID_QUEUE,
    },
  }
}

export function buildTeacherDigestPayload(params: {
  teacherProfileId: string
  overdueNames: string[]
  autoRemindersEnabled?: boolean
}): PushTarget | null {
  if (params.autoRemindersEnabled === false) return null
  const names = params.overdueNames.slice(0, 3).join('، ')
  const remaining = params.overdueNames.length - 3
  const summary =
    remaining > 0 ? `${names} +${remaining} آخرين لم يدفعوا بعد` : `${names} لم يدفعوا بعد`
  return {
    profileId: params.teacherProfileId,
    payload: {
      title: `تذكير بالدفع — ${params.overdueNames.length} طالب`,
      body: summary,
      url: PUSH_URLS.DASHBOARD,
    },
  }
}
