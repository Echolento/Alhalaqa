import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildManualRemindPayload } from '@/lib/push-payloads'

const mockTrigger = vi.fn()
const mockLog = vi.fn()

vi.mock('@/lib/push-triggers', () => ({
  triggerManualRemind: (...args: unknown[]) => mockTrigger(...args),
}))

vi.mock('@/lib/log-activity', () => ({
  logActivity: (...args: unknown[]) => mockLog(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockTrigger.mockResolvedValue({ success: true })
  mockLog.mockResolvedValue(undefined)
})

describe('sendManualRemind routing (reuses slice-1 trigger + payload builder)', () => {
  it('forwards to triggerManualRemind and logs on success', async () => {
    const { sendManualRemind } = await import('@/lib/remind-actions')
    const result = await sendManualRemind({
      studentId: 'stu-1',
      studentName: 'أحمد',
      payerProfileId: 'payer-1',
      amount: 200,
      currency: 'EGP',
      periodKey: '2026-09-01',
    })

    expect(result).toEqual({ success: true, testMode: false })
    expect(mockTrigger).toHaveBeenCalledOnce()
    expect(mockTrigger).toHaveBeenCalledWith({
      studentId: 'stu-1',
      payerProfileId: 'payer-1',
      studentName: 'أحمد',
      amount: 200,
      currency: 'EGP',
      periodKey: '2026-09-01',
    })
    expect(mockLog).toHaveBeenCalledOnce()
  })

  it('manual works without any auto-toggle flag (always sends when invoked)', async () => {
    const { sendManualRemind } = await import('@/lib/remind-actions')
    // No autoRemindersEnabled param exists by design — manual ignores the toggle.
    const result = await sendManualRemind({
      studentId: 'stu-2',
      studentName: 'عمر',
      payerProfileId: 'payer-2',
    })
    expect(result.success).toBe(true)
    expect(mockTrigger).toHaveBeenCalledOnce()
  })

  it('takes the test path (log + toast, no transport) when no payer is linked', async () => {
    const { sendManualRemind } = await import('@/lib/remind-actions')
    const result = await sendManualRemind({ studentId: 'stu-3', studentName: 'ليلى' })

    expect(result).toEqual({ success: false, reason: 'no_payer_yet', testMode: true })
    expect(mockTrigger).not.toHaveBeenCalled()
    expect(mockLog).toHaveBeenCalledOnce()
  })

  it('surfaces no_subscription without crashing', async () => {
    mockTrigger.mockResolvedValue({ success: false, reason: 'no_subscription' })
    const { sendManualRemind } = await import('@/lib/remind-actions')
    const result = await sendManualRemind({
      studentId: 'stu-4',
      studentName: 'سارة',
      payerProfileId: 'payer-4',
    })
    expect(result).toEqual({ success: false, reason: 'no_subscription', testMode: false })
    expect(mockLog).toHaveBeenCalledOnce()
  })

  it('reuses the slice-1 payload builder: manual URL points at the pay screen', () => {
    // Same builder the trigger uses, with mocked transport at the boundary —
    // the routing contract the button depends on.
    const target = buildManualRemindPayload({
      payerProfileId: 'payer-1',
      studentName: 'أحمد',
      studentId: 'stu-1',
      periodKey: '2026-09-01',
    })
    expect(target.profileId).toBe('payer-1')
    expect(target.payload.url).toBe('/pay?student=stu-1&period=2026-09-01')
    expect(target.payload.body).toContain('أحمد')
  })
})
