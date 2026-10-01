import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddStudentDialog } from '@/components/dashboard/add-student-dialog'
import { addStudent } from '@/lib/student-actions'

vi.mock('@/lib/student-actions', () => ({
  addStudent: vi.fn(() => ({ success: true })),
  addMultipleStudents: vi.fn(() => ({ success: true })),
  getBillingDefaults: vi.fn(() => Promise.resolve(undefined)),
}))

vi.mock('@/lib/contacts', () => ({
  isContactPickerAvailable: () => false,
  pickContacts: vi.fn(),
  findDuplicates: () => [],
}))

function openDialog() {
  render(<AddStudentDialog students={[]} />)
  fireEvent.click(screen.getByText('إضافة طالب'))
}

describe('AddStudentDialog minimal (name + phone only)', () => {
  it('shows no billing fields — price/frequency/date live in the profile', () => {
    // NOTE: Radix portals into document.body, so query document, not container.
    render(<AddStudentDialog students={[]} />)
    fireEvent.click(screen.getByText('إضافة طالب'))
    expect(document.querySelector('[data-testid="billing-frequency"]')).toBeNull()
    expect(document.querySelector('[data-testid="billing-price"]')).toBeNull()
    expect(document.querySelector('[data-testid="billing-next-due"]')).toBeNull()
  })

  it('submits name + phone only and lets the server apply defaults', async () => {
    render(<AddStudentDialog students={[]} />)
    fireEvent.click(screen.getByText('إضافة طالب'))
    fireEvent.change(screen.getByPlaceholderText('أدخل اسم الطالب'), {
      target: { value: 'اختبار أحمد' },
    })
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() =>
      expect(vi.mocked(addStudent)).toHaveBeenCalledWith('اختبار أحمد', { phone: undefined }),
    )
  })
})
