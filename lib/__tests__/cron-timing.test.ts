import { describe, it, expect } from 'vitest'
import {
  cairoDateKey,
  cairoHour,
  dueTriggers,
} from '@/lib/cron-schedule'
import {
  buildDailyDigestPayload,
  buildOverdueEscalationPayload,
} from '@/lib/push-payloads'

// September = Cairo UTC+3 (DST). Fixed instants pin exact windows.
describe('cron-schedule (Cairo hour gates)', () => {
  it('maps UTC instants to Cairo hours', () => {
    expect(cairoHour(new Date('2026-09-24T07:00:00Z'))).toBe(10)
    expect(cairoHour(new Date('2026-09-24T05:00:00Z'))).toBe(8)
    expect(cairoHour(new Date('2026-09-24T17:00:00Z'))).toBe(20)
  })

  it('keys idempotency by Cairo calendar date', () => {
    // 22:30 UTC Sep 24 = 01:30 Cairo Sep 25 — date flips on Cairo time.
    expect(cairoDateKey(new Date('2026-09-24T22:30:00Z'))).toBe('2026-09-25')
    expect(cairoDateKey(new Date('2026-09-24T07:00:00Z'))).toBe('2026-09-24')
  })

  it('fires nag + escalation at 10:00 only', () => {
    expect(dueTriggers(new Date('2026-09-24T07:00:00Z'))).toEqual([
      'payer_nag',
      'escalation',
    ])
  })

  it('fires morning digest at 08:00, evening at 20:00, nothing at 03:00', () => {
    expect(dueTriggers(new Date('2026-09-24T05:00:00Z'))).toEqual(['digest_morning'])
    expect(dueTriggers(new Date('2026-09-24T17:00:00Z'))).toEqual(['digest_evening'])
    expect(dueTriggers(new Date('2026-09-24T00:00:00Z'))).toEqual([])
  })

  it('handles winter (UTC+2, no DST) the same way', () => {
    // January = UTC+2: 08:00 UTC = 10:00 Cairo.
    expect(cairoHour(new Date('2026-01-15T08:00:00Z'))).toBe(10)
    expect(dueTriggers(new Date('2026-01-15T08:00:00Z'))).toEqual([
      'payer_nag',
      'escalation',
    ])
  })
})

describe('escalation + digest payloads', () => {
  it('escalation names days-overdue, null when empty', () => {
    expect(
      buildOverdueEscalationPayload({ teacherProfileId: 't', overdue: [] }),
    ).toBeNull()
    const built = buildOverdueEscalationPayload({
      teacherProfileId: 't',
      overdue: [{ name: 'أحمد', daysOverdue: 5 }],
    })
    expect(built?.payload.body).toContain('5 أيام')
    expect(built?.payload.url).toBe('/dashboard')
  })

  it('digest covers pending + overdue + unclaimed, null when clean', () => {
    expect(
      buildDailyDigestPayload({
        teacherProfileId: 't',
        pendingCount: 0,
        overdueNames: [],
        unclaimedCount: 0,
      }),
    ).toBeNull()
    const morning = buildDailyDigestPayload({
      teacherProfileId: 't',
      pendingCount: 2,
      overdueNames: ['أحمد'],
      unclaimedCount: 1,
      evening: false,
    })
    expect(morning?.payload.title).toBe('ملخص الصباح')
    expect(morning?.payload.body).toContain('2')
    expect(morning?.payload.url).toBe('/dashboard/unpaid')
    const evening = buildDailyDigestPayload({
      teacherProfileId: 't',
      pendingCount: 0,
      overdueNames: ['أحمد'],
      unclaimedCount: 0,
      evening: true,
    })
    expect(evening?.payload.title).toBe('ملخص المساء')
  })
})
