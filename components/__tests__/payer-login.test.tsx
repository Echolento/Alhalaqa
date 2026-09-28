// components/__tests__/payer-login.test.tsx
// A3 slice — generic payer email-OTP login (no claim token involved).
// Sends the magic link back to /auth/callback?next=/pay (sanitized,
// same-origin). The browser client is seam-injected.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PayerLogin } from '@/components/pay/payer-login'

beforeEach(() => {
  vi.clearAllMocks()
})

function stubClient(opts: { error?: { message: string } | null } = {}) {
  const signInWithOtp = vi.fn(async () => ({ error: opts.error ?? null }))
  return { auth: { signInWithOtp }, signInWithOtp }
}

describe('PayerLogin', () => {
  it('rejects a malformed email without sending', async () => {
    const client = stubClient()
    const { container } = render(<PayerLogin createClient={() => client as never} />)
    fireEvent.change(screen.getByTestId('payer-login-email'), { target: { value: 'not-an-email' } })
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    await waitFor(() => expect(screen.getByTestId('payer-login-error')).toBeTruthy())
    expect(client.signInWithOtp).not.toHaveBeenCalled()
  })

  it('sends the OTP with callback back to /pay', async () => {
    const client = stubClient()
    const { container } = render(<PayerLogin createClient={() => client as never} />)
    fireEvent.change(screen.getByTestId('payer-login-email'), {
      target: { value: 'payer@mail.com' },
    })
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    await waitFor(() => expect(client.signInWithOtp).toHaveBeenCalledOnce())
    const calls = client.signInWithOtp.mock.calls as unknown as Array<
      [{ email: string; options: { emailRedirectTo: string } }]
    >
    expect(calls).toHaveLength(1)
    expect(calls[0]?.[0]?.email).toBe('payer@mail.com')
    expect(calls[0]?.[0]?.options?.emailRedirectTo).toContain('/auth/callback?next=%2Fpay')
  })

  it('surfaces send failures', async () => {
    const client = stubClient({ error: { message: 'boom' } })
    const { container } = render(<PayerLogin createClient={() => client as never} />)
    fireEvent.change(screen.getByTestId('payer-login-email'), {
      target: { value: 'payer@mail.com' },
    })
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    await waitFor(() => expect(screen.getByTestId('payer-login-error')).toBeTruthy())
  })
})
