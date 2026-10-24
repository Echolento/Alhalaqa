export type InstapayLinkResult =
  | { ok: true; normalized: string }
  | { ok: false; error: string }

export type InstapayHandleResult =
  | { ok: true; normalized: string }
  | { ok: false; error: string }

/**
 * Pull the first InstaPay share link out of messy pasted text.
 *
 * The InstaPay app's share copy comes with surrounding words
 * ("ادفع لـ ... عبر انستاباي https://ipn.eg/S/..."), so a raw paste is
 * almost never a bare URL. This finds `ipn.eg/S/` anywhere in the input,
 * walks left to include the scheme when present, cuts at the first
 * delimiter (whitespace, quotes, angle brackets), heals zero-width chars,
 * and strips chat trailing punctuation (`. , ) »` + Arabic `، ؛`).
 * Returns null when no marker is present — callers fall back to strict
 * validation so the error copy stays accurate.
 */
export function extractInstapayLink(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const text = input
  if (!text) return null
  const lower = text.toLowerCase()
  const marker = 'ipn.eg/s/'
  const idx = lower.indexOf(marker)
  if (idx === -1) return null

  // Include the scheme when the paste has one ("https://ipn.eg/...").
  let start = idx
  const schemeIdx = lower.lastIndexOf('http', idx)
  if (schemeIdx !== -1 && idx - schemeIdx <= 10) {
    const between = text.slice(schemeIdx, idx)
    if (/^https?\s*:\s*\/\s*\/\s*/i.test(between)) start = schemeIdx
  }

  // Cut at the first delimiter — everything after the link is copy, not URL.
  let end = text.length
  const delim = /[\s<>"'`\\\u200B-\u200F\u202A-\u202E]/
  for (let i = start; i < text.length; i++) {
    if (delim.test(text[i])) {
      end = i
      break
    }
  }
  let candidate = text.slice(start, end)
  candidate = candidate.replace(/[\s\u200B-\u200F\u202A-\u202E]+/g, '')
  candidate = candidate.replace(/[.,;!?)\]}»«…،؛:]+$/g, '')
  if (!candidate) return null
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = 'https://' + candidate.replace(/^\/+/, '')
  }
  return candidate || null
}

export function validateInstapayLink(input: unknown): InstapayLinkResult {
  if (typeof input !== 'string' || input.trim() === '') {
    return { ok: false, error: 'رابط InstaPay مطلوب' }
  }
  // Tolerate share-copy pastes: extract the link first, validate the result.
  const trimmed = extractInstapayLink(input) ?? input.trim()
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

/**
 * Derive the InstaPay handle from a validated share link.
 *
 * Share links look like `https://ipn.eg/S/<handle>/instapay/<id>`. The handle
 * is the first segment after `/S/`. Returns null when the link's path doesn't
 * parse (format drift) so callers keep whatever handle they already have —
 * link validity is enforced separately by validateInstapayLink.
 */
export function extractInstapayHandle(input: unknown): string | null {
  if (typeof input !== 'string' || input.trim() === '') return null
  // Tolerate share-copy pastes the same way the link validator does.
  const cleaned = extractInstapayLink(input) ?? input.trim()
  let url: URL
  try {
    url = new URL(cleaned)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'ipn.eg') return null
  if (!url.pathname.startsWith('/S/')) return null
  const segments = url.pathname.split('/').filter(Boolean)
  const raw = segments[1]
  if (!raw) return null
  let decoded: string
  try {
    decoded = decodeURIComponent(raw).trim()
  } catch {
    return null
  }
  const withoutSuffix = decoded.replace(/@instapay$/i, '').trim()
  if (!withoutSuffix) return null
  const check = validateInstapayHandle(`${withoutSuffix}@instapay`)
  return check.ok ? check.normalized : null
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
