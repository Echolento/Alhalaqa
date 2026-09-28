// components/__tests__/instapay-form.test.tsx
// Step-2 InstaPay: optional contract, finishes to dashboard, faint Later
// skips straight to dashboard (settings cover it later).

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InstapayForm } from '@/components/welcome/instapay-form'

describe('InstapayForm (step 2)', () => {
  it('renders link + handle fields', () => {
    render(<InstapayForm onSubmit={vi.fn()} />)
    expect(screen.getByTestId('instapay-link-input')).toBeTruthy()
    expect(screen.getByTestId('instapay-handle-input')).toBeTruthy()
  })

  it('submits the contract', async () => {
    const onSubmit = vi.fn(async () => undefined)
    render(<InstapayForm onSubmit={onSubmit} />)
    fireEvent.change(screen.getByTestId('instapay-link-input'), {
      target: { value: 'https://ipn.eg/S/abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: /إنهاء الإعداد/ }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    const calls = onSubmit.mock.calls as unknown as Array<[FormData]>
    expect(calls).toHaveLength(1)
    expect(calls[0]?.[0]?.get('instapay_link')).toBe('https://ipn.eg/S/abc')
  })

  it('Later is faint and goes to dashboard', () => {
    render(<InstapayForm onSubmit={vi.fn()} />)
    const later = screen.getByRole('link', { name: /لاحقاً/ })
    expect(later.getAttribute('href')).toBe('/dashboard')
    expect(later.className).toMatch(/text-muted-foreground/)
  })
})
