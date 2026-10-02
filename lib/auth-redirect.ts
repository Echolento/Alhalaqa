export const DEFAULT_AUTH_NEXT_PATH = '/welcome'

/**
 * Allow only same-origin relative paths. Blocks `//evil`, `https://…`,
 * backslashes and control chars (open-redirect guard for ?next=).
 */
export function sanitizeNextPath(input: string | null | undefined): string {
  if (!input) return DEFAULT_AUTH_NEXT_PATH
  if (!input.startsWith('/')) return DEFAULT_AUTH_NEXT_PATH
  if (input.startsWith('//')) return DEFAULT_AUTH_NEXT_PATH
  if (input.includes('\\')) return DEFAULT_AUTH_NEXT_PATH
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(input)) return DEFAULT_AUTH_NEXT_PATH
  return input
}

/**
 * Email/OAuth redirect targets must use a host that is allow-listed in Supabase.
 * The pay subdomain is only a routing alias (its root rewrites to /claim); every
 * app route also exists on the canonical www host. An unlisted redirect_to is
 * silently replaced with the Site URL root, which drops the destination — so
 * collapse pay.* to www.* before handing a URL to Supabase.
 */
export function authRedirectOrigin(origin: string): string {
  try {
    const u = new URL(origin)
    if (u.hostname.startsWith('pay.')) {
      u.hostname = `www.${u.hostname.slice(4)}`
      return u.origin
    }
  } catch {
    // Not a URL — return unchanged.
  }
  return origin
}

/**
 * Email links carry `{{ .RedirectTo }}`, which is the absolute `emailRedirectTo`
 * we passed to Supabase. Reduce it to a same-site relative path (or the safe
 * default) before redirecting — never trust it to be same-origin. pay.* and
 * www.* are the same site.
 */
export function sanitizeRedirectTo(input: string | null | undefined, origin: string): string {
  if (!input) return DEFAULT_AUTH_NEXT_PATH
  if (input.startsWith('/')) return sanitizeNextPath(input)
  try {
    const url = new URL(input)
    if (authRedirectOrigin(url.origin) === authRedirectOrigin(new URL(origin).origin)) {
      return sanitizeNextPath(`${url.pathname}${url.search}`)
    }
  } catch {
    // Not a URL — fall through to the default.
  }
  return DEFAULT_AUTH_NEXT_PATH
}

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  )
}
