// components/__tests__/phone-claim.test.tsx
// Teacher-code claim: phone → email magic-link → teacher code → linked.
// The code is the teacher's vouch; no names are shown before it is accepted.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhoneClaim } from '@/components/claim/phone-claim'

const matches = [
  { studentId: 's1', studentName: 'Karim', teacherId: 't1', teacherName: 'Sheikh Ali' },
  { studentId: 's2', studentName: 'Layla', teacherId: 't1', teacherName: 'Sheikh Ali' },
]

const SESSION = { email: 'p@mail.com' }

function typePhone(phone = '01055556666') {
  fireEvent.change(screen.getByLabelText(/رقم الموبايل/), { target: { value: phone } })
  fireEvent.click(screen.getByRole('button', { name: /متابعة/ }))
}

function typeCode(code = 'abcdefgh') {
  fireEvent.change(screen.getByTestId('phone-claim-code'), { target: { value: code } })
  fireEvent.click(screen.getByRole('button', { name: /تأكيد الكود/ }))
}

describe('PhoneClaim', () => {
  it('rejects a malformed number without calling the server', async () => {
    const onClaim = vi.fn()
    render(<PhoneClaim session={null} onClaim={onClaim} />)
    typePhone('12345')
    await waitFor(() => expect(screen.getByTestId('phone-claim-error')).toBeTruthy())
    expect(onClaim).not.toHaveBeenCalled()
  })

  it('without a session runs the email leg and reveals no names', async () => {
    const onClaim = vi.fn()
    render(<PhoneClaim session={null} onClaim={onClaim} />)
    typePhone()
    await waitFor(() => expect(screen.getByTestId('phone-claim-email')).toBeTruthy())
    expect(screen.queryByText(/Karim/)).toBeNull()
    expect(screen.queryByText(/Layla/)).toBeNull()
    expect(onClaim).not.toHaveBeenCalled()
  })

  it('with a session asks for the teacher code (still no names)', async () => {
    const onClaim = vi.fn()
    render(<PhoneClaim session={SESSION} onClaim={onClaim} />)
    typePhone()
    await waitFor(() => expect(screen.getByTestId('phone-claim-code')).toBeTruthy())
    expect(screen.queryByText(/Karim/)).toBeNull()
    expect(onClaim).not.toHaveBeenCalled()
  })

  it('accepts a dashed code, normalizes it, and links', async () => {
    const onClaim = vi.fn(async () => ({ success: true, claimed: matches }))
    render(<PhoneClaim session={SESSION} onClaim={onClaim} />)
    typePhone()
    typeCode('abcd-efgh')
    await waitFor(() => expect(onClaim).toHaveBeenCalledWith('1055556666', 'ABCDEFGH'))
    await waitFor(() => expect(screen.getByTestId('phone-claim-success')).toBeTruthy())
    expect(screen.getByText(/تتابع رسوم: Karim، Layla/)).toBeTruthy()
  })

  it('rejects a malformed code without calling the server', async () => {
    const onClaim = vi.fn()
    render(<PhoneClaim session={SESSION} onClaim={onClaim} />)
    typePhone()
    typeCode('NOPE')
    await waitFor(() => expect(screen.getByTestId('phone-claim-error')).toBeTruthy())
    expect(onClaim).not.toHaveBeenCalled()
  })

  it('shows the server error for a wrong code and stays on the code step', async () => {
    const onClaim = vi.fn(async () => ({ error: 'الكود غير صحيح — راجع المعلم.' }))
    render(<PhoneClaim session={SESSION} onClaim={onClaim} />)
    typePhone()
    typeCode('ABCDEFGH')
    await waitFor(() => expect(screen.getByTestId('phone-claim-error').textContent).toContain('الكود غير صحيح'))
    expect(screen.getByTestId('phone-claim-code')).toBeTruthy()
    expect(screen.queryByTestId('phone-claim-success')).toBeNull()
  })

  it('unlink removes a typo-linked row', async () => {
    const onClaim = vi.fn(async () => ({ success: true, claimed: matches }))
    const onUnlink = vi.fn(async () => ({ success: true }))
    render(<PhoneClaim session={SESSION} onClaim={onClaim} onUnlink={onUnlink} />)
    typePhone()
    typeCode()
    await waitFor(() => expect(screen.getByTestId('phone-claim-success')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: /فك الربط/ })[0]!)
    await waitFor(() => expect(onUnlink).toHaveBeenCalledWith('s1'))
    await waitFor(() => expect(screen.queryByText(/Karim/)).toBeNull())
  })

  it('initialPhone + session lands on the code step (OTP return leg)', async () => {
    render(
      <PhoneClaim
        session={SESSION}
        initialPhone="01055556666"
        onClaim={vi.fn(async () => ({ success: true, claimed: matches }))}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('phone-claim-code')).toBeTruthy())
  })

  it('wrong-number escape returns to the phone entry', async () => {
    render(<PhoneClaim session={SESSION} onClaim={vi.fn()} />)
    typePhone()
    await waitFor(() => expect(screen.getByTestId('phone-claim-code')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /رقم غلط/ }))
    expect(screen.getByLabelText(/رقم الموبايل/)).toBeTruthy()
    expect(screen.queryByTestId('phone-claim-code')).toBeNull()
  })
})
