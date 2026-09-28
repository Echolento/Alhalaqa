// components/__tests__/billing-fields.test.tsx
// Shared add-student billing block: frequency FIRST, adaptive price label,
// explicit first-bill date. Named inputs feed addStudent opts.

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BillingFields } from '@/components/dashboard/billing-fields'

const defaults = { frequency: 'monthly', price: 200, nextDueDate: '2026-10-01' }

describe('BillingFields', () => {
  it('renders frequency before price (decision order)', () => {
    const { container } = render(<BillingFields defaults={defaults} />)
    const html = container.innerHTML
    expect(html.indexOf('name="frequency"')).toBeLessThan(html.indexOf('name="price"'))
  })

  it('prefills teacher defaults', () => {
    render(<BillingFields defaults={defaults} />)
    expect((screen.getByTestId('billing-frequency') as HTMLSelectElement).value).toBe('monthly')
    expect((screen.getByTestId('billing-price') as HTMLInputElement).value).toBe('200')
    expect((screen.getByTestId('billing-next-due') as HTMLInputElement).value).toBe('2026-10-01')
  })

  it('adapts the price label when frequency changes', async () => {
    render(<BillingFields defaults={defaults} />)
    fireEvent.change(screen.getByTestId('billing-frequency'), { target: { value: 'weekly' } })
    await waitFor(() => expect(screen.getByText(/السعر الأسبوعي/)).toBeTruthy())
  })

  it('points out the first-bill default', () => {
    render(<BillingFields defaults={defaults} />)
    expect(screen.getByText(/أول الشهر الجاي/)).toBeTruthy()
  })
})
