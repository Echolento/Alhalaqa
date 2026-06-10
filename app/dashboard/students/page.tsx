import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StudentsTable } from '@/components/dashboard/students-table'
import { getTeacherStudents, getTeacherPayments } from '@/lib/data-actions'

export default async function StudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const [students, paymentData] = await Promise.all([
    getTeacherStudents(),
    getTeacherPayments(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الطلاب</h1>
        <p className="text-muted-foreground">إدارة الطلاب وإضافة وتعديل وحذف</p>
      </div>
      <StudentsTable
        students={students}
        currency={paymentData.currency}
      />
    </div>
  )
}
