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
}

function contactsButton() {
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

    openDialog()
    fireEvent.click(contactsButton())

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

  it('offers the one-time Chrome install path after a blocked picker', async () => {
    const ua = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36',
      configurable: true,
    })
    installContacts(vi.fn().mockRejectedValue(new TypeError('Unable to open a contact picker')))

    openDialog()
    fireEvent.click(contactsButton())
    await waitFor(() => expect(mockToast).toHaveBeenCalled())

    // Not "use the app in Chrome" — the link moves the icon itself: it hands
    // the /install page to the Chrome app, where the WebAPK is installed once.
    const link = await screen.findByText(/ثبّت الحلقة من Chrome/)
    const href = link.closest('a')?.getAttribute('href') ?? ''
    expect(href).toContain('package=com.android.chrome')
    expect(href).toContain('/install')

    Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
  })

  it('explains the missing button on Android hosts without the picker', async () => {
    const ua = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/22.0 Chrome/99.0 Mobile Safari/537.36',
      configurable: true,
    })

    openDialog()

    // Samsung Internet 22+ removed the API entirely: no button to tap.
    expect(screen.queryByRole('button', { name: /إضافة من جهات الاتصال/ })).toBeNull()
    expect(await screen.findByText(/استيراد جهات الاتصال يعمل داخل تطبيق/)).toBeTruthy()

    Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
  })

  it('treats a dismissed picker as a cancel, not an error', async () => {
    const abort = Object.assign(new Error('user cancelled'), { name: 'AbortError' })
    installContacts(vi.fn().mockRejectedValue(abort))

    openDialog()
    fireEvent.click(contactsButton())
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockToast).not.toHaveBeenCalled()
  })

  it('ignores an empty selection without an error toast', async () => {
    installContacts(vi.fn().mockResolvedValue([]))

    openDialog()
    fireEvent.click(contactsButton())
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockToast).not.toHaveBeenCalled()
  })

  it('shows the review list for a real selection', async () => {
    installContacts(
      vi.fn().mockResolvedValue([{ name: ['أحمد علي'], tel: ['01012345678'] }]),
    )

    openDialog()
    fireEvent.click(contactsButton())

    expect(await screen.findByText('استيراد من جهات الاتصال')).toBeTruthy()
    expect(screen.getByDisplayValue('أحمد علي')).toBeTruthy()
  })
})
