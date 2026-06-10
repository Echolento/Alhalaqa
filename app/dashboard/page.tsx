import { redirect } from 'next/navigation'
export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { TeacherDashboard } from '@/components/dashboard/teacher-dashboard'
import { getTeacherStudents, getTeacherPayments } from '@/lib/data-actions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: teacher } = await supabase
    .from('teachers')
    .select('default_monthly_price')
    .eq('profile_id', user.id)
    .single()

  if (!teacher || !teacher.default_monthly_price || Number(teacher.default_monthly_price) === 0) {
    redirect('/dashboard/settings?first_login=true')
  }

  const [students, paymentData] = await Promise.all([
    getTeacherStudents(),
    getTeacherPayments(),
  ])

  return <TeacherDashboard students={students} paymentData={paymentData} />
}
