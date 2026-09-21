import { redirect } from 'next/navigation'
import { getStudentProfile } from '@/lib/student-profile'
import { StudentProfile } from '@/components/dashboard/student-profile'
import { getCurrentMonthKey } from '@/lib/billing-period'

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ month?: string }>
}) {
  const { id } = await params
  const { month } = await searchParams
  const data = await getStudentProfile(id)
  if (!data) redirect('/dashboard')
  const currentMonth = month || getCurrentMonthKey()
  return <StudentProfile student={data.student} payments={data.payments} month={currentMonth} currency={data.currency} />
}
