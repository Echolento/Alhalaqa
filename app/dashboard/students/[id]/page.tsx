import { redirect } from 'next/navigation'
import { getStudentProfile } from '@/lib/student-profile'
import { StudentProfile } from '@/components/dashboard/student-profile'
import { outstandingCycleKey } from '@/lib/billing-next'

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getStudentProfile(id)
  if (!data) redirect('/dashboard')
  // The profile shows the SAME cycle the payments list and the payer pay screen
  // show: the student's outstanding next-due cycle, never the wall-clock month.
  const cycleKey = outstandingCycleKey(data.student)
  return <StudentProfile student={data.student} payments={data.payments} month={cycleKey} currency={data.currency} />
}
