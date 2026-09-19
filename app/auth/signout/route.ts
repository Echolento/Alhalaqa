import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /auth/signout — used by the dashboard layout's "profile not found"
 * fallback form. Signs the user out and redirects home.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', request.url))
}
