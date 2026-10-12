import { redirect } from 'next/navigation'
import { getStudentProfile } from '@/lib/student-profile'
import { StudentProfile } from '@/components/dashboard/student-profile'
import { getCurrentMonthKey, normalizeFrequency } from '@/lib/billing-period'
import { duePeriodKey, firstOfNextMonth } from '@/lib/billing-next'

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
  // The profile must show the SAME cycle the payments list shows: monthly ties
  // to the selected wall-clock month; interval students tie to their outstanding
  // next-due cycle (the source of truth), never the wall-clock month. Otherwise
  // the profile reads one cycle and the list another (paid vs unpaid).
  const frequency = normalizeFrequency(data.student.frequency)
  const cycleKey =
    frequency === 'monthly'
      ? month || getCurrentMonthKey()
      : duePeriodKey(data.student.next_due_date ?? firstOfNextMonth(), frequency)
  return <StudentProfile student={data.student} payments={data.payments} month={cycleKey} currency={data.currency} />
}
