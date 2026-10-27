import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// The /install page is the one-time way out of a host that cannot open the
// contact picker (Samsung Internet, in-app browsers). It must never promise a
// button the browser didn't offer.
const mocks = vi.hoisted(() => ({
  prompt: vi.fn(),
  standalone: vi.fn(),
}))

vi.mock('@/hooks/use-install-prompt', () => ({
  useInstallPrompt: () => ({ canInstall: mocks.prompt(), promptInstall: vi.fn() }),
  isStandaloneDisplay: () => mocks.standalone(),
}))

import { InstallPageCard } from '@/components/pwa/install-page-card'

beforeEach(() => {
  mocks.prompt.mockReset()
  mocks.standalone.mockReset()
  mocks.standalone.mockReturnValue(false)
})

describe('InstallPageCard', () => {
  it('shows the native install button when Chrome handed us the prompt', () => {
    mocks.prompt.mockReturnValue(true)
    render(<InstallPageCard />)
    expect(screen.getByRole('button', { name: /ثبّت التطبيق الآن/ })).toBeTruthy()
  })

  it('falls back to manual steps when there is no prompt', () => {
    mocks.prompt.mockReturnValue(false)
    render(<InstallPageCard />)
    expect(screen.getByText(/اضغط زر القائمة/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /ثبّت التطبيق الآن/ })).toBeNull()
  })

  it('tells an already-installed user the icon came from another browser', () => {
    mocks.prompt.mockReturnValue(false)
    mocks.standalone.mockReturnValue(true)
    render(<InstallPageCard />)
    expect(screen.getByText(/الأيقونة مثبّتة من متصفح غير Chrome/)).toBeTruthy()
  })
})
