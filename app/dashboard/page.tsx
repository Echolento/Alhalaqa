import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTeacherPayments } from '@/lib/payment-actions'
import { StudentList } from '@/components/dashboard/student-list'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronLeft, DollarSign, Clock } from 'lucide-react'
import Link from 'next/link'
import { prevMonthKey, nextMonthKey, getCurrentMonthKey } from '@/lib/billing-period'
import { getCurrencySymbol } from '@/lib/currencies'

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

  const currencySymbol = getCurrencySymbol(currency)

  const totalCollected = payments.reduce((sum: number, p: any) => sum + (Number(p.amount_paid) || 0), 0)
  const totalExpected = students.reduce((sum: number, s: any) => sum + (Number(s.monthly_price) || 0), 0)
  const pendingRevenue = Math.max(0, totalExpected - totalCollected)

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

        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border self-center md:self-auto">
          <Link href={`/dashboard?month=${prevMonth}`}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
          <div className="px-4 py-1 text-sm font-bold min-w-[120px] text-center">
            {monthLabel}
          </div>
          <Link href={`/dashboard?month=${nextMonth}`}>
            <Button variant="ghost" size="icon" className="h-9 w-9 min-h-[44px] min-w-[44px]" disabled={isCurrentMonth}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-6">
        <Card className="border shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">المبالغ المستلمة</p>
            </div>
            <h2 className="text-2xl font-bold">{totalCollected} {currencySymbol}</h2>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">المبالغ المتبقية</p>
            </div>
            <h2 className="text-2xl font-bold">{pendingRevenue} {currencySymbol}</h2>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 pt-2 md:pt-6">
        <div className="md:hidden border-t border-border/60" />
        <StudentList students={students} payments={payments} month={currentMonth} currency={currency} />
      </div>
    </div>
  )
}
