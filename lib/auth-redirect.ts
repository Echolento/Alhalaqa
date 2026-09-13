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

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  )
}
