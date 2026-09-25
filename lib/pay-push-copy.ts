// lib/pay-push-copy.ts
// #35 slice 7/8 — SINGLE SOURCE OF TRUTH for every user-facing Arabic string
// introduced by the payer push-onboarding slice (push subscribe prompt +
// iOS Add-to-Home-Screen coach + portal wrapper). HITL: human must approve
// wording before merge. UI components MUST import from here — no hardcoded
// duplicates elsewhere in this slice.

export const PAY_PUSH_COPY = {
  // ——— Onboarding prompt ———
  onboardingTitle: 'فعّل إشعارات الدفع',
  onboardingDescription:
    'فعّل الإشعارات على هذا الجهاز ليصلك كل جديد عن الرسوم أولاً بأول.',

  // ——— The 3 notification types (permission prompt must explain all three) ———
  typeDueTitle: 'تنبيه بالمبلغ المستحق',
  typeDueDescription: 'نعلمك بقيمة الرسوم وفترة الاستحقاق فور حلول موعدها.',
  typePayLinkTitle: 'رابط الدفع المباشر',
  typePayLinkDescription:
    'يصل التنبيه مع رابط صفحة الدفع لتدفع وترفع الإيصال فوراً.',
  typeVerdictTitle: 'نتيجة مراجعة الإيصال',
  typeVerdictDescription:
    'نخبرك فور قبول الإيصال، أو عند الحاجة لرفع إيصال أوضح.',

  // ——— Prompt primer: one static line, no buttons, no choice. It exists
  // solely so the native browser prompt doesn't arrive unexplained (which
  // is what gets it dismissed or blocked).
  promptPrimer:
    'سنطلب إذن الإشعارات لمرة واحدة — ليصلك قبول الإيصال فور تحقق المعلم.',
  subscribeCta: 'تفعيل الإشعارات',
  subscribeAriaLabel: 'تفعيل إشعارات الدفع',
  subscribedLabel: 'الإشعارات مفعّلة',
  subscribedNote: 'ستصلك التنبيهات الثلاثة على هذا الجهاز.',
  unsubscribeLabel: 'إيقاف الإشعارات',
  unsubscribeAriaLabel: 'إيقاف إشعارات الدفع',
  loadingLabel: 'جارٍ التحقق…',

  // ——— Errors (deniedHelp mirrors the teacher hook wording for consistency) ———
  // ——— Blocked-only hint: the ONLY payer-visible push UI. Silent everywhere
  // else; this appears solely when subscribing failed so the payer can fix
  // it with one tap (retry) instead of wondering why verdicts never arrive.
  blockedHint:
    'إشعارات الدفع متوقفة على هذا الجهاز — اضغط هنا لإعادة المحاولة',
  deniedHelp:
    'الإشعارات محظورة في المتصفح. اسمح بها من إعدادات الموقع (أيقونة القفل بجانب الرابط).',
  permissionDeniedLabel: 'لم يتم منح الإذن',
  errorGeneric: 'تعذر تفعيل الإشعارات — حاول مرة أخرى.',

  // ——— iOS Add-to-Home-Screen coach (web-push requirement) ———
  iosCoachTitle: 'على iPhone: أضف الصفحة إلى الشاشة الرئيسية أولاً',
  iosCoachDescription:
    'متصفح Safari على iPhone لا يسمح بإشعارات الويب إلا عند فتح الصفحة من أيقونة الشاشة الرئيسية.',
  iosCoachSteps: [
    'اضغط زر المشاركة في أسفل متصفح Safari.',
    'اختر «إضافة إلى الشاشة الرئيسية».',
    'افتح الصفحة من الأيقونة الجديدة ثم ارجع هنا واضغط «تفعيل الإشعارات».',
  ],
  iosCoachNote: 'بعد الإضافة افتح الصفحة من الأيقونة وارجع هنا للتفعيل.',

  // ——— Dismiss ———
  skipLabel: 'لاحقاً',
  skipAriaLabel: 'تخطي تفعيل الإشعارات مؤقتاً',
} as const

export type PayPushCopy = typeof PAY_PUSH_COPY
