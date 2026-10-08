import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolvePostAuthDestination } from '@/lib/auth-bootstrap'
import { sanitizeRedirectTo } from '@/lib/auth-redirect'

// app/auth/confirm/verify/route.ts
// Consumes the one-time email token — but ONLY on a POST from the confirm
// page's button (a user gesture). The email link's GET renders the page and
// never verifies, so an email-client prefetch / double-open can't burn the
// link before the user taps. Verifies server-side (token_hash, no PKCE).

export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin
  const form = await request.formData()
  const token_hash = form.get('token_hash')
  const type = ((form.get('type') as string | null) as EmailOtpType | null) ?? 'email'
  const next = sanitizeRedirectTo(form.get('next') as string | null, origin)

  if (typeof token_hash === 'string' && token_hash) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error && data?.user) {
      const dest = await resolvePostAuthDestination(data.user.id, next)
      return NextResponse.redirect(`${origin}${dest}`, 303)
    }

    // Already-used link + an existing session → continue instead of dead-ending.
    const { data: existing } = await supabase.auth.getUser()
    if (existing?.user) {
      const dest = await resolvePostAuthDestination(existing.user.id, next)
      return NextResponse.redirect(`${origin}${dest}`, 303)
    }

    console.error('[auth/confirm] verifyOtp failed:', error?.message)
  }

  const errorParams = new URLSearchParams({ reason: 'confirm_failed', next })
  return NextResponse.redirect(`${origin}/auth/error?${errorParams.toString()}`, 303)
}
