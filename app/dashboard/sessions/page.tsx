import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SessionsList } from '@/components/dashboard/sessions-list'
import { CreateSessionDialog } from '@/components/dashboard/create-session-dialog'
import { getTeacherSessions, getStudentSessions, getTeacherStudents } from '@/lib/data-actions'

export default async function SessionsPage({ searchParams }: { searchParams: { date?: string } }) {
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

  if (!profile) {
    redirect('/auth/login')
  }

  const isTeacher = profile.role === 'teacher'

  let [sessions, students] = await Promise.all([
    isTeacher ? getTeacherSessions('all') : getStudentSessions(),
    isTeacher ? getTeacherStudents() : []
  ])

  // Optional date filter (YYYY-MM-DD) to show sessions for a specific day
  const date = searchParams?.date
  if (date) {
    const start = new Date(date)
    start.setHours(0,0,0,0)
    const end = new Date(start)
    end.setDate(start.getDate() + 1)

    sessions = sessions.filter((s: any) => {
      const t = new Date(s.scheduled_at)
      return t >= start && t < end
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isTeacher ? 'الحصص' : 'حصصي'}
          </h1>
          <p className="text-muted-foreground">
            {isTeacher
              ? 'عرض وإدارة جميع الحصص'
              : 'عرض جميع حصصك وملاحظاتها'}
          </p>
        </div>
        {isTeacher && <CreateSessionDialog students={students} />}
      </div>
      <SessionsList sessions={sessions} role={profile.role} />
    </div>
  )
}
