// lib/pay-host.ts
// Payer-subdomain routing (pure): pay.alhalaqa.com is the parent entry.
// Its root rewrites to the phone-claim page — the marketing homepage must
// never greet a parent. Every other path and every other host is untouched.

/** True for pay.* hostnames (port stripped). Vercel only routes OUR pay subdomain here. */
export function isPayHost(host: string | null | undefined): boolean {
  if (!host) return false
  const bare = host.split(':')[0]?.trim().toLowerCase() ?? ''
  if (!bare) return false
  return bare === 'pay' || bare.startsWith('pay.')
}

/**
 * Rewrite target for a (pathname, host) pair, or null for no rewrite.
 * Only the pay-subdomain ROOT moves (→ /claim); deep links pass through.
 */
export function resolvePayRewrite(pathname: string, host: string | null | undefined): string | null {
  if (pathname !== '/') return null
  if (!isPayHost(host)) return null
  return '/claim'
}

/** The one link teachers share with all parents (client-safe). */
export const PAY_ENTRY_URL =
  process.env.NEXT_PUBLIC_PAY_URL ?? 'https://pay.alhalaqa.com'
