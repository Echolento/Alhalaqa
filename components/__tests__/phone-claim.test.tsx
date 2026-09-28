// components/__tests__/phone-claim.test.tsx
// Phone-pull claim: type phone → see matches → login → they're linked.
// Zero claim taps: with a session the matches auto-link; without one the
// email leg runs first. Typo recovery = per-row unlink. Seams everywhere.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhoneClaim } from '@/components/claim/phone-claim'

const matches = [
  { studentId: 's1', studentName: 'Karim', teacherId: 't1', teacherName: 'Sheikh Ali' },
  { studentId: 's2', studentName: 'Layla', teacherId: 't2', teacherName: 'Sheikh Omar' },
]

function typePhone(phone = '01055556666') {
  fireEvent.change(screen.getByLabelText(/رقم الموبايل/), { target: { value: phone } })
  fireEvent.click(screen.getByRole('button', { name: /متابعة/ }))
}

describe('PhoneClaim', () => {
  it('rejects a malformed number without looking up', async () => {
    const onLookup = vi.fn()
    render(<PhoneClaim session={null} onLookup={onLookup} />)
    typePhone('12345')
    await waitFor(() => expect(screen.getByTestId('phone-claim-error')).toBeTruthy())
    expect(onLookup).not.toHaveBeenCalled()
  })

  it('without a session shows matches plus the email leg (no auto-claim)', async () => {
    const onLookup = vi.fn(async () => ({ students: matches }))
    const onClaim = vi.fn()
    render(<PhoneClaim session={null} onLookup={onLookup} onClaim={onClaim} />)
    typePhone()
    await waitFor(() => expect(screen.getByTestId('phone-claim-matches')).toBeTruthy())
    expect(screen.getByText(/Karim/)).toBeTruthy()
    expect(screen.getByText(/Layla/)).toBeTruthy()
    expect(screen.getByTestId('phone-claim-email')).toBeTruthy()
    expect(onClaim).not.toHaveBeenCalled()
  })

  it('with a session auto-links matches, zero taps', async () => {
    const onLookup = vi.fn(async () => ({ students: matches }))
    const onClaim = vi.fn(async () => ({ success: true, claimed: matches }))
    render(
      <PhoneClaim
        session={{ email: 'p@mail.com' }}
        onLookup={onLookup}
        onClaim={onClaim}
      />,
    )
    typePhone()
    await waitFor(() => expect(onClaim).toHaveBeenCalledWith('1055556666'))
    await waitFor(() => expect(screen.getByTestId('phone-claim-success')).toBeTruthy())
    expect(screen.getByText(/تتابع رسوم: Karim، Layla/)).toBeTruthy()
  })

  it('empty matches explain the fallback (links still exist)', async () => {
    const onLookup = vi.fn(async () => ({ students: [] }))
    render(<PhoneClaim session={null} onLookup={onLookup} />)
    typePhone()
    await waitFor(() => expect(screen.getByTestId('phone-claim-empty')).toBeTruthy())
    expect(screen.getByText(/رابط دعوة/)).toBeTruthy()
  })

  it('wrong-number escape returns to entry', async () => {
    const onLookup = vi.fn(async () => ({ students: matches }))
    render(<PhoneClaim session={null} onLookup={onLookup} />)
    typePhone()
    await waitFor(() => expect(screen.getByTestId('phone-claim-matches')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /رقم غلط/ }))
    expect(screen.getByLabelText(/رقم الموبايل/)).toBeTruthy()
    expect(screen.queryByTestId('phone-claim-matches')).toBeNull()
  })

  it('unlink removes a typo-linked row', async () => {
    const onLookup = vi.fn(async () => ({ students: matches }))
    const onClaim = vi.fn(async () => ({ success: true, claimed: matches }))
    const onUnlink = vi.fn(async () => ({ success: true }))
    render(
      <PhoneClaim
        session={{ email: 'p@mail.com' }}
        onLookup={onLookup}
        onClaim={onClaim}
        onUnlink={onUnlink}
      />,
    )
    typePhone()
    await waitFor(() => expect(screen.getByTestId('phone-claim-success')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: /فك الربط/ })[0]!)
    await waitFor(() => expect(onUnlink).toHaveBeenCalledWith('s1'))
    await waitFor(() => expect(screen.queryByText(/Karim/)).toBeNull())
  })

  it('initialPhone auto-runs lookup on mount (OTP return leg)', async () => {
    const onLookup = vi.fn(async () => ({ students: matches }))
    render(
      <PhoneClaim
        session={{ email: 'p@mail.com' }}
        initialPhone="01055556666"
        onLookup={onLookup}
        onClaim={vi.fn(async () => ({ success: true, claimed: matches }))}
      />,
    )
    await waitFor(() => expect(onLookup).toHaveBeenCalledWith('1055556666'))
    await waitFor(() => expect(screen.getByTestId('phone-claim-success')).toBeTruthy())
  })
})
