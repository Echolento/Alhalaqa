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

  // ——— Post-claim phone confirm (A2: reachability before coaching) ———
  claimPhoneConfirmTitle: 'رقم التواصل',
  claimPhoneConfirmDescription: (phone: string) =>
    `هنوصلك على ${phone} — الرقم صحيح؟`,
  claimPhoneMissingDescription: 'سجّل رقم هاتفك — المعلم يستخدمه للتواصل معك.',
  claimPhoneCorrectButton: 'الرقم صحيح',
  claimPhoneEditButton: 'تعديل الرقم',
  claimPhoneInputLabel: 'رقم الهاتف',
  claimPhonePlaceholder: '01xxxxxxxxx',
  claimPhoneSaveButton: 'حفظ الرقم',
  claimPhoneSaving: 'جاري الحفظ…',
  claimPhoneSaved: 'تم حفظ الرقم',
  claimPhoneInvalid: 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678).',
  claimPhoneSaveFail: 'تعذر حفظ الرقم — حاول مرة أخرى.',

  // ——— Install coach (A2: claim-success → installed PWA) ———
  installCoachTitle: 'ثبّت التطبيق لتصلك التذكيرات',
  installCoachDescription: 'التثبيت يضمن وصول إشعارات الدفع حتى والمتصفح مغلق.',
  installCoachAndroidHint: 'اضغط الزر أدناه لتثبيت التطبيق على جهازك.',
  installCoachIosStep1: 'اضغط زر المشاركة أسفل المتصفح',
  installCoachIosStep2: 'اختر «إضافة إلى الشاشة الرئيسية»',
  installCoachIosStep3: 'اضغط «إضافة» ثم افتح التطبيق من الأيقونة',
  installCoachGenericHint: 'من قائمة المتصفح اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».',
  installCoachLater: 'لاحقاً',

  // ——— Payer home hub (A3: /pay without ?student=) ———
  hubTitle: 'الرسوم المستحقة',
  hubEmptyTitle: 'لا توجد رسوم مربوطة بعد',
  hubEmptyDescription: 'اطلب رابط الدعوة من المعلم وافتحه بنفس هذا البريد لربط الطالب.',
  hubClaimAnother: 'عندك طالب آخر؟ افتح رابط دعوته بنفس البريد وسيظهر هنا.',
  hubPayButton: 'عرض الدفع',

  // ——— Generic payer login (A3: /pay without a session) ———
  payerLoginTitle: 'دخول متابعة الرسوم',
  payerLoginDescription: 'أدخل بريدك الإلكتروني — نرسل لك رابط دخول لمرة واحدة.',
  payerLoginEmailLabel: 'البريد الإلكتروني',
  payerLoginEmailPlaceholder: 'example@email.com',
  payerLoginSendButton: 'إرسال رابط الدخول',
  payerLoginSending: 'جاري إرسال الرابط…',
  payerLoginSent:
    'تفقد بريدك — افتح أحدث رسالة وصلتك واضغط رابط الدخول. كل طلب جديد يلغي الرابط القديم، فاستخدم الأحدث فقط.',
  payerLoginInvalidEmail: 'يرجى إدخال بريد إلكتروني صحيح.',
  payerLoginFail: 'تعذر إرسال رابط الدخول — حاول مرة أخرى.',

  // ——— Phone-pull claim flow (no token: pay.alhalaqa.com entry) ———
  phoneClaimTitle: 'متابعة الرسوم',
  phoneClaimDescription: 'أدخل رقم الموبايل المسجّل عند المعلم — هنعرض الطلاب المرتبطين بيه.',
  phoneClaimLabel: 'رقم الموبايل',
  phoneClaimPlaceholder: '01xxxxxxxxx',
  phoneClaimContinue: 'متابعة',
  phoneClaimInvalidPhone: 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678).',
  phoneClaimLookupFail: 'تعذر البحث — حاول مرة أخرى.',
  phoneClaimFail: 'تعذر إتمام الربط — حاول مرة أخرى.',
  phoneClaimEmptyTitle: 'مفيش حاجة مربوطة بالرقم ده',
  phoneClaimEmptyDescription:
    'لو المعلم مسجّل رقم مختلف، اطلب منه رابط الدعوة المخصوص — أو تأكد من الرقم وحاول تاني.',
  phoneClaimFoundTitle: (count: number) =>
    count === 1 ? 'لقينا طالب واحد' : `لقينا ${count} طلاب`,
  phoneClaimWrongNumber: 'رقم غلط؟ عدّله',
  phoneClaimLinking: 'جاري الربط…',
  phoneClaimLinkedTitle: 'تم الربط بنجاح',
  phoneClaimLinkedDescription: (names: string) => `أنت الآن تتابع رسوم: ${names}.`,
  phoneClaimNotYours: 'مش بتوعك؟ فك الربط',
  phoneClaimUnlinked: 'اتفك الربط — ارجع للرقم الصح وابدأ من جديد.',
  phoneClaimUnlinkFail: 'تعذر فك الربط — حاول مرة أخرى.',
  phoneClaimEmailTitle: 'سجّل الدخول لإتمام الربط',
  phoneClaimEmailDescription:
    'أدخل بريدك — هنبعتلك رابط دخول لمرة واحدة، وبعده الطلاب يظهروا عندك تلقائياً.',
  phoneClaimInviteFallback: 'عندك رابط دعوة من المعلم؟ افتحه مباشرة.',
  missingPhoneBadge: 'ناقص رقم',

  // ——— Teacher-as-payer shortcut + install nudges (B) ———
  myPaymentsLabel: 'مدفوعاتي',
  myPaymentsDescription: 'الرسوم المربوطة ببريدك كمتابع.',
  installBannerTitle: 'ثبّت التطبيق لتصلك التذكيرات حتى والمتصفح مغلق',
  installBannerInstall: 'تثبيت',
  installNudgeTitle: 'ثبّت التطبيق على جهازك',

  // ——— Invite-link issue states (payer-invite-button wiring) ———
  inviteIssuingLabel: 'جاري تجهيز رابط الدعوة…',
  inviteIssueFailTitle: 'تعذر تجهيز الرابط',
  inviteIssueFailDescription: 'تعذر إنشاء رابط الدعوة. أغلق النافذة وحاول مرة أخرى.',
  inviteLinkLabel: 'رابط الدعوة (صالح ٧ أيام، لمرة واحدة)',
  inviteRegeneratedNote: 'إصدار رابط جديد يُلغي الرابط السابق تلقائياً.',
} as const

