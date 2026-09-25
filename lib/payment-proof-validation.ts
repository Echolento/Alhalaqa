// lib/payment-proof-validation.ts
// Pure validation + path contracts for payer receipt proofs (#33 slice 5/8).
// No DB, no network — mirrors the `payment-proofs` storage bucket allowlist
// so rejections are deterministic in tests and before upload.

export const PAYMENT_PROOFS_BUCKET = 'payment-proofs'

/** 5MB cap — mirrors storage.buckets.file_size_limit in 034. */
export const MAX_PROOF_BYTES = 5 * 1024 * 1024

export const ALLOWED_PROOF_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

export type AllowedProofMimeType = (typeof ALLOWED_PROOF_MIME_TYPES)[number]

export const ALLOWED_PROOF_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'] as const

export type ProofStatus = 'pending' | 'verified' | 'rejected'

export interface PaymentProof {
  id: string
  student_id: string
  period_key: string
  storage_path: string
  status: ProofStatus
  teacher_note: string | null
  created_at: string
  /** Short-lived signed view URL (1h). Present when the reader may view it. */
  imageUrl?: string | null
  /** Human period label (month / batch / week). Falls back to period_key. */
  periodLabel?: string
}

/** Payer log shows the 8 most recent receipts. */
export const PROOF_HISTORY_LIMIT = 8

export type ProofFileValidation =
  | { ok: true; normalizedMime: string; extension: string }
  | { ok: false; error: string }

function normalizeMime(mimeType: unknown): string {
  const raw = typeof mimeType === 'string' ? mimeType.trim().toLowerCase() : ''
  // `image/jpg` is a common client alias for `image/jpeg`.
  if (raw === 'image/jpg') return 'image/jpeg'
  // Strip optional codec suffixes (`image/jpeg; charset=...`).
  return raw.split(';')[0].trim()
}

function extensionOf(fileName: string): string {
  const base = fileName.split('/').pop()?.split('\\').pop() ?? ''
  const dot = base.lastIndexOf('.')
  if (dot <= 0 || dot === base.length - 1) return ''
  return base.slice(dot + 1).toLowerCase()
}

/**
 * Image-only + size-cap gate. Rejects non-images, extension/mime mismatches,
 * and oversize files with Arabic explanations for the pay screen.
 */
export function validateProofFile(input: {
  fileName: unknown
  mimeType: unknown
  sizeBytes: unknown
}): ProofFileValidation {
  const fileName = typeof input.fileName === 'string' ? input.fileName : ''
  const mime = normalizeMime(input.mimeType)
  const size = typeof input.sizeBytes === 'number' ? input.sizeBytes : NaN

  if (!fileName || !mime) {
    return { ok: false, error: 'ملف الإيصال مطلوب — اختر صورة من الكاميرا أو المعرض' }
  }
  if (!(ALLOWED_PROOF_MIME_TYPES as readonly string[]).includes(mime)) {
    return { ok: false, error: 'الإيصال يجب أن يكون صورة (JPEG أو PNG أو WebP أو HEIC)' }
  }
  const ext = extensionOf(fileName)
  if (!(ALLOWED_PROOF_EXTENSIONS as readonly string[]).includes(ext)) {
    return { ok: false, error: 'الإيصال يجب أن يكون صورة (JPEG أو PNG أو WebP أو HEIC)' }
  }
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: 'ملف الإيصال غير صالح — أعد اختيار الصورة' }
  }
  if (size > MAX_PROOF_BYTES) {
    return { ok: false, error: 'حجم الصورة يتجاوز الحد المسموح (5MB) — اختر صورة أصغر' }
  }
  return { ok: true, normalizedMime: mime, extension: ext }
}

/** Strips path traversal + unsafe chars; always returns a safe basename. */
export function sanitizeProofFileName(fileName: string): string {
  const base = fileName.split('/').pop()?.split('\\').pop() ?? 'receipt.jpg'
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 80)
  return cleaned.includes('.') ? cleaned : `${cleaned || 'receipt'}.jpg`
}

/**
 * Storage-path contract: teacher/student/period scoped, timestamped.
 * Never embeds raw user input — the filename is sanitized above.
 */
export function buildProofStoragePath(params: {
  teacherId: string
  studentId: string
  periodKey: string
  fileName: string
  nowMs?: number
}): string {
  const safe = sanitizeProofFileName(params.fileName)
  const stamp = params.nowMs ?? Date.now()
  return `${params.teacherId}/${params.studentId}/${params.periodKey}/${stamp}-${safe}`
}
