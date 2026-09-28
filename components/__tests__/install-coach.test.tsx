// components/__tests__/install-coach.test.tsx
// A2 slice — InstallCoach per-platform branches + faint Later.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InstallCoach } from '@/components/pwa/install-coach'

describe('InstallCoach', () => {
  it('android branch shows the install affordance', () => {
    render(<InstallCoach platform="android" onLater={() => {}} />)
    expect(screen.getByTestId('install-coach')).toBeTruthy()
    // InstallButton renders nothing without a captured prompt — the branch
    // copy must still orient the user.
    expect(screen.getByText(/ثبّت/i)).toBeTruthy()
  })

  it('ios branch shows the 3-step Add-to-Home-Screen guide', () => {
    render(<InstallCoach platform="ios" onLater={() => {}} />)
    expect(screen.getByTestId('ios-install-steps')).toBeTruthy()
    expect(screen.getByText(/مشاركة/i)).toBeTruthy()
  })

  it('other branch shows generic guidance', () => {
    render(<InstallCoach platform="other" onLater={() => {}} />)
    expect(screen.getByTestId('install-coach')).toBeTruthy()
  })

  it('Later is faint and fires onLater (conscious skip, never prominent)', () => {
    const onLater = vi.fn()
    render(<InstallCoach platform="other" onLater={onLater} />)
    const later = screen.getByRole('button', { name: /لاحق/i })
    // Faint by construction: ghost chrome, low-contrast text.
    expect(later.className).toMatch(/text-muted-foreground/)
    fireEvent.click(later)
    expect(onLater).toHaveBeenCalledOnce()
  })
})
