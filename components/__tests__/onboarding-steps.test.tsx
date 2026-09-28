// components/__tests__/onboarding-steps.test.tsx
// 3-circle stepper: done/current/todo states + half-filled connectors.
// Phone-friendly compact bar, RTL-safe.

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OnboardingSteps } from '@/components/onboarding/onboarding-steps'

describe('OnboardingSteps', () => {
  it('renders three labeled circles', () => {
    render(<OnboardingSteps active={1} />)
    const bar = screen.getByTestId('onboarding-steps')
    expect(bar).toBeTruthy()
    expect(screen.getByText('الحساب')).toBeTruthy()
    expect(screen.getByText('الرسوم')).toBeTruthy()
    expect(screen.getByText('الدفع')).toBeTruthy()
  })

  it('page 1: circle 1 done, circle 2 current, half connector between', () => {
    render(<OnboardingSteps active={1} />)
    expect(screen.getByTestId('step-1').dataset.state).toBe('done')
    expect(screen.getByTestId('step-2').dataset.state).toBe('current')
    expect(screen.getByTestId('step-3').dataset.state).toBe('todo')
    expect(screen.getByTestId('connector-1').dataset.fill).toBe('half')
    expect(screen.getByTestId('connector-2').dataset.fill).toBe('empty')
  })

  it('page 2: circles 1-2 done, half connector to circle 3', () => {
    render(<OnboardingSteps active={2} />)
    expect(screen.getByTestId('step-1').dataset.state).toBe('done')
    expect(screen.getByTestId('step-2').dataset.state).toBe('done')
    expect(screen.getByTestId('step-3').dataset.state).toBe('current')
    expect(screen.getByTestId('connector-1').dataset.fill).toBe('full')
    expect(screen.getByTestId('connector-2').dataset.fill).toBe('half')
  })
})
