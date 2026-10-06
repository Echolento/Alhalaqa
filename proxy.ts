import { updateSession } from '@/lib/supabase/proxy'
import { NextResponse, type NextRequest } from 'next/server'
import { resolvePayRewrite, audienceFor, AUDIENCE_COOKIE, type Audience } from '@/lib/pay-host'

const ONE_YEAR = 60 * 60 * 24 * 365

/** Stamp the install-audience cookie so /start can route a lapsed session. */
function withAudience(response: NextResponse, audience: Audience | null): NextResponse {
  if (audience && response.cookies.get(AUDIENCE_COOKIE)?.value !== audience) {
    response.cookies.set(AUDIENCE_COOKIE, audience, {
      path: '/',
      maxAge: ONE_YEAR,
      sameSite: 'lax',
    })
  }
  return response
}

export async function proxy(request: NextRequest) {
  try {
    const { searchParams, pathname } = new URL(request.url)
    const host = request.headers.get('host')
    const audience = audienceFor(pathname, host)

    // Payer subdomain root serves the phone-claim entry, not the homepage.
    // Refreshed auth cookies ride along so logged-in payers stay logged in.
    const payTarget = resolvePayRewrite(pathname, host)
    if (payTarget) {
      const sessioned = await updateSession(request)
      const rewrite = NextResponse.rewrite(new URL(payTarget, request.url))
      for (const cookie of sessioned.cookies.getAll()) {
        rewrite.cookies.set(cookie)
      }
      return withAudience(rewrite, audience)
    }

    const code = searchParams.get('code')

    if (code && !pathname.startsWith('/auth/callback')) {
      const params = new URLSearchParams(searchParams)
      if (!params.has('next')) {
        params.set('next', '/welcome')
      }
      const callbackUrl = new URL(`/auth/callback?${params.toString()}`, request.url)
      return withAudience(NextResponse.redirect(callbackUrl), audience)
    }

    return withAudience(await updateSession(request), audience)
  } catch (err) {
    console.error('Proxy error:', err)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
