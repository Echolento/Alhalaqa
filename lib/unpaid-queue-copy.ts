// lib/unpaid-queue-copy.ts
// #34 slice 6/8 — SINGLE SOURCE OF TRUTH for Unpaid verify-queue Arabic copy.
// HITL: a human (Arabic speaker) must review every string below before merge.
// UI (components/unpaid/*) and verdict toasts MUST import from here —
// no hardcoded duplicates elsewhere in this slice.

export const UNPAID_COPY = {
  // ——— Page / queue header ———
  pageTitle: 'الإيصالات المعلقة',
  queueTitle: 'قائمة المراجعة',
  // Must state both halves of the contract: verifying marks the period paid
  // AND notifies the payer. Shown at the top of /dashboard/unpaid (RTL).
  queueHeaderNote:
    'التحقق من الإيصال يسجّل الفترة مدفوعة ويُرسل إشعاراً لولي الأمر.',
  queueCount: (n: number) => `${n} إيصال معلق`,
  highlightHint: 'إيصال مميز من الإشعار',

  // ——— Empty / error states ———
  emptyQueue: 'لا توجد إيصالات معلقة — جميع المدفوعات مُتحقق منها.',
  loadError: 'تعذر تحميل قائمة الإيصالات — حاول مرة أخرى.',
  unauthorized: 'سجّل الدخول أولاً لمراجعة الإيصالات.',
  forbidden: 'ليس لديك صلاحية مراجعة هذا الإيصال.',

  // ——— One-tap Verify ———
  verifyButtonLabel: 'تحقق',
  verifyingLabel: 'جارٍ التحقق…',
  verifyAriaLabel: (studentName: string) => `تحقق من إيصال ${studentName}`,
  verifySuccessTitle: 'تم التحقق',
  verifySuccessDescription: (studentName: string) =>
    `تم تسجيل دفعة ${studentName} وإشعار ولي الأمر.`,

  // ——— Reject (note required) ———
  rejectButtonLabel: 'رفض',
  rejectingLabel: 'جارٍ الرفض…',
  rejectAriaLabel: (studentName: string) => `رفض إيصال ${studentName}`,
  notePlaceholder: 'سبب الرفض (مطلوب) — مثال: الصورة غير واضحة',
  noteRequiredError: 'سبب الرفض مطلوب — اكتب ملاحظة لولي الأمر.',
  rejectSuccessTitle: 'تم رفض الإيصال',
  rejectSuccessDescription: (studentName: string) =>
    `بقيت فترة ${studentName} غير مدفوعة وتم إشعار ولي الأمر بالسبب.`,

  // ——— Card meta ———
  periodLabel: 'الفترة',
  uploadedAtLabel: 'رُفع',
  receiptAlt: (studentName: string) => `إيصال ${studentName}`,
  statusPending: 'قيد المراجعة',
} as const

export type UnpaidCopy = typeof UNPAID_COPY
