// components/__tests__/share-entry-card.test.tsx
// Dominant entry-point distribution: one link + the teacher code, system share
// on phones, clipboard fallback everywhere else, rotation without losing the
// link (existing claims keep working).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShareEntryCard } from '@/components/dashboard/share-entry-card'
import { PAY_ENTRY_URL } from '@/lib/pay-host'
import { getMyJoinCode, regenerateMyJoinCode } from '@/lib/join-code-actions'

vi.mock('@/lib/join-code-actions', () => ({
  regenerateMyJoinCode: vi.fn(),
  getMyJoinCode: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  document.cookie = 'share_entry_seen=; max-age=0; path=/'
  vi.mocked(getMyJoinCode).mockResolvedValue({ code: 'ABCDEFGH' })
  vi.mocked(regenerateMyJoinCode).mockResolvedValue({ code: 'JKMNPQRS' })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ShareEntryCard', () => {
  it('shows the entry link dominantly', () => {
    render(<ShareEntryCard defaultOpen />)
    expect(screen.getByTestId('share-entry-card')).toBeTruthy()
    expect(screen.getByText(/ادعُ أولياء الأمور/)).toBeTruthy()
    expect(screen.getByText(PAY_ENTRY_URL)).toBeTruthy()
  })

  it('is fully open on the first render and marks the card as seen', () => {
    render(<ShareEntryCard joinCode="ABCDEFGH" defaultOpen />)
    expect(screen.getByTestId('share-entry-toggle')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('share-entry-url')).toBeInTheDocument()
    expect(document.cookie).toContain('share_entry_seen=1')
  })

  it('starts collapsed on later visits and expands from the strip', async () => {
    render(<ShareEntryCard joinCode="ABCDEFGH" defaultOpen={false} />)
    const toggle = screen.getByTestId('share-entry-toggle')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('share-entry-url')).toBeNull()
    expect(screen.getByText(/ادعُ أولياء الأمور/)).toBeInTheDocument()

    fireEvent.click(toggle)
    await waitFor(() => expect(screen.getByTestId('share-entry-url')).toBeInTheDocument())
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('collapses on a header click but keeps the strip visible', async () => {
    render(<ShareEntryCard joinCode="ABCDEFGH" defaultOpen />)
    fireEvent.click(screen.getByTestId('share-entry-toggle'))
    await waitFor(() => expect(screen.queryByTestId('share-entry-url')).toBeNull())
    expect(screen.getByTestId('share-entry-card')).toBeInTheDocument()
    expect(screen.getByText(/ادعُ أولياء الأمور/)).toBeInTheDocument()
  })

  it('keeps a manual open when a later render marks the card seen', async () => {
    const { rerender } = render(<ShareEntryCard joinCode="ABCDEFGH" defaultOpen />)
    const toggle = screen.getByTestId('share-entry-toggle')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    rerender(<ShareEntryCard joinCode="ABCDEFGH" defaultOpen={false} />)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('share-entry-url')).toBeInTheDocument()
  })

  it('uses the system share sheet when available', async () => {
    const share = vi.fn(async () => {})
    vi.stubGlobal('navigator', { ...navigator, share })
    render(<ShareEntryCard defaultOpen />)
    fireEvent.click(screen.getByRole('button', { name: /مشاركة/ }))
    await waitFor(() => expect(share).toHaveBeenCalledOnce())
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: PAY_ENTRY_URL }))
  })

  it('falls back to clipboard with confirmation when share is absent', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } })
    render(<ShareEntryCard defaultOpen />)
    fireEvent.click(screen.getByRole('button', { name: /مشاركة/ }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining(PAY_ENTRY_URL)))
    await waitFor(() => expect(screen.getByTestId('share-entry-copied')).toBeTruthy())
  })

  it('omits the code block when no code is available', () => {
    render(<ShareEntryCard defaultOpen />)
    expect(screen.queryByTestId('share-entry-code')).toBeNull()
  })

  it('shows the code in readable groups', () => {
    render(<ShareEntryCard joinCode="ABCDEFGH" defaultOpen />)
    expect(screen.getByTestId('share-entry-code').textContent).toBe('ABCD-EFGH')
  })

  it('includes the code in the share text', async () => {
    const share = vi.fn(async () => {})
    vi.stubGlobal('navigator', { ...navigator, share })
    render(<ShareEntryCard joinCode="ABCDEFGH" defaultOpen />)
    fireEvent.click(screen.getByRole('button', { name: /مشاركة/ }))
    await waitFor(() => expect(share).toHaveBeenCalledOnce())
    const calls = share.mock.calls as unknown as Array<[{ text?: string }]>
    expect(calls[0]?.[0]?.text).toContain('ABCD-EFGH')
  })

  it('copies just the code', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    render(<ShareEntryCard joinCode="ABCDEFGH" defaultOpen />)
    fireEvent.click(screen.getByRole('button', { name: /نسخ الكود/ }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('ABCD-EFGH'))
  })

  it('confirms in a dialog, then rotates the code and keeps the link', async () => {
    render(<ShareEntryCard joinCode="ABCDEFGH" defaultOpen />)
    fireEvent.click(screen.getByTestId('share-entry-rotate'))
    expect(screen.getByText('تغيير كود الانضمام؟')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('share-entry-rotate-confirm'))
    await waitFor(() => expect(regenerateMyJoinCode).toHaveBeenCalledOnce())
    await waitFor(() =>
      expect(screen.getByTestId('share-entry-code').textContent).toBe('JKMN-PQRS'),
    )
    expect(screen.getByTestId('share-entry-rotate-ok')).toBeInTheDocument()
    expect(screen.getByText(PAY_ENTRY_URL)).toBeTruthy()
  })

  it('does nothing when the confirm dialog is cancelled', () => {
    render(<ShareEntryCard joinCode="ABCDEFGH" defaultOpen />)
    fireEvent.click(screen.getByTestId('share-entry-rotate'))
    fireEvent.click(screen.getByText('إلغاء'))
    expect(regenerateMyJoinCode).not.toHaveBeenCalled()
    expect(screen.getByTestId('share-entry-code').textContent).toBe('ABCD-EFGH')
  })

  it('surfaces a rotation failure instead of faking success', async () => {
    vi.mocked(regenerateMyJoinCode).mockResolvedValue({ error: 'تعذر تغيير الكود' })
    render(<ShareEntryCard joinCode="ABCDEFGH" defaultOpen />)
    fireEvent.click(screen.getByTestId('share-entry-rotate'))
    fireEvent.click(screen.getByTestId('share-entry-rotate-confirm'))
    await waitFor(() => expect(screen.getByTestId('share-entry-rotate-error')).toBeTruthy())
    expect(screen.getByTestId('share-entry-code').textContent).toBe('ABCD-EFGH')
  })

  it('recovers the new code when the rotation response is lost', async () => {
    vi.mocked(regenerateMyJoinCode).mockRejectedValue(new Error('network'))
    vi.mocked(getMyJoinCode).mockResolvedValue({ code: 'WXYZ2345' })
    render(<ShareEntryCard joinCode="ABCDEFGH" defaultOpen />)
    fireEvent.click(screen.getByTestId('share-entry-rotate'))
    fireEvent.click(screen.getByTestId('share-entry-rotate-confirm'))
    await waitFor(() =>
      expect(screen.getByTestId('share-entry-code').textContent).toBe('WXYZ-2345'),
    )
    expect(screen.getByTestId('share-entry-rotate-ok')).toBeInTheDocument()
    expect(screen.queryByTestId('share-entry-rotate-error')).toBeNull()
  })
})
