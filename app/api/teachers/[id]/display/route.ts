import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const teacherId = params.id;
  const supabase = await createClient();

  // Fetch teacher profile with full_name
  const { data: teacher, error } = await supabase
    .from('teachers')
    .select('profile:profiles(full_name)')
    .eq('id', teacherId)
    .single();

  if (error || !teacher) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
  }

  const fullName = (teacher.profile as any)?.full_name || '';
  return NextResponse.json({ full_name: fullName }, { status: 200 });
}
