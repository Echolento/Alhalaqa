import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTeacherPayments } from '@/lib/data-actions'
import { PaymentsList } from '@/components/dashboard/payments-list'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronLeft, DollarSign, Clock, Users } from 'lucide-react'
import Link from 'next/link'

export default async function PaymentsPage({
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

  const currencySymbol = currency === 'EGP' ? 'ج.م' : 'ر.س'

  const paidCount = payments.filter((p: any) => p.paid).length
  const unpaidCount = students.length - paidCount

  const totalCollected = payments.reduce((sum: number, p: any) => sum + (Number(p.amount_paid) || 0), 0)
  const totalExpected = students.reduce((sum: number, s: any) => sum + (Number(s.monthly_price) || 0), 0)
  const pendingRevenue = Math.max(0, totalExpected - totalCollected)

  const monthDate = new Date(currentMonth)
  const monthLabel = monthDate.toLocaleDateString('ar-SA-u-ca-gregory', { month: 'long', year: 'numeric' })

  const prevDate = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)
  const nextDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
  const prevMonth = prevDate.toISOString().slice(0, 7) + '-01'
  const nextMonth = nextDate.toISOString().slice(0, 7) + '-01'
  const isCurrentMonth = currentMonth === new Date().toISOString().slice(0, 7) + '-01'

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">المدفوعات</h1>
          <p className="text-muted-foreground">{monthLabel}</p>
        </div>

        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border">
          <Link href={`/dashboard/payments?month=${prevMonth}`}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
          <div className="px-4 py-1 text-sm font-bold min-w-[120px] text-center">
            {monthLabel}
          </div>
          <Link href={`/dashboard/payments?month=${nextMonth}`}>
            <Button variant="ghost" size="icon" className="h-9 w-9" disabled={isCurrentMonth}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
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

        <Card className="border shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">إجمالي الطلاب</p>
            </div>
            <h2 className="text-2xl font-bold">{students.length} طالب</h2>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">قائمة الطلاب</h2>
          {unpaidCount > 0 && (
            <Badge variant="destructive" className="rounded-lg">
              بانتظار {unpaidCount} طلاب
            </Badge>
          )}
        </div>

        <div className="border rounded-2xl overflow-hidden bg-card">
          <PaymentsList students={students} payments={payments} month={currentMonth} currency={currency} />
        </div>
      </div>
    </div>
  )
}
