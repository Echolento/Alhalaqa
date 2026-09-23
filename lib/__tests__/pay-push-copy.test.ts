// UNVERIFIED — written under the #35 zero-shell constraint (no test run yet).
// Run pending: npx vitest run lib/__tests__/pay-push-copy.test.ts
import { describe, it, expect } from 'vitest'
import { PAY_PUSH_COPY } from '@/lib/pay-push-copy'

// Guard: every user-facing string for #35 lives in ONE obvious place.
// If a component hardcodes a duplicate, add it here instead and import it.
// HITL: a human must approve the Arabic wording before merge.
describe('PAY_PUSH_COPY (single source of truth, HITL review)', () => {
  it('explains all 3 notification types (due-amount + pay-link + verdict)', () => {
    expect(PAY_PUSH_COPY.typeDueTitle).toContain('المبلغ المستحق')
    expect(PAY_PUSH_COPY.typeDueDescription).toContain('الرسوم')
    expect(PAY_PUSH_COPY.typePayLinkTitle).toContain('رابط الدفع')
    expect(PAY_PUSH_COPY.typePayLinkDescription).toContain('صفحة الدفع')
    expect(PAY_PUSH_COPY.typeVerdictTitle).toContain('مراجعة الإيصال')
    expect(PAY_PUSH_COPY.typeVerdictDescription).toContain('قبول الإيصال')
  })

  it('exposes the onboarding prompt titles', () => {
    expect(PAY_PUSH_COPY.onboardingTitle).toContain('إشعارات الدفع')
    expect(PAY_PUSH_COPY.onboardingDescription).toContain('الإشعارات')
  })

  it('exposes distinct subscribe / subscribed / unsubscribe labels', () => {
    expect(PAY_PUSH_COPY.subscribeCta).toContain('تفعيل')
    expect(PAY_PUSH_COPY.subscribedLabel).toContain('مفعّلة')
    expect(PAY_PUSH_COPY.unsubscribeLabel).toContain('إيقاف')
    expect(PAY_PUSH_COPY.subscribeCta).not.toBe(PAY_PUSH_COPY.unsubscribeLabel)
    expect(PAY_PUSH_COPY.subscribeAriaLabel.length).toBeGreaterThan(0)
    expect(PAY_PUSH_COPY.unsubscribeAriaLabel.length).toBeGreaterThan(0)
    expect(PAY_PUSH_COPY.loadingLabel.length).toBeGreaterThan(0)
  })

  it('exposes error + denied-permission help copy', () => {
    expect(PAY_PUSH_COPY.deniedHelp).toContain('محظورة')
    expect(PAY_PUSH_COPY.errorGeneric).toContain('تعذر')
    expect(PAY_PUSH_COPY.permissionDeniedLabel).toContain('الإذن')
  })

  it('exposes the iOS Add-to-Home-Screen coach (3+ steps)', () => {
    expect(PAY_PUSH_COPY.iosCoachTitle).toContain('الشاشة الرئيسية')
    expect(PAY_PUSH_COPY.iosCoachDescription).toContain('Safari')
    expect(PAY_PUSH_COPY.iosCoachSteps.length).toBeGreaterThanOrEqual(3)
    expect(PAY_PUSH_COPY.iosCoachSteps.join(' ')).toContain('المشاركة')
    expect(PAY_PUSH_COPY.iosCoachNote).toContain('الأيقونة')
  })

  it('exposes the dismiss label', () => {
    expect(PAY_PUSH_COPY.skipLabel).toContain('لاحقاً')
    expect(PAY_PUSH_COPY.skipAriaLabel.length).toBeGreaterThan(0)
  })

  it('keeps every static string non-empty (no missing copy)', () => {
    const strings = [
      PAY_PUSH_COPY.onboardingTitle,
      PAY_PUSH_COPY.onboardingDescription,
      PAY_PUSH_COPY.typeDueTitle,
      PAY_PUSH_COPY.typeDueDescription,
      PAY_PUSH_COPY.typePayLinkTitle,
      PAY_PUSH_COPY.typePayLinkDescription,
      PAY_PUSH_COPY.typeVerdictTitle,
      PAY_PUSH_COPY.typeVerdictDescription,
      PAY_PUSH_COPY.subscribeCta,
      PAY_PUSH_COPY.subscribeAriaLabel,
      PAY_PUSH_COPY.subscribedLabel,
      PAY_PUSH_COPY.subscribedNote,
      PAY_PUSH_COPY.unsubscribeLabel,
      PAY_PUSH_COPY.unsubscribeAriaLabel,
      PAY_PUSH_COPY.loadingLabel,
      PAY_PUSH_COPY.deniedHelp,
      PAY_PUSH_COPY.permissionDeniedLabel,
      PAY_PUSH_COPY.errorGeneric,
      PAY_PUSH_COPY.iosCoachTitle,
      PAY_PUSH_COPY.iosCoachDescription,
      PAY_PUSH_COPY.iosCoachNote,
      PAY_PUSH_COPY.skipLabel,
      PAY_PUSH_COPY.skipAriaLabel,
      ...PAY_PUSH_COPY.iosCoachSteps,
    ]
    for (const s of strings) expect(s.trim().length).toBeGreaterThan(1)
  })
})
