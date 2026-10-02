import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeNextPath } from '@/lib/auth-redirect'
import { resolvePostAuthDestination } from '@/lib/auth-bootstrap'

// OAuth (Google) and password-recovery return leg. Same-browser redirect, so
// the PKCE code verifier IS present — unlike email links, which now return via
// /auth/confirm (token_hash, verifier-free).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?reason=no_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] code exchange failed:', error.message)
    return NextResponse.redirect(`${origin}/auth/error?reason=exchange_failed`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('[auth/callback] no session after code exchange')
    return NextResponse.redirect(`${origin}/auth/error?reason=no_session`)
  }

  const dest = await resolvePostAuthDestination(user.id, next)
  return NextResponse.redirect(`${origin}${dest}`)
}
