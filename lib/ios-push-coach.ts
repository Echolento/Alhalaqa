// lib/ios-push-coach.ts
// #35 slice 7/8 — pure iOS web-push coach detector. Every function is pure
// over explicit args and SSR-safe by construction: navigator/window are only
// touched inside detectIosPushCoachLive(), which is guarded. Unit tests
// inject env objects (detection matrix); the component uses the live
// detector on mount with an iosCoachNeeded override seam for tests.

export const IOS_STANDALONE_QUERY = '(display-mode: standalone)'

export interface IosPushCoachEnv {
  userAgent?: string | null
  platform?: string | null
  maxTouchPoints?: number | null
  /** navigator.standalone (iOS Safari only, boolean when present). */
  standalone?: boolean | null
  /** window.matchMedia(IOS_STANDALONE_QUERY).matches */
  matchMediaStandalone?: boolean | null
}

function norm(value: string | null | undefined): string {
  return (value ?? '').toLowerCase()
}

/**
 * True for iPhone/iPad/iPod — including iPadOS 13+ in desktop mode, which
 * reports "Macintosh" but exposes touch points.
 */
export function isIosDevice(
  userAgent?: string | null,
  platform?: string | null,
  maxTouchPoints?: number | null,
): boolean {
  if (/iphone|ipad|ipod/.test(norm(userAgent))) return true
  if (norm(platform) === 'macintel' && (maxTouchPoints ?? 0) > 1) return true
  return false
}

/** True when the page already runs from the home-screen icon. */
export function isStandaloneMode(
  env?: Pick<IosPushCoachEnv, 'standalone' | 'matchMediaStandalone'> | null,
): boolean {
  if (!env) return false
  return env.standalone === true || env.matchMediaStandalone === true
}

/**
 * True when the payer is on iOS Safari WITHOUT standalone mode — i.e. web
 * push cannot work until they Add-to-Home-Screen, so coach them first.
 */
export function needsIosPushCoach(env?: IosPushCoachEnv | null): boolean {
  if (!env) return false
  if (!isIosDevice(env.userAgent, env.platform, env.maxTouchPoints)) return false
  return !isStandaloneMode(env)
}

type LiveNavigator = Navigator & {
  standalone?: boolean
  userAgentData?: { platform?: string }
}

/**
 * Live detector for the component default path. SSR-safe: returns false
 * outside the browser instead of throwing.
 */
export function detectIosPushCoachLive(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const nav = navigator as LiveNavigator
  let matchMediaStandalone: boolean | null = null
  try {
    if (typeof window.matchMedia === 'function') {
      matchMediaStandalone = window.matchMedia(IOS_STANDALONE_QUERY).matches
    }
  } catch {
    matchMediaStandalone = null
  }
  return needsIosPushCoach({
    userAgent: nav.userAgent,
    platform: nav.platform ?? nav.userAgentData?.platform ?? null,
    maxTouchPoints: typeof nav.maxTouchPoints === 'number' ? nav.maxTouchPoints : null,
    standalone: typeof nav.standalone === 'boolean' ? nav.standalone : null,
    matchMediaStandalone,
  })
}
