import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AddStudentDialog } from '@/components/dashboard/add-student-dialog'
import { REMIND_COPY } from '@/lib/remind-copy'

vi.mock('@/lib/student-actions', () => ({
  addStudent: vi.fn(() => ({ success: true })),
  addMultipleStudents: vi.fn(() => ({ success: true })),
}))

vi.mock('@/lib/contacts', () => ({
  isContactPickerAvailable: () => false,
  pickContacts: vi.fn(),
  findDuplicates: () => [],
}))

describe('AddStudentDialog payer-phone clarity (#32)', () => {
  it('labels the phone field as the payer WhatsApp with helper copy', async () => {
    render(<AddStudentDialog students={[]} />)
    // Open the dialog first (trigger button).
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.click(screen.getByText('إضافة طالب'))
    expect(screen.getByText(REMIND_COPY.payerPhoneLabel)).toBeInTheDocument()
    expect(screen.getByText(REMIND_COPY.payerPhoneHelper)).toBeInTheDocument()
  })

  it('describes the form with the payer-phone wording', async () => {
    render(<AddStudentDialog students={[]} />)
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.click(screen.getAllByText('إضافة طالب')[0])
    expect(screen.getByText(REMIND_COPY.addStudentDescription)).toBeInTheDocument()
  })
})
