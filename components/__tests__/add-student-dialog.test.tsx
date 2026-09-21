import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddStudentDialog } from '@/components/dashboard/add-student-dialog'

vi.mock('@/lib/student-actions', () => ({
  addStudent: vi.fn(() => ({ success: true })),
  addMultipleStudents: vi.fn(() => ({ success: true })),
}))

describe('AddStudentDialog bulk mode', () => {
  it('opens bulk entry from single form', () => {
    render(<AddStudentDialog students={[]} />)
    fireEvent.click(screen.getByText('إضافة طالب'))
    expect(screen.getByText('إضافة مجموعة')).toBeInTheDocument()
  })

  it('parses one-name-per-line and submits via addMultipleStudents', async () => {
    const { addMultipleStudents } = await import('@/lib/student-actions')
    render(<AddStudentDialog students={[]} />)
    fireEvent.click(screen.getByText('إضافة طالب'))
    fireEvent.click(screen.getByText('إضافة مجموعة'))
    const area = screen.getByPlaceholderText(/اسم كل طالب في سطر/)
    fireEvent.change(area, { target: { value: 'أحمد علي\nمحمد حسن\n' } })
    expect(screen.getByText(/إضافة المحدد \(2\)/)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/إضافة المحدد \(2\)/))
    expect(vi.mocked(addMultipleStudents)).toHaveBeenCalledWith([
      { name: 'أحمد علي', phone: undefined },
      { name: 'محمد حسن', phone: undefined },
    ])
  })

  it('supports optional phone after comma', async () => {
    const { addMultipleStudents } = await import('@/lib/student-actions')
    render(<AddStudentDialog students={[]} />)
    fireEvent.click(screen.getByText('إضافة طالب'))
    fireEvent.click(screen.getByText('إضافة مجموعة'))
    fireEvent.change(screen.getByPlaceholderText(/اسم كل طالب في سطر/), {
      target: { value: 'أحمد علي, +201234567890' },
    })
    fireEvent.click(screen.getByText(/إضافة المحدد \(1\)/))
    expect(vi.mocked(addMultipleStudents)).toHaveBeenCalledWith([
      { name: 'أحمد علي', phone: '+201234567890' },
    ])
  })
})
