// lib/push-payloads.ts
// Pure push payload builders reused by the 4 V1 triggers (#29).
// No DB, no network — transport happens at the sendPushNotification boundary.

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
  currency?: string
  studentId: string
  periodKey?: string
  autoRemindersEnabled?: boolean
}): PushTarget | null {
  if (params.autoRemindersEnabled === false) return null
  const amountPart =
    params.amount !== undefined
      ? ` — ${params.amount}${params.currency ? ` ${params.currency}` : ''}`
      : ''
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
  currency?: string
  studentId: string
  periodKey?: string
  autoRemindersEnabled?: boolean
}): PushTarget {
  const amountPart =
    params.amount !== undefined
      ? ` — ${params.amount}${params.currency ? ` ${params.currency}` : ''}`
      : ''
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
          body: `لم يتم قبول إيصال ${params.studentName}.${params.note ? ` ${params.note}` : ''} يرجى رفع إيصال أوضح.`,
          url: payScreenUrl(params.studentId, params.periodKey),
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
