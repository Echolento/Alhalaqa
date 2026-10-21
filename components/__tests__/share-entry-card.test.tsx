// components/__tests__/share-entry-card.test.tsx
// Dominant entry-point distribution: one link + the teacher code, system share
// on phones, clipboard fallback everywhere else, rotation without losing the
// link (existing claims keep working).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShareEntryCard } from '@/components/dashboard/share-entry-card'
import { PAY_ENTRY_URL } from '@/lib/pay-host'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ShareEntryCard', () => {
  it('shows the entry link dominantly', () => {
    render(<ShareEntryCard />)
    expect(screen.getByTestId('share-entry-card')).toBeTruthy()
    expect(screen.getByText(/ادعُ أولياء الأمور/)).toBeTruthy()
    expect(screen.getByText(PAY_ENTRY_URL)).toBeTruthy()
  })

  it('uses the system share sheet when available', async () => {
    const share = vi.fn(async () => {})
    vi.stubGlobal('navigator', { ...navigator, share })
    render(<ShareEntryCard />)
    fireEvent.click(screen.getByRole('button', { name: /مشاركة/ }))
    await waitFor(() => expect(share).toHaveBeenCalledOnce())
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: PAY_ENTRY_URL }))
  })

  it('falls back to clipboard with confirmation when share is absent', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } })
    render(<ShareEntryCard />)
    fireEvent.click(screen.getByRole('button', { name: /مشاركة/ }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining(PAY_ENTRY_URL)))
    await waitFor(() => expect(screen.getByTestId('share-entry-copied')).toBeTruthy())
  })

  it('omits the code block when no code is available', () => {
    render(<ShareEntryCard />)
    expect(screen.queryByTestId('share-entry-code')).toBeNull()
  })

  it('shows the code in readable groups', () => {
    render(<ShareEntryCard joinCode="ABCDEFGH" />)
    expect(screen.getByTestId('share-entry-code').textContent).toBe('ABCD-EFGH')
  })

  it('includes the code in the share text', async () => {
    const share = vi.fn(async () => {})
    vi.stubGlobal('navigator', { ...navigator, share })
    render(<ShareEntryCard joinCode="ABCDEFGH" />)
    fireEvent.click(screen.getByRole('button', { name: /مشاركة/ }))
    await waitFor(() => expect(share).toHaveBeenCalledOnce())
    const calls = share.mock.calls as unknown as Array<[{ text?: string }]>
    expect(calls[0]?.[0]?.text).toContain('ABCD-EFGH')
  })

  it('copies just the code', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    render(<ShareEntryCard joinCode="ABCDEFGH" />)
    fireEvent.click(screen.getByRole('button', { name: /نسخ الكود/ }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('ABCD-EFGH'))
  })

  it('confirms in a dialog, then rotates the code and keeps the link', async () => {
    const onRotate = vi.fn(async () => ({ code: 'JKMNPQRS' }))
    render(<ShareEntryCard joinCode="ABCDEFGH" onRotate={onRotate} />)
    fireEvent.click(screen.getByTestId('share-entry-rotate'))
    expect(screen.getByText('تغيير كود الانضمام؟')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('share-entry-rotate-confirm'))
    await waitFor(() => expect(onRotate).toHaveBeenCalledOnce())
    await waitFor(() =>
      expect(screen.getByTestId('share-entry-code').textContent).toBe('JKMN-PQRS'),
    )
    expect(screen.getByTestId('share-entry-rotate-ok')).toBeInTheDocument()
    expect(screen.getByText(PAY_ENTRY_URL)).toBeTruthy()
  })

  it('does nothing when the confirm dialog is cancelled', () => {
    const onRotate = vi.fn(async () => ({ code: 'JKMNPQRS' }))
    render(<ShareEntryCard joinCode="ABCDEFGH" onRotate={onRotate} />)
    fireEvent.click(screen.getByTestId('share-entry-rotate'))
    fireEvent.click(screen.getByText('إلغاء'))
    expect(onRotate).not.toHaveBeenCalled()
    expect(screen.getByTestId('share-entry-code').textContent).toBe('ABCD-EFGH')
  })

  it('surfaces a rotation failure instead of faking success', async () => {
    const onRotate = vi.fn(async () => ({ error: 'تعذر تغيير الكود' }))
    render(<ShareEntryCard joinCode="ABCDEFGH" onRotate={onRotate} />)
    fireEvent.click(screen.getByTestId('share-entry-rotate'))
    fireEvent.click(screen.getByTestId('share-entry-rotate-confirm'))
    await waitFor(() => expect(screen.getByTestId('share-entry-rotate-error')).toBeTruthy())
    expect(screen.getByTestId('share-entry-code').textContent).toBe('ABCD-EFGH')
  })
})
