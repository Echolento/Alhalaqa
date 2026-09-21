import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sanitizeNextPath } from '@/lib/auth-redirect'

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

  // Bootstrap teacher identity. OAuth signups don't carry role metadata, so
  // the DB trigger creates them as students with no teacher row — fix that
  // here. Idempotent: email flows that already have it are untouched.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('[auth/callback] no session after code exchange')
    return NextResponse.redirect(`${origin}/auth/error?reason=no_session`)
  }

  // Service writes scoped to the session user (#25: no anon-key writes).
  const service = createServiceClient()

  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile && (profile as { role: string }).role !== 'teacher') {
    await service.from('profiles').update({ role: 'teacher' }).eq('id', user.id)
  }

  await service
    .from('teachers')
    .upsert({ profile_id: user.id }, { onConflict: 'profile_id' })

  // Honor explicit destinations (e.g. recovery -> update-password). For the
  // default welcome destination, already-onboarded users go to dashboard —
  // this covers returning OAuth users and double-clicked confirm links.
  let dest = next
  if (next === '/welcome') {
    const { data: teacher } = await service
      .from('teachers')
      .select('default_monthly_price')
      .eq('profile_id', user.id)
      .maybeSingle()

    const price = Number(
      (teacher as { default_monthly_price: unknown } | null)?.default_monthly_price ?? 0,
    )
    if (price !== 0) {
      dest = '/dashboard'
    }
  }

  return NextResponse.redirect(`${origin}${dest}`)
}
