import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOwnTeacherId } from '@/lib/ownership'
import { ensureJoinCode } from '@/lib/join-code-store'
import { getTeacherPayments } from '@/lib/payment-actions'
import { callerHasClaimedStudents } from '@/lib/claim-actions'
import { getOverdueStudents } from '@/lib/overdue'
import { MyPaymentsLink } from '@/components/dashboard/my-payments-link'
import { TeacherNotifyPrompt } from '@/components/dashboard/teacher-notify-prompt'
import { StudentList } from '@/components/dashboard/student-list'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { prevMonthKey, nextMonthKey, getCurrentMonthKey } from '@/lib/billing-period'
import { SHARE_ENTRY_SEEN_COOKIE } from '@/lib/share-entry-cookie'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; overdue?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { month, overdue } = await searchParams
  const currentMonth = month || getCurrentMonthKey()
  const { students, payments, expected, collected } = await getTeacherPayments(currentMonth)
  // The entry card is full the first time it renders, then collapsed forever.
  // Read the marker server-side so returning teachers never see it flash open.
  const shareEntrySeen = (await cookies()).get(SHARE_ENTRY_SEEN_COOKIE)?.value === '1'
  // Teacher-as-payer shortcut: visible only when the caller owns ≥1 claim.
  const showMyPayments = await callerHasClaimedStudents()

  // Join code for the entry card. Minted on first view; the card omits it if
  // the service client or code table is unavailable (deploy-order safety).
  let joinCode: string | null = null
  try {
    const service = createServiceClient()
    const teacherId = await getOwnTeacherId(service, user.id)
    if (teacherId) joinCode = await ensureJoinCode(service, teacherId)
  } catch {
    joinCode = null
  }

  // ?overdue=1 (the "still hasn't paid" email CTA) overlays the list with just
  // the overdue students — same set the email named (grace 0).
  const overdueIds = overdue
    ? getOverdueStudents(
        students.map((s) => ({
          id: s.id,
          name: s.full_name || 'طالب',
          frequency: s.frequency,
          next_due_date: s.next_due_date,
        })),
        payments.map((p) => ({
          student_id: String(p.student_id ?? ''),
          month: String(p.month ?? ''),
          paid: !!p.paid,
        })),
        new Date(),
        0,
      ).map((o) => o.id)
    : []

  const monthDate = new Date(currentMonth)
  const monthLabel = monthDate.toLocaleDateString('ar-SA-u-ca-gregory', { month: 'long', year: 'numeric' })

  const prevMonth = prevMonthKey(currentMonth)
  const nextMonth = nextMonthKey(currentMonth)
  const isCurrentMonth = currentMonth === getCurrentMonthKey()

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="hidden md:block">
          <h1 className="text-3xl font-bold">الطلاب</h1>
          <p className="text-muted-foreground">{monthLabel}</p>
        </div>

        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border w-full md:w-auto justify-center md:justify-start self-center md:self-auto">
          <Link href={`/dashboard?month=${prevMonth}`}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
          <div className="px-4 py-1 text-sm font-bold min-w-[120px] text-center flex-1 md:flex-none">
            {monthLabel}
          </div>
          <Link href={`/dashboard?month=${nextMonth}`}>
            <Button variant="ghost" size="icon" className="h-9 w-9 min-h-[44px] min-w-[44px]" disabled={isCurrentMonth}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>

      <TeacherNotifyPrompt />

      <MyPaymentsLink visible={showMyPayments} />

      <StudentList
        students={students}
        payments={payments}
        month={currentMonth}
        initialCollected={collected}
        initialExpected={expected}
        overdueIds={overdueIds}
        showOverdue={!!overdue}
        joinCode={joinCode}
        shareEntryDefaultOpen={!shareEntrySeen}
      />
    </div>
  )
}
