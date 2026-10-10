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

  // ——— Payer-visible push UI ———
  // enableBar: shown whenever the payer isn't subscribed and CAN be prompted
  // (permission undecided). Tapping is a gesture, so the browser/OS prompt shows.
  enableBar: 'فعّل إشعارات الدفع لتصلك تنبيهات الرسوم — اضغط هنا',
  // blockedHint: legacy alias kept for older surfaces.
  blockedHint:
    'إشعارات الدفع متوقفة على هذا الجهاز — اضغط هنا لإعادة المحاولة',
  // deniedHelp: permission was permanently denied — no code can re-prompt.
  // Covers both the browser tab (site settings) and the INSTALLED app (the
  // permission lives in the OS app settings).
  deniedHelp:
    'الإشعارات محظورة على هذا الجهاز. اسمح بها من إعدادات التطبيق أو الموقع (أندرويد: الإعدادات ← التطبيقات ← Alhalaqa ← الإشعارات)، ثم أعد المحاولة.',
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

