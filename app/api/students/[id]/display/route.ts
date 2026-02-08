import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const studentId = params.id
    if (!studentId) {
      return NextResponse.json({ error: 'Missing student id' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('profile_id')
      .eq('id', studentId)
      .maybeSingle()

    if (sErr) {
      return NextResponse.json({ error: sErr.message }, { status: 500 })
    }

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const profileId = (student as any).profile_id as string | null
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
