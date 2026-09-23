// UNVERIFIED — written under the #35 zero-shell constraint (no test run yet).
// Run pending: npx vitest run lib/__tests__/ios-push-coach.test.ts
import { describe, it, expect } from 'vitest'
import {
  IOS_STANDALONE_QUERY,
  detectIosPushCoachLive,
  isIosDevice,
  isStandaloneMode,
  needsIosPushCoach,
} from '@/lib/ios-push-coach'

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
const IPOD_UA =
  'Mozilla/5.0 (iPod touch; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
const IPAD_DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

describe('isIosDevice (detection matrix)', () => {
  it.each([
    ['iPhone Safari', IPHONE_UA, undefined, undefined, true],
    ['iPad Safari', IPAD_UA, undefined, undefined, true],
    ['iPod touch', IPOD_UA, undefined, undefined, true],
    ['iPadOS desktop mode (MacIntel + touch)', IPAD_DESKTOP_UA, 'MacIntel', 5, true],
    ['real Mac (MacIntel, no touch)', DESKTOP_UA, 'MacIntel', 0, false],
    ['Android Chrome', ANDROID_UA, undefined, undefined, false],
    ['desktop Chrome', DESKTOP_UA, undefined, undefined, false],
    ['empty UA', '', undefined, undefined, false],
    ['undefined UA', undefined, undefined, undefined, false],
  ])('%s -> %s', (_label, ua, platform, touch, expected) => {
    expect(isIosDevice(ua, platform, touch)).toBe(expected)
  })
})

describe('isStandaloneMode', () => {
  it('is true via navigator.standalone (iOS Safari)', () => {
    expect(isStandaloneMode({ standalone: true })).toBe(true)
  })

  it('is true via display-mode matchMedia', () => {
    expect(isStandaloneMode({ matchMediaStandalone: true })).toBe(true)
  })

  it('is false in a normal browser tab', () => {
    expect(isStandaloneMode({ standalone: false, matchMediaStandalone: false })).toBe(false)
  })

  it('is false for missing/empty env (SSR-safe default)', () => {
    expect(isStandaloneMode(undefined)).toBe(false)
    expect(isStandaloneMode(null)).toBe(false)
    expect(isStandaloneMode({})).toBe(false)
  })
})

describe('needsIosPushCoach', () => {
  it('coaches iPhone Safari in a normal tab', () => {
    expect(needsIosPushCoach({ userAgent: IPHONE_UA })).toBe(true)
  })

  it('does not coach once added to home screen (standalone)', () => {
    expect(needsIosPushCoach({ userAgent: IPHONE_UA, standalone: true })).toBe(false)
    expect(needsIosPushCoach({ userAgent: IPHONE_UA, matchMediaStandalone: true })).toBe(
      false,
    )
  })

  it('coaches iPadOS desktop-mode Safari in a normal tab', () => {
    expect(
      needsIosPushCoach({ userAgent: IPAD_DESKTOP_UA, platform: 'MacIntel', maxTouchPoints: 5 }),
    ).toBe(true)
  })

  it('never coaches Android or desktop', () => {
    expect(needsIosPushCoach({ userAgent: ANDROID_UA })).toBe(false)
    expect(needsIosPushCoach({ userAgent: DESKTOP_UA })).toBe(false)
  })

  it('is SSR-safe: missing env never coaches', () => {
    expect(needsIosPushCoach(undefined)).toBe(false)
    expect(needsIosPushCoach(null)).toBe(false)
    expect(needsIosPushCoach({})).toBe(false)
  })
})

describe('detectIosPushCoachLive (browser guard)', () => {
  it('exposes the standalone media query used for detection', () => {
    expect(IOS_STANDALONE_QUERY).toBe('(display-mode: standalone)')
  })

  it('never throws and returns a boolean in jsdom (non-iOS UA -> false)', () => {
    expect(() => detectIosPushCoachLive()).not.toThrow()
    expect(typeof detectIosPushCoachLive()).toBe('boolean')
    expect(detectIosPushCoachLive()).toBe(false)
  })
})
