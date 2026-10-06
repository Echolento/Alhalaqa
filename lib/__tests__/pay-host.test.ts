import { describe, it, expect } from 'vitest'
import { isPayHost, resolvePayRewrite, audienceFor } from '@/lib/pay-host'

describe('isPayHost', () => {
  it('matches the pay subdomain, with or without port', () => {
    expect(isPayHost('pay.alhalaqa.com')).toBe(true)
    expect(isPayHost('pay.alhalaqa.com:443')).toBe(true)
  })

  it('rejects apex, www, localhost, and lookalikes', () => {
    expect(isPayHost('alhalaqa.com')).toBe(false)
    expect(isPayHost('www.alhalaqa.com')).toBe(false)
    expect(isPayHost('localhost:3000')).toBe(false)
    expect(isPayHost('payal hala'.trim())).toBe(false)
    expect(isPayHost('notpay.alhalaqa.com')).toBe(false)
    expect(isPayHost('pay.evil.com')).toBe(true) // any pay.* — Vercel only routes ours
  })
})

describe('resolvePayRewrite', () => {
  it('sends pay-subdomain root to the phone-claim entry', () => {
    expect(resolvePayRewrite('/', 'pay.alhalaqa.com')).toBe('/claim')
  })

  it('leaves every other path and host alone', () => {
    expect(resolvePayRewrite('/pay', 'pay.alhalaqa.com')).toBeNull()
    expect(resolvePayRewrite('/claim?phone=x', 'pay.alhalaqa.com')).toBeNull()
    expect(resolvePayRewrite('/', 'alhalaqa.com')).toBeNull()
    expect(resolvePayRewrite('/', 'localhost:3000')).toBeNull()
  })
})

describe('audienceFor', () => {
  it('marks payer surfaces (pay host, /claim, /pay) as payer', () => {
    expect(audienceFor('/', 'pay.alhalaqa.com')).toBe('payer')
    expect(audienceFor('/claim', 'www.alhalaqa.com')).toBe('payer')
    expect(audienceFor('/pay', 'www.alhalaqa.com')).toBe('payer')
  })

  it('marks teacher surfaces (onboarding, dashboard) as teacher', () => {
    expect(audienceFor('/welcome', 'www.alhalaqa.com')).toBe('teacher')
    expect(audienceFor('/welcome/instapay', 'www.alhalaqa.com')).toBe('teacher')
    expect(audienceFor('/dashboard', 'www.alhalaqa.com')).toBe('teacher')
  })

  it('returns null for neutral routes', () => {
    expect(audienceFor('/', 'www.alhalaqa.com')).toBeNull()
    expect(audienceFor('/auth/login', 'www.alhalaqa.com')).toBeNull()
  })
})
