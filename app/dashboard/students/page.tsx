import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StudentsTable } from '@/components/dashboard/students-table'
import { getTeacherStudents, getAllStudents, getAllTeachers } from '@/lib/data-actions'
import { InviteStudentDialog } from '@/components/dashboard/invite-student-dialog'

export default async function StudentsPage() {
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

  if (!profile || profile.role === 'student') {
    redirect('/dashboard')
  }

  const students = profile.role === 'admin'
    ? await getAllStudents()
    : await getTeacherStudents()

  const teachers = profile.role === 'admin' ? await getAllTeachers() : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الطلاب</h1>
          <p className="text-muted-foreground">
            {profile.role === 'admin'
              ? 'إدارة جميع الطلاب ونقلهم بين المعلمين'
              : 'عرض وإدارة طلابك'}
          </p>
        </div>
        {profile.role === 'teacher' && <InviteStudentDialog />}
      </div>
      <StudentsTable students={students} teachers={teachers} isAdmin={profile.role === 'admin'} />
    </div>
  )
}
