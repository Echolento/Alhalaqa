import { updateSession } from '@/lib/supabase/proxy'
import { NextResponse, type NextRequest } from 'next/server'
import { resolvePayRewrite } from '@/lib/pay-host'

export async function proxy(request: NextRequest) {
  try {
    const { searchParams, pathname } = new URL(request.url)

    // Payer subdomain root serves the phone-claim entry, not the homepage.
    // Refreshed auth cookies ride along so logged-in payers stay logged in.
    const payTarget = resolvePayRewrite(pathname, request.headers.get('host'))
    if (payTarget) {
      const sessioned = await updateSession(request)
      const rewrite = NextResponse.rewrite(new URL(payTarget, request.url))
      for (const cookie of sessioned.cookies.getAll()) {
        rewrite.cookies.set(cookie)
      }
      return rewrite
    }

    const code = searchParams.get('code')

    if (code && !pathname.startsWith('/auth/callback')) {
      const params = new URLSearchParams(searchParams)
      if (!params.has('next')) {
        params.set('next', '/welcome')
      }
      const callbackUrl = new URL(`/auth/callback?${params.toString()}`, request.url)
      return NextResponse.redirect(callbackUrl)
    }

    return await updateSession(request)
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
