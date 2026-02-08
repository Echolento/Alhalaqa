import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeacherDashboard } from '@/components/dashboard/teacher-dashboard'
import { StudentDashboard } from '@/components/dashboard/student-dashboard'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'
import { PendingInvitations } from '@/components/dashboard/pending-invitations'
import { UserPlus } from 'lucide-react'
import { getTeacherDashboard, getStudentDashboard, getAdminDashboard, getTeacherStudents } from '@/lib/data-actions'
import { getStudentInvitations } from '@/lib/invitation-actions'

export default async function DashboardPage() {
  console.log('[DASH] start DashboardPage')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('[DASH] user', { hasUser: !!user, id: user?.id, email: user?.email })

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  console.log('[DASH] profile', { exists: !!profile, role: profile?.role, org: profile?.organization_id })

  if (!profile) {
    redirect('/auth/login')
  }

  if (profile.role === 'admin') {
    const data = await getAdminDashboard()
    return <AdminDashboard data={data} />
  }

  if (profile.role === 'teacher') {
    console.log('[DASH] role=teacher -> fetching teacher data')
    const [data, students] = await Promise.all([
      getTeacherDashboard(),
      getTeacherStudents()
    ])
    console.log('[DASH] teacher data fetched', { hasData: !!data, studentsCount: students?.length })
    return <TeacherDashboard data={data} students={students} />
  }

  if (profile.role === 'student') {
    console.log('[DASH] role=student -> fetching student data + invitations')
    const [data, invitations] = await Promise.all([
      getStudentDashboard(),
      getStudentInvitations()
    ])

    console.log('[DASH] student data fetched', {
      hasData: !!data,
      hasStudent: !!data?.student,
      teacherId: data?.student?.teacher_id,
      invCount: invitations?.length
    })

    const hasTeacherLink = data?.student?.teacher_id !== null && data?.student?.teacher_id !== undefined
    const hasInvitations = invitations.length > 0

    if (!hasTeacherLink && !hasInvitations) {
      console.log('[DASH] no teacher and no invitations -> empty state')
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center animate-in fade-in duration-500">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <UserPlus className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">بانتظار دعوة المعلم</h1>
            <p className="text-muted-foreground max-w-sm mx-auto">
              عذراً، يجب أن يتم دعوتك من قبل معلم لتتمكن من استخدام المنصة كطالب. يرجى التواصل مع معلمك.
            </p>
          </div>
        </div>
      )
    }

    console.log('[DASH] rendering student view with invitations + data')
    return (
      <div className="space-y-6">
        <PendingInvitations invitations={invitations} />
        <StudentDashboard data={data} />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">جاري التحميل...</p>
    </div>
  )
}
