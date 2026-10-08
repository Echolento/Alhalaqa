import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ConfirmPage from '@/app/auth/confirm/page'

describe('ConfirmPage (prefetch-proof landing)', () => {
  it('renders a confirm button and carries the token in a hidden POST form', async () => {
    const ui = await ConfirmPage({
      searchParams: Promise.resolve({ token_hash: 'abc', type: 'email', next: '/pay' }),
    })
    const { container } = render(ui)

    expect(screen.getByRole('button', { name: /تأكيد الدخول/ })).toBeInTheDocument()
    const form = container.querySelector('form') as HTMLFormElement
    expect(form.getAttribute('method')?.toLowerCase()).toBe('post')
    expect(form.getAttribute('action')).toBe('/auth/confirm/verify')
    expect((container.querySelector('input[name="token_hash"]') as HTMLInputElement).value).toBe('abc')
    expect((container.querySelector('input[name="type"]') as HTMLInputElement).value).toBe('email')
    expect((container.querySelector('input[name="next"]') as HTMLInputElement).value).toBe('/pay')
  })
})
