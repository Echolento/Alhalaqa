// components/__tests__/my-payments-link.test.tsx
// B slice — conditional مدفوعاتي shortcut: visible ONLY when the teacher
// is also a payer (owns ≥1 claimed row). Never for teachers without claims.

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyPaymentsLink } from '@/components/dashboard/my-payments-link'

describe('MyPaymentsLink', () => {
  it('renders nothing when the teacher owns no claims', () => {
    const { container } = render(<MyPaymentsLink visible={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('links to the payer hub when the teacher is also a payer', () => {
    render(<MyPaymentsLink visible />)
    const link = screen.getByTestId('my-payments-link')
    expect(link.getAttribute('href')).toBe('/pay')
    expect(screen.getByText(/مدفوعاتي/)).toBeTruthy()
  })
})
