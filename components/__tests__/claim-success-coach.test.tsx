// components/__tests__/claim-success-coach.test.tsx
// A2 slice — redeemed claim flows phone-confirm FIRST, then install coach,
// then pay link. Seams: onRedeem (extended with claimedPhone),
// onUpdatePhone (defaults to the updateClaimedPhone server action).

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClaimScreen } from '@/components/claim/claim-screen'

const base = {
  token: 'tok',
  studentName: 'أحمد',
  teacherName: 'الشيخ',
  session: { email: 'payer@mail.com' },
}

describe('ClaimScreen success flow', () => {
  it('shows phone-confirm before the coach', async () => {
    render(
      <ClaimScreen
        {...base}
        onRedeem={async () => ({ success: true, studentId: 'stu-1', claimedPhone: '+201012345678' })}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /تأكيد الربط/ }))
    await waitFor(() => expect(screen.getByTestId('claim-phone-confirm')).toBeTruthy())
    expect(screen.getByText(/\+201012345678/)).toBeTruthy()
    // Coach must NOT show yet.
    expect(screen.queryByTestId('install-coach')).toBeNull()
  })

  it('confirming the phone reveals the install coach', async () => {
    render(
      <ClaimScreen
        {...base}
        onRedeem={async () => ({ success: true, studentId: 'stu-1', claimedPhone: '+201012345678' })}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /تأكيد الربط/ }))
    await waitFor(() => expect(screen.getByTestId('claim-phone-confirm')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /الرقم صحيح/ }))
    await waitFor(() => expect(screen.getByTestId('install-coach')).toBeTruthy())
  })

  it('editing the phone saves via onUpdatePhone before coaching', async () => {
    const onUpdatePhone = vi.fn(
      async (_studentId: string, _phone: string) => ({ success: true as const, phone: '+201099988877' }),
    )
    render(
      <ClaimScreen
        {...base}
        onRedeem={async () => ({ success: true, studentId: 'stu-1', claimedPhone: '+201012345678' })}
        onUpdatePhone={onUpdatePhone}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /تأكيد الربط/ }))
    await waitFor(() => expect(screen.getByTestId('claim-phone-confirm')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /تعديل الرقم/ }))
    fireEvent.change(screen.getByTestId('claim-phone-input'), {
      target: { value: '010999888777' },
    })
    fireEvent.click(screen.getByRole('button', { name: /حفظ الرقم/ }))
    await waitFor(() => expect(onUpdatePhone).toHaveBeenCalledWith('stu-1', '010999888777'))
    await waitFor(() => expect(screen.getByTestId('install-coach')).toBeTruthy())
  })
})
