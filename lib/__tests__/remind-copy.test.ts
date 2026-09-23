import { describe, it, expect } from 'vitest'
import { REMIND_COPY } from '@/lib/remind-copy'

// Guard: every user-facing string for #32 lives in ONE obvious place.
// If a component hardcodes a duplicate, add it here instead and import it.
describe('REMIND_COPY (single source of truth, HITL review)', () => {
  it('exposes the payer-phone relabel + helper', () => {
    expect(REMIND_COPY.payerPhoneLabel).toContain('ولي الأمر')
    expect(REMIND_COPY.payerPhoneHelper).toContain('إشعارات الدفع')
    expect(REMIND_COPY.payerPhoneHelper).toContain('وليس رقم الطالب')
  })

  it('exposes guardian-only invite copy with claim promise', () => {
    expect(REMIND_COPY.inviteButtonLabel).toContain('ولي الأمر')
    expect(REMIND_COPY.inviteButtonHelper).toContain('لولي الأمر فقط')
    expect(REMIND_COPY.inviteClaimNote).toContain('فور قبول الدعوة')
  })

  it('exposes manual remind copy that works with auto-toggle off', () => {
    expect(REMIND_COPY.remindButtonLabel.length).toBeGreaterThan(0)
    expect(REMIND_COPY.remindManualNote).toContain('حتى عند إيقاف التذكيرات التلقائية')
    expect(REMIND_COPY.remindSuccessTitle.length).toBeGreaterThan(0)
    expect(REMIND_COPY.remindTestTitle).toContain('تجريبي')
  })

  it('builds WhatsApp pre-fill text mentioning the student', () => {
    expect(REMIND_COPY.whatsappRemindText({ studentName: 'أحمد' })).toContain('أحمد')
    expect(
      REMIND_COPY.whatsappInviteText({ studentName: 'ليلى', inviteUrl: 'https://x.test/i' }),
    ).toContain('ليلى')
  })

  it('keeps every static string non-empty (no missing copy)', () => {
    const strings = [
      REMIND_COPY.payerPhoneLabel,
      REMIND_COPY.payerPhoneHelper,
      REMIND_COPY.inviteButtonLabel,
      REMIND_COPY.inviteButtonHelper,
      REMIND_COPY.inviteClaimNote,
      REMIND_COPY.remindButtonLabel,
      REMIND_COPY.remindManualNote,
      REMIND_COPY.remindSuccessTitle,
      REMIND_COPY.remindTestTitle,
      REMIND_COPY.remindTestDescription,
      REMIND_COPY.remindFailTitle,
      REMIND_COPY.whatsappShareLabel,
    ]
    for (const s of strings) expect(s.trim().length).toBeGreaterThan(1)
  })
})
