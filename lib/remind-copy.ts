// lib/remind-copy.ts
// #32 slice 2/8 — SINGLE SOURCE OF TRUTH for every user-facing Arabic string
// introduced by this slice (Remind button + payer-phone clarity + invite copy
// + WhatsApp share). HITL: human must approve wording before merge.
// UI components and lib/whatsapp-share.ts MUST import from here — no hardcoded
// duplicates elsewhere in this slice.

export const REMIND_COPY = {
  // ——— Student form: payer phone field ———
  payerPhoneLabel: 'رقم واتساب ولي الأمر',
  payerPhoneHelper:
    'يستقبل هذا الرقم إشعارات الدفع والتذكيرات عبر واتساب. أدخل رقم ولي الأمر المسؤول عن الدفع، وليس رقم الطالب.',
  payerPhoneRowLabel: 'واتساب ولي الأمر',
  addStudentDescription: 'أدخل اسم الطالب ورقم واتساب ولي الأمر (اختياري)',
  editPhoneDialogTitle: 'تعديل واتساب ولي الأمر',

  // ——— Invite button (guardian-only) ———
  inviteButtonLabel: 'دعوة ولي الأمر',
  inviteButtonHelper: 'لولي الأمر فقط — عند قبول الدعوة تصله إشعارات الدفع والتذكيرات تلقائياً.',
  inviteClaimNote: 'تُفعَّل إشعارات الدفع لولي الأمر فور قبول الدعوة.',
  inviteDialogTitle: 'دعوة ولي الأمر',
  inviteDialogDescription:
    'أرسل رابط الدعوة إلى ولي الأمر فقط (المسؤول عن الدفع). عند قبول الدعوة تُفعَّل إشعارات الدفع له تلقائياً.',
  inviteCopyLinkLabel: 'نسخ رابط الدعوة',
  inviteCopiedTitle: 'تم نسخ الرابط',
  inviteCopiedDescription: 'أرسله إلى ولي الأمر عبر واتساب ليقبل الدعوة وتُفعَّل الإشعارات.',

  // ——— Manual Remind button ———
  remindButtonLabel: 'تذكير',
  remindButtonLoading: 'جاري الإرسال…',
  remindButtonAriaLabel: (studentName: string) => `إرسال تذكير دفع لـ ${studentName}`,
  // Manual works even when the auto-toggle is off — reassure the teacher.
  remindManualNote: 'يعمل الزر يدوياً حتى عند إيقاف التذكيرات التلقائية.',

  // ——— Toasts ———
  remindSuccessTitle: 'تم إرسال التذكير',
  remindSuccessDescription: (studentName: string) => `تم إرسال تذكير الدفع لـ ${studentName}.`,
  remindTestTitle: 'تم تسجيل التذكير (وضع تجريبي)',
  remindTestDescription:
    'لم تُربط هوية الدافع بعد — سُجِّل التذكير في السجل وسيُرسل تلقائياً بعد ربط ولي الأمر.',
  remindNoSubscriptionTitle: 'ولي الأمر لم يفعّل الإشعارات بعد',
  remindNoSubscriptionDescription:
    'لم نجد اشتراك دفع لولي الأمر — شارك التذكير عبر واتساب بدلاً من ذلك.',
  remindFailTitle: 'تعذر الإرسال',
  remindFailDescription: 'تعذر إرسال التذكير. حاول مرة أخرى.',

  // ——— Activity log (teacher-visible history) ———
  remindLogManual: (studentName: string) => `تذكير يدوي — ${studentName}`,
  remindLogTestMode: (studentName: string) => `تذكير يدوي (تجريبي، بلا دافع مربوط) — ${studentName}`,

  // ——— WhatsApp share (free wa.me, no paid API) ———
  whatsappShareLabel: 'مشاركة عبر واتساب',
  whatsappShareAriaLabel: (studentName: string) => `مشاركة تذكير ${studentName} عبر واتساب`,
  whatsappRemindText: (params: {
    studentName: string
    amount?: number
    currency?: string
    periodLabel?: string
    /** Claim link — the share is never naked: the parent taps it and claims. */
    inviteUrl?: string
  }) => {
    const amountPart =
      params.amount !== undefined
        ? ` — ${params.amount}${params.currency ? ` ${params.currency}` : ''}`
        : ''
    const periodPart = params.periodLabel ? ` (عن فترة ${params.periodLabel})` : ''
    const linkPart = params.inviteUrl ? `\nرابط المتابعة والدفع: ${params.inviteUrl}` : ''
    return `السلام عليكم، تذكير برسوم ${params.studentName}${amountPart}${periodPart}. يرجى الدفع ورفع الإيصال. جزاكم الله خيراً.${linkPart}`
  },
  whatsappInviteText: (params: { studentName: string; inviteUrl: string }) =>
    `السلام عليكم، دعوة لولي أمر ${params.studentName} لمتابعة رسوم الحلقة واستلام إشعارات الدفع: ${params.inviteUrl}`,
} as const

export type RemindCopy = typeof REMIND_COPY
