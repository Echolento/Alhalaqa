import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeacherDashboard } from '@/components/dashboard/teacher-dashboard'
import { StudentDashboard } from '@/components/dashboard/student-dashboard'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'
import { PendingInvitations } from '@/components/dashboard/pending-invitations'
import { UserPlus } from 'lucide-react'
import { getTeacherDashboard, getStudentDashboard, getAdminDashboard, getTeacherStudents, getTeacherPayments, getStudentPaymentStatus, getRevenueTrend } from '@/lib/data-actions'
import { getStudentInvitations, autoAcceptInvitations } from '@/lib/invitation-actions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/auth/login')
  }

  if (profile.role === 'admin') {
    const data = await getAdminDashboard()
    return <AdminDashboard data={data} />
  }

  if (profile.role === 'teacher') {
    const { data: teacher } = await supabase
      .from('teachers')
      .select('default_monthly_price')
      .eq('profile_id', user.id)
      .single()

    if (!teacher || !teacher.default_monthly_price || Number(teacher.default_monthly_price) === 0) {
      redirect('/dashboard/settings?first_login=true')
    }

    const [data, students, paymentData, revenueTrend] = await Promise.all([
      getTeacherDashboard(),
      getTeacherStudents(),
      getTeacherPayments(),
      getRevenueTrend(6),
    ])
    return <TeacherDashboard 
      data={data} 
      students={students} 
      paymentData={paymentData} 
      revenueTrend={revenueTrend} 
    />
  }

  if (profile.role === 'student') {
    await autoAcceptInvitations()

    const [data, invitations, paymentStatus] = await Promise.all([
      getStudentDashboard(),
      getStudentInvitations(),
      getStudentPaymentStatus(),
    ])

    const hasTeacherLink = data?.student?.teacher_id !== null && data?.student?.teacher_id !== undefined
    const hasInvitations = invitations.length > 0

    if (!hasTeacherLink && !hasInvitations) {
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

    return (
      <div className="space-y-6">
        <PendingInvitations invitations={invitations} />
        <StudentDashboard data={data} paymentStatus={paymentStatus} />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">جاري التحميل...</p>
    </div>
  )
}
