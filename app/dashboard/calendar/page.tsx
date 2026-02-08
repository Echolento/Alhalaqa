import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CalendarView } from '@/components/dashboard/calendar-view'
import { getTeacherSessions, getTeacherStudents } from '@/lib/data-actions'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') {
    redirect('/dashboard')
  }

  const sessions = await getTeacherSessions('all')
  const students = await getTeacherStudents()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">التقويم</h1>
        <p className="text-muted-foreground">عرض وإدارة مواعيد الحصص</p>
      </div>
      <CalendarView sessions={sessions} students={students} />
    </div>
  )
}
