import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolvePostAuthDestination } from '@/lib/auth-bootstrap'
import { sanitizeRedirectTo } from '@/lib/auth-redirect'

// app/auth/confirm/route.ts
// Email-link return leg (signup confirm / magic link / recovery / claim).
// Verifies `token_hash` server-side — NO PKCE code verifier — so it works when
// the mail is opened in a different browser or in-app WebView than the one that
// requested it (the mobile default). The Supabase email templates must point
// their link here: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = (searchParams.get('type') as EmailOtpType | null) ?? 'email'
  const next = sanitizeRedirectTo(searchParams.get('next'), origin)

  if (token_hash) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error && data?.user) {
      const dest = await resolvePostAuthDestination(data.user.id, next)
      return NextResponse.redirect(`${origin}${dest}`)
    }
    console.error('[auth/confirm] verifyOtp failed:', error?.message)
  }

  return NextResponse.redirect(`${origin}/auth/error?reason=confirm_failed`)
}
