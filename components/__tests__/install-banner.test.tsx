// components/__tests__/install-banner.test.tsx
// B slice — /pay re-nag banner: shows every visit until installed,
// per-visit dismiss (no persistence — nag returns next visit), hidden
// entirely in standalone display mode.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InstallBanner } from '@/components/pwa/install-banner'

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

describe('InstallBanner', () => {
  it('renders nothing when already installed (standalone)', () => {
    setStandalone(true)
    const { container } = render(<InstallBanner />)
    expect(container.innerHTML).toBe('')
  })

  it('nags every visit until installed', () => {
    setStandalone(false)
    render(<InstallBanner />)
    expect(screen.getByTestId('install-banner')).toBeTruthy()
  })

  it('dismisses for this visit only (per-visit, never permanent)', () => {
    setStandalone(false)
    const { container } = render(<InstallBanner />)
    fireEvent.click(screen.getByTestId('install-banner-dismiss'))
    expect(container.innerHTML).toBe('')
  })
})
