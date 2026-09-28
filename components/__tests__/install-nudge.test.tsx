// components/__tests__/install-nudge.test.tsx
// B slice — dashboard settings install card: hidden when standalone,
// coach otherwise, Later hides it for the session.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InstallNudge } from '@/components/pwa/install-nudge'

function setStandalone(standalone: boolean) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: standalone })))
  Object.defineProperty(window.navigator, 'standalone', {
    value: standalone,
    configurable: true,
  })
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('InstallNudge', () => {
  it('renders nothing when already installed (standalone)', () => {
    setStandalone(true)
    const { container } = render(<InstallNudge />)
    expect(container.innerHTML).toBe('')
  })

  it('shows the install coach when not installed', () => {
    setStandalone(false)
    render(<InstallNudge />)
    expect(screen.getByTestId('install-coach')).toBeTruthy()
  })

  it('Later hides the card', () => {
    setStandalone(false)
    const { container } = render(<InstallNudge />)
    fireEvent.click(screen.getByRole('button', { name: /لاحق/ }))
    expect(container.innerHTML).toBe('')
  })
})
