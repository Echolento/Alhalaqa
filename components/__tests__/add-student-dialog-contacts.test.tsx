import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// Reported bug: tapping «إضافة من جهات الاتصال» inside a WhatsApp in-app browser
// produced a dead-end toast. The picker object exists there, so the button
// renders, but select() refuses to open — and the catch-all hid the reason.

const mockToast = vi.fn()

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast, toasts: [], dismiss: vi.fn() }),
}))

vi.mock('@/lib/student-actions', () => ({
  addStudent: vi.fn(() => ({ success: true })),
  addMultipleStudents: vi.fn(() => ({ success: true })),
  getBillingDefaults: vi.fn(() => Promise.resolve(undefined)),
}))

import { AddStudentDialog } from '@/components/dashboard/add-student-dialog'

function installContacts(select: unknown) {
  Object.defineProperty(navigator, 'contacts', {
    value: { select },
    configurable: true,
  })
}

function openDialog() {
  render(<AddStudentDialog students={[]} />)
  fireEvent.click(screen.getByText('إضافة طالب'))
  return screen.getByRole('button', { name: /إضافة من جهات الاتصال/ })
}

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  mockToast.mockReset()
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  warn.mockRestore()
  delete (navigator as unknown as Record<string, unknown>).contacts
})

describe('AddStudentDialog — import from contacts', () => {
  it('names the real failure and offers a way out when the picker is blocked', async () => {
    const error = new TypeError('Unable to open a contact picker')
    installContacts(vi.fn().mockRejectedValue(error))

    fireEvent.click(openDialog())

    await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(1))
    const toast = mockToast.mock.calls[0][0]

    // Actionable: the user is told the in-app browser is the problem and how
    // to leave it — not just "couldn't reach contacts".
    expect(toast.description).toContain('Chrome')
    expect(toast.description).not.toBe('تعذر الوصول إلى جهات الاتصال')

    // Diagnosable: the real error survives in the console instead of vanishing.
    const logged = warn.mock.calls.flat().map(String).join(' ')
    expect(logged).toContain('Unable to open a contact picker')
  })

  it('offers an in-dialog Chrome escape hatch after a blocked picker', async () => {
    const ua = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36',
      configurable: true,
    })
    installContacts(vi.fn().mockRejectedValue(new TypeError('Unable to open a contact picker')))

    fireEvent.click(openDialog())
    await waitFor(() => expect(mockToast).toHaveBeenCalled())

    const link = await screen.findByText(/افتح في Chrome/)
    expect(link.closest('a')?.getAttribute('href')).toContain('package=com.android.chrome')

    Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
  })

  it('treats a dismissed picker as a cancel, not an error', async () => {
    const abort = Object.assign(new Error('user cancelled'), { name: 'AbortError' })
    installContacts(vi.fn().mockRejectedValue(abort))

    fireEvent.click(openDialog())
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockToast).not.toHaveBeenCalled()
  })

  it('ignores an empty selection without an error toast', async () => {
    installContacts(vi.fn().mockResolvedValue([]))

    fireEvent.click(openDialog())
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockToast).not.toHaveBeenCalled()
  })

  it('shows the review list for a real selection', async () => {
    installContacts(
      vi.fn().mockResolvedValue([{ name: ['أحمد علي'], tel: ['01012345678'] }]),
    )

    fireEvent.click(openDialog())

    expect(await screen.findByText('استيراد من جهات الاتصال')).toBeTruthy()
    expect(screen.getByDisplayValue('أحمد علي')).toBeTruthy()
  })
})
