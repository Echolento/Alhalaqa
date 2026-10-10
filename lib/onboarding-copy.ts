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
  biweekly: 'النصف شهري',
  monthly: 'الشهري',
}

export const FREQUENCY_CYCLE_WORD: Record<string, string> = {
  weekly: 'كل أسبوع',
  biweekly: 'كل أسبوعين',
  monthly: 'كل شهر',
}

export const ONBOARDING_COPY = {
  // ——— Stepper (3 circles, phone-friendly) ———
  steps: ['الحساب', 'الرسوم', 'الدفع'] as string[],

  // ——— Step 1: billing basics (/welcome) ———
  basicsTitle: 'إعدادات الرسوم',
  basicsSubtitle: 'العملة ونظام الدفع والسعر الذي يدفعه ولي الأمر كل مرة.',
  frequencyLabel: 'نظام الدفع',
  priceLabel: (freqWord: string) => `السعر ${freqWord}`,
  priceHint: (cycleWord: string) => `المبلغ الذي يدفعه ولي الأمر ${cycleWord}.`,
  firstBillNote: 'أول فاتورة لأي طالب جديد: أول الشهر الجاي — وتقدر تغيّر التاريخ لكل طالب.',
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

