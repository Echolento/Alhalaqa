export interface PickedContact {
  name: string
  phone: string
}

/**
 * Why the picker could not be used.
 *
 * - `unsupported` — no Contact Picker API in this browser at all.
 * - `blocked`     — the API object exists but this context refuses to open the
 *   native picker. In-app browsers (WhatsApp/Instagram/Facebook links) and
 *   Android WebViews expose `navigator.contacts` and then reject `select()`
 *   with TypeError/NotAllowedError. Reporting this as a generic failure left
 *   the user with a dead-end "couldn't reach contacts" toast.
 */
export type ContactPickerFailure = 'unsupported' | 'blocked'

export class ContactPickerError extends Error {
  readonly reason: ContactPickerFailure
  readonly original: unknown

  constructor(reason: ContactPickerFailure, message: string, original: unknown = null) {
    super(message)
    this.name = 'ContactPickerError'
    this.reason = reason
    this.original = original
  }
}

export function isContactPickerAvailable(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    typeof (navigator as { contacts?: { select?: unknown } }).contacts?.select === 'function'
  )
}

/**
 * Open the native picker. Cancelling resolves to `[]` — never an error.
 * Any refusal to open is surfaced as a typed ContactPickerError so the caller
 * can tell the user why, instead of guessing.
 */
export async function pickContacts(): Promise<PickedContact[]> {
  const manager = (navigator as { contacts?: { select?: (props: string[], opts?: { multiple?: boolean }) => Promise<unknown> } })
    .contacts
  if (!manager || typeof manager.select !== 'function') {
    throw new ContactPickerError('unsupported', 'Contact Picker API unavailable')
  }

  let picked: unknown
  try {
    picked = await manager.select(['name', 'tel'], { multiple: true })
  } catch (error) {
    // Dismissing the picker is a cancel, not a failure (some Chrome versions
    // reject with AbortError instead of resolving to []).
    if ((error as { name?: string } | null)?.name === 'AbortError') return []
    const detail = (error as { message?: string } | null)?.message
    throw new ContactPickerError(
      'blocked',
      `Contact picker refused to open${detail ? `: ${detail}` : ''}`,
      error,
    )
  }

  if (!Array.isArray(picked)) return []
  return picked.map((c: { name?: string[]; tel?: string[] }) => ({
    name: c?.name?.[0] || '',
    phone: c?.tel?.[0] || '',
  }))
}

export function normalizePhone(s: string): string {
  const digits = s.replace(/\D/g, '')
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0')) return '20' + digits.slice(1)
  return digits
}

export function findDuplicates(
  contacts: PickedContact[],
  existingStudents: { name: string | null; phone: string | null }[]
): boolean[] {
  const normalizedExisting = existingStudents.map((s) => ({
    name: s.name?.toLowerCase().trim() || '',
    phone: s.phone ? normalizePhone(s.phone) : '',
  }))

  return contacts.map((c) => {
    const cn = c.name.toLowerCase().trim()
    const cp = c.phone ? normalizePhone(c.phone) : ''
    return normalizedExisting.some(
      (e) => (cn && e.name === cn) || (cp && e.phone === cp)
    )
  })
}
