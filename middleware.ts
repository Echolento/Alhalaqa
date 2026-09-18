import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { searchParams, pathname } = new URL(request.url)
  const code = searchParams.get('code')

  // If Supabase redirect lands at root (or any non-callback path) with ?code=,
  // redirect to /auth/callback so the code exchange happens properly.
  // This catches the case where Supabase falls back to Site URL instead of redirectTo.
  if (code && !pathname.startsWith('/auth/callback')) {
    const params = new URLSearchParams(searchParams)
    if (!params.has('next')) {
      params.set('next', '/welcome')
    }
    const callbackUrl = new URL(`/auth/callback?${params.toString()}`, request.url)
    return NextResponse.redirect(callbackUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
