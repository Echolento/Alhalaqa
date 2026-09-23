export type InstapayLinkResult =
  | { ok: true; normalized: string }
  | { ok: false; error: string }

export type InstapayHandleResult =
  | { ok: true; normalized: string }
  | { ok: false; error: string }

export function validateInstapayLink(input: unknown): InstapayLinkResult {
  if (typeof input !== 'string' || input.trim() === '') {
    return { ok: false, error: 'رابط InstaPay مطلوب' }
  }
  const trimmed = input.trim()
  if (/[<>"'`\s\\]/.test(trimmed)) {
    return { ok: false, error: 'رابط InstaPay يحتوي على رموز غير مسموحة — الصق رابط المشاركة كما هو من تطبيق InstaPay' }
  }
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, error: 'رابط InstaPay غير صالح — استخدم رابط المشاركة الرسمي من تطبيق InstaPay' }
  }
  if (url.protocol !== 'https:') {
    return { ok: false, error: 'رابط InstaPay يجب أن يبدأ بـ https://' }
  }
  if (url.hostname.toLowerCase() !== 'ipn.eg') {
    return { ok: false, error: 'رابط InstaPay غير موثوق — يجب أن يكون على النطاق الرسمي ipn.eg فقط' }
  }
  if (!url.pathname.startsWith('/S/') || url.pathname.length <= 3) {
    return { ok: false, error: 'رابط InstaPay غير صالح — استخدم رابط المشاركة الذي يبدأ بـ https://ipn.eg/S/' }
  }
  return { ok: true, normalized: url.toString() }
}

export function validateInstapayHandle(input: unknown): InstapayHandleResult {
  if (typeof input !== 'string' || input.trim() === '') {
    return { ok: false, error: 'عنوان InstaPay مطلوب' }
  }
  const trimmed = input.trim()
  if (/[\s<>"'`;\\]/.test(trimmed) || /[\u0600-\u06FF]/.test(trimmed)) {
    return { ok: false, error: 'عنوان InstaPay غير صالح — مسموح بالحروف والأرقام والنقاط فقط قبل @instapay' }
  }
  const parts = trimmed.split('@')
  if (parts.length !== 2 || parts[1].toLowerCase() !== 'instapay') {
    return { ok: false, error: 'عنوان InstaPay غير صالح — يجب أن يكون بالشكل name@instapay' }
  }
  if (!/^[A-Za-z0-9._-]{2,64}$/.test(parts[0])) {
    return { ok: false, error: 'عنوان InstaPay غير صالح — مسموح بالحروف والأرقام والنقاط فقط قبل @instapay' }
  }
  return { ok: true, normalized: `${parts[0]}@instapay` }
}

export interface InstaPayTeacherRow {
  instapay_link?: string | null
  instapay_handle?: string | null
}

export interface InstaPayContract {
  instapayLink: string | null
  instapayHandle: string | null
}

/**
 * Pay-screen + push-payload contract (slice 5 consumes this shape).
 * Pure pass-through: validated values saved in Settings flow here unchanged.
 */
export function getInstaPayContract(row: InstaPayTeacherRow | null | undefined): InstaPayContract {
  return {
    instapayLink: row?.instapay_link ?? null,
    instapayHandle: row?.instapay_handle ?? null,
  }
}

/** Trusted-surface explainer shown in Teacher Settings (Arabic RTL). */
export const INSTAPAY_SETTINGS_EXPLAINER =
  'رابط InstaPay وعنوانك يظهران فقط داخل إشعارات الدفع وشاشة الدفع الخاصة بطلابك. لن نطلب منك أو من أولياء الأمور أي مبلغ داخل التطبيق — الدفع يتم داخل تطبيق InstaPay الرسمي.'
