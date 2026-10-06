import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { AUDIENCE_COOKIE } from '@/lib/pay-host'

// app/start/route.ts
// Launch target for the installed PWA (manifest start_url). One app serves both
// audiences, so route by WHO is opening it: teachers → dashboard, payers → pay
// hub. The proxy records the audience at install time; use it when signed out.
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const service = createServiceClient()
    const { data: teacher } = await service
      .from('teachers')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()
    return NextResponse.redirect(`${origin}${teacher ? '/dashboard' : '/pay'}`)
  }

  const audience = (await cookies()).get(AUDIENCE_COOKIE)?.value
  return NextResponse.redirect(`${origin}${audience === 'teacher' ? '/auth/login' : '/pay'}`)
}
