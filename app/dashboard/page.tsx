import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTeacherPayments } from '@/lib/payment-actions'
import { StudentList } from '@/components/dashboard/student-list'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { prevMonthKey, nextMonthKey, getCurrentMonthKey } from '@/lib/billing-period'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { month } = await searchParams
  const currentMonth = month || new Date().toISOString().slice(0, 7) + '-01'
  const { students, payments, currency } = await getTeacherPayments(currentMonth)

  const totalCollected = payments.reduce((sum: number, p: any) => sum + (Number(p.amount_paid) || 0), 0)
  const totalExpected = students.reduce((sum: number, s: any) => sum + (Number(s.monthly_price) || 0), 0)

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

      <StudentList
        students={students}
        payments={payments}
        month={currentMonth}
        currency={currency}
        initialCollected={totalCollected}
        initialExpected={totalExpected}
      />
    </div>
  )
}
