export interface PickedContact {
  name: string
  phone: string
}

export function isContactPickerAvailable(): boolean {
  return 'contacts' in navigator && 'select' in (navigator as any).contacts
}

export async function pickContacts(): Promise<PickedContact[]> {
  const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: true })
  return (contacts as any[]).map((c) => ({
    name: c.name?.[0] || '',
    phone: c.tel?.[0] || '',
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
