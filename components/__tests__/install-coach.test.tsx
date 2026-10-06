// components/__tests__/install-coach.test.tsx
// A2 slice — InstallCoach per-platform branches + faint Later.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { InstallCoach } from '@/components/pwa/install-coach'

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

function makePromptEvent(): PromptEvent {
  const e = new Event('beforeinstallprompt') as PromptEvent
  e.prompt = vi.fn(async () => {})
  e.userChoice = Promise.resolve({ outcome: 'accepted' })
  return e
}

beforeEach(() => {
  delete (window as unknown as { __deferredInstallPrompt?: unknown }).__deferredInstallPrompt
})

afterEach(() => {
  delete (window as unknown as { __deferredInstallPrompt?: unknown }).__deferredInstallPrompt
})

describe('InstallCoach', () => {
  it('android branch shows the install affordance', () => {
    render(<InstallCoach platform="android" onLater={() => {}} />)
    expect(screen.getByTestId('install-coach')).toBeTruthy()
    expect(screen.getByText(/ثبّت/i)).toBeTruthy()
  })

  it('android without a deferred prompt gives manual guidance, not a phantom button', () => {
    render(<InstallCoach platform="android" onLater={() => {}} />)
    expect(screen.queryByRole('button', { name: /ثبّت التطبيق/ })).toBeNull()
    expect(screen.getByText(/قائمة المتصفح/)).toBeTruthy()
  })

  it('android with a captured prompt shows the install button', async () => {
    render(<InstallCoach platform="android" onLater={() => {}} />)
    act(() => {
      window.dispatchEvent(makePromptEvent())
    })
    expect(await screen.findByRole('button', { name: /ثبّت التطبيق/ })).toBeTruthy()
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
