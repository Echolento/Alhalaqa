import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AutoReminderToggle } from '@/components/dashboard/auto-reminder-toggle'
import { setAutoRemindersEnabled } from '@/lib/push-actions'

vi.mock('@/lib/push-actions', () => ({
  setAutoRemindersEnabled: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(setAutoRemindersEnabled).mockResolvedValue({ success: true } as any)
})

describe('AutoReminderToggle', () => {
  it('flips auto-due push off via server action', async () => {
    render(<AutoReminderToggle defaultEnabled />)
    const sw = screen.getByRole('switch')
    expect(sw).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(sw)

    expect(await screen.findByText('التذكير التلقائي متوقف')).toBeInTheDocument()
    expect(setAutoRemindersEnabled).toHaveBeenCalledWith(false)
  })
})
