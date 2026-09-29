// components/__tests__/share-entry-card.test.tsx
// Dominant entry-point distribution: one link, system share on phones,
// clipboard fallback everywhere else, copied confirmation.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShareEntryCard } from '@/components/dashboard/share-entry-card'
import { PAY_ENTRY_URL } from '@/lib/pay-host'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
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
})
