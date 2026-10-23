// lib/onboarding-copy.ts
// SINGLE SOURCE OF TRUTH for onboarding strings (welcome split + stepper).
// HITL: human must approve wording before merge.

export const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'أسبوعي' },
  { value: 'biweekly', label: 'كل أسبوعين' },
  { value: 'monthly', label: 'شهري' },
] as const

export const FREQUENCY_PRICE_WORD: Record<string, string> = {
  weekly: 'الأسبوعي',
  biweekly: 'كل أسبوعين',
  monthly: 'الشهري',
}

export const FREQUENCY_CYCLE_WORD: Record<string, string> = {
  weekly: 'كل أسبوع',
  biweekly: 'كل أسبوعين',
  monthly: 'كل شهر',
}

/** 0 = Sunday … 6 = Saturday (JS getDay convention). */
export const WEEKDAY_OPTIONS = [
  { value: '0', label: 'الأحد' },
  { value: '1', label: 'الاثنين' },
  { value: '2', label: 'الثلاثاء' },
  { value: '3', label: 'الأربعاء' },
  { value: '4', label: 'الخميس' },
  { value: '5', label: 'الجمعة' },
  { value: '6', label: 'السبت' },
] as const

export const ONBOARDING_COPY = {
  // ——— Stepper (3 circles, phone-friendly) ———
  steps: ['الحساب', 'الرسوم', 'الدفع'] as string[],

  // ——— Step 1: billing basics (/welcome) ———
  basicsTitle: 'إعدادات الرسوم',
  basicsSubtitle: 'العملة وجدول الدفع والسعر الذي يدفعه ولي الأمر كل مرة.',
  frequencyLabel: 'جدول الدفع',
  weekdayLabel: 'يوم الدفع',
  weekdayHint: 'كل الطلاب الجدد هيبدأوا على اليوم ده. تقدر تغيّر تاريخ طالب واحد بعدين.',
  priceLabel: (freqWord: string) => `السعر ${freqWord}`,
  priceHint: (cycleWord: string) => `المبلغ الذي يدفعه ولي الأمر ${cycleWord}.`,
  firstBillNote: 'الشهري: أول الشهر الجاي. الأسبوعي وكل أسبوعين: أول يوم من الأيام اللي تختارها — والطالب يفضل «لم يبدأ بعد» لحد التاريخ ده.',
  basicsSubmit: 'متابعة',
  basicsSaving: 'جاري الحفظ…',

  // ——— Step 2: InstaPay (/welcome/instapay) ———
  instapayTitle: 'طريقة الدفع',
  instapaySubtitle: 'تظهر داخل تنبيهات الدفع وشاشة الدفع. تقدر تضيفها أو تعدّلها لاحقاً من الإعدادات.',
  instapayLinkLabel: 'رابط الدفع (انستاباي)',
  instapayHandleLabel: 'اسم انستاباي (اختياري)',
  instapaySubmit: 'إنهاء الإعداد',
  instapayLater: 'لاحقاً',

  // ——— Shared add-student billing block ———
  nextDueLabel: 'تاريخ أول فاتورة',
} as const

