// lib/claim-copy.ts
// #36 slice 8/8 — SINGLE SOURCE OF TRUTH for every user-facing Arabic string
// introduced by this slice (claim screen + invite-link states). HITL: human
// must approve wording before merge. UI components MUST import from here —
// no hardcoded duplicates elsewhere in this slice.

export const CLAIM_COPY = {
  // ——— Claim screen (/claim?token=) ———
  claimPageTitle: 'تفعيل متابعة الرسوم',
  claimPageSubtitle: 'أنت تسجّل لمتابعة رسوم الطالب واستلام إشعارات الدفع.',
  claimStudentLabel: 'الطالب',
  claimTeacherLabel: 'المعلم',
  claimLoggedInAs: (email: string) => `مسجّل الدخول بـ ${email} — أكّد الربط أدناه.`,
  claimConfirmButton: 'تأكيد الربط',
  claimConfirming: 'جاري التأكيد…',
  claimSuccessTitle: 'تم ربط الحساب بنجاح',
  claimSuccessDescription: (studentName: string) =>
    `أنت الآن تتابع رسوم ${studentName} — ستصلك إشعارات الدفع والتذكيرات تلقائياً.`,
  claimGoPay: 'عرض صفحة الدفع',

  // ——— Magic-link login (payer registers for the NAMED student) ———
  claimOtpTitle: 'تسجيل دخول ولي الأمر',
  claimOtpDescription: (studentName: string) =>
    `أدخل بريدك الإلكتروني — سنرسل لك رابط دخول لمرة واحدة لإتمام تسجيلك كولي أمر ${studentName}.`,
  claimEmailLabel: 'البريد الإلكتروني لولي الأمر',
  claimEmailPlaceholder: 'example@email.com',
  claimEmailHelper: 'نرسل رابط الدخول إلى هذا البريد — لا حاجة لكلمة مرور.',
  claimSendLinkButton: 'إرسال رابط الدخول',
  claimSendingLink: 'جاري إرسال الرابط…',
  claimLinkSentTitle: 'تفقد بريدك',
  claimLinkSentDescription: 'أرسلنا لك رابط دخول — اضغط عليه ثم ارجع إلى هنا لتأكيد الربط.',
  claimInvalidEmail: 'يرجى إدخال بريد إلكتروني صحيح.',
  claimOtpFailTitle: 'تعذر إرسال الرابط',
  claimOtpFailDescription: 'تعذر إرسال رابط الدخول. تحقق من البريد وحاول مرة أخرى.',

  // ——— Token states ———
  claimInvalidTitle: 'الرابط غير صالح',
  claimInvalidDescription: 'رابط الدعوة غير صالح — اطلب رابطاً جديداً من المعلم.',
  claimExpiredTitle: 'انتهت صلاحية الدعوة',
  claimExpiredDescription: 'انتهت صلاحية رابط الدعوة (٧ أيام) — اطلب رابطاً جديداً من المعلم.',
  claimUsedTitle: 'تم استخدام هذه الدعوة مسبقاً',
  claimUsedDescription: 'هذه الدعوة مستخدمة بالفعل — إن كنت ولي الأمر المربوط سلفاً سجّل الدخول مباشرة.',
  claimRevokedTitle: 'أُلغيت هذه الدعوة',
  claimRevokedDescription: 'ألغى المعلم هذه الدعوة وأصدر رابطاً جديداً — اطلب الرابط الجديد منه.',
  claimAlreadyClaimedTitle: 'الطالب مربوط مسبقاً',
  claimAlreadyClaimedDescription: 'هذا الطالب مربوط بحساب ولي أمر آخر — تواصل مع المعلم إن كان هذا خطأ.',
  claimRateLimitedTitle: 'محاولات كثيرة جداً',
  claimRateLimitedDescription: 'تجاوزت عدد المحاولات المسموح — انتظر قليلاً ثم حاول مرة أخرى.',

  // ——— Invite-link issue states (payer-invite-button wiring) ———
  inviteIssuingLabel: 'جاري تجهيز رابط الدعوة…',
  inviteIssueFailTitle: 'تعذر تجهيز الرابط',
  inviteIssueFailDescription: 'تعذر إنشاء رابط الدعوة. أغلق النافذة وحاول مرة أخرى.',
  inviteLinkLabel: 'رابط الدعوة (صالح ٧ أيام، لمرة واحدة)',
  inviteRegeneratedNote: 'إصدار رابط جديد يُلغي الرابط السابق تلقائياً.',
} as const

export type ClaimCopy = typeof CLAIM_COPY
