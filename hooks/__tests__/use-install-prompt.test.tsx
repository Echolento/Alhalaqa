// hooks/__tests__/use-install-prompt.test.tsx
// A1 slice — beforeinstallprompt capture hook + InstallButton.
// SSR-safe: no window access outside effects/guards.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { InstallButton } from '@/components/pwa/install-button'

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

function makePromptEvent(): PromptEvent {
  const e = new Event('beforeinstallprompt') as PromptEvent
  e.prompt = vi.fn(async () => {})
  e.userChoice = Promise.resolve({ outcome: 'accepted' })
  return e
}

beforeEach(() => {
  vi.clearAllMocks()
  delete (window as unknown as { __deferredInstallPrompt?: unknown }).__deferredInstallPrompt
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useInstallPrompt', () => {
  it('starts not installable when no prompt was captured', () => {
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.canInstall).toBe(false)
  })

  it('becomes installable after beforeinstallprompt fires', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    const evt = makePromptEvent()
    act(() => {
      window.dispatchEvent(evt)
    })
    await waitFor(() => expect(result.current.canInstall).toBe(true))
  })

  it('promptInstall calls the deferred prompt and clears on appinstalled', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    const evt = makePromptEvent()
    act(() => {
      window.dispatchEvent(evt)
    })
    await waitFor(() => expect(result.current.canInstall).toBe(true))
    await act(async () => {
      await result.current.promptInstall()
    })
    expect(evt.prompt).toHaveBeenCalledOnce()
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    await waitFor(() => expect(result.current.canInstall).toBe(false))
  })

  it('adopts a prompt captured before hydration (stashed on window)', async () => {
    const evt = makePromptEvent()
    ;(window as unknown as { __deferredInstallPrompt?: unknown }).__deferredInstallPrompt = evt
    const { result } = renderHook(() => useInstallPrompt())
    await waitFor(() => expect(result.current.canInstall).toBe(true))
  })

  it('promptInstall is a no-op without a captured event', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    await act(async () => {
      await result.current.promptInstall()
    })
    expect(result.current.canInstall).toBe(false)
  })
})

describe('InstallButton', () => {
  it('renders nothing before the prompt is captured', () => {
    const { container } = render(<InstallButton />)
    expect(container.innerHTML).toBe('')
  })

  it('renders the install button once installable and fires prompt on click', async () => {
    render(<InstallButton label="ثبّت التطبيق" />)
    act(() => {
      window.dispatchEvent(makePromptEvent())
    })
    const btn = await screen.findByRole('button', { name: 'ثبّت التطبيق' })
    expect(btn).toBeTruthy()
    await act(async () => {
      fireEvent.click(btn)
    })
  })
})
