import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const teacherId = params.id
    if (!teacherId) {
      return NextResponse.json({ error: 'Missing teacher id' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('profile_id')
      .eq('id', teacherId)
      .maybeSingle()

    if (tErr) {
      return NextResponse.json({ error: tErr.message }, { status: 500 })
    }

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    const profileId = (teacher as any).profile_id as string | null
    if (!profileId) {
      return NextResponse.json({ full_name: null })
    }

    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', profileId)
      .maybeSingle()

    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 })
    }

    return NextResponse.json({ full_name: (profile as any)?.full_name ?? null })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
