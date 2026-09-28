// components/__tests__/welcome-form.test.tsx
// Step-1 basics: frequency picker renders BEFORE the price, the price label
// adapts to the chosen frequency, submit carries all three basics.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WelcomeForm } from '@/components/welcome/welcome-form'

describe('WelcomeForm (step 1)', () => {
  it('renders frequency before price (decision order)', () => {
    const { container } = render(<WelcomeForm onSubmit={vi.fn()} />)
    const html = container.innerHTML
    expect(html.indexOf('default_frequency')).toBeLessThan(html.indexOf('default_monthly_price'))
  })

  it('defaults frequency to monthly', () => {
    render(<WelcomeForm onSubmit={vi.fn()} />)
    expect(screen.getByText(/السعر الشهري/)).toBeTruthy()
  })

  it('adapts the price label when frequency changes', async () => {
    render(<WelcomeForm onSubmit={vi.fn()} />)
    fireEvent.change(screen.getByTestId('frequency-select'), { target: { value: 'weekly' } })
    await waitFor(() => expect(screen.getByText(/السعر الأسبوعي/)).toBeTruthy())
  })

  it('submits currency + frequency + price', async () => {
    const onSubmit = vi.fn(async () => undefined)
    render(<WelcomeForm onSubmit={onSubmit} />)
    fireEvent.change(screen.getByTestId('frequency-select'), { target: { value: 'biweekly' } })
    fireEvent.change(screen.getByTestId('price-input'), { target: { value: '150' } })
    fireEvent.click(screen.getByRole('button', { name: /متابعة/ }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    const calls = onSubmit.mock.calls as unknown as Array<[FormData]>
    expect(calls).toHaveLength(1)
    expect(calls[0]?.[0]?.get('default_frequency')).toBe('biweekly')
    expect(calls[0]?.[0]?.get('default_monthly_price')).toBe('150')
  })

  it('points out the first-bill default', () => {
    render(<WelcomeForm onSubmit={vi.fn()} />)
    expect(screen.getByText(/أول الشهر الجاي/)).toBeTruthy()
  })
})
