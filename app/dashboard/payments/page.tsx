import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTeacherPayments, getRevenueTrend, getStudentPaymentHistory } from '@/lib/data-actions'
import { PaymentsList } from '@/components/dashboard/payments-list'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronLeft, Wallet, TrendingUp, DollarSign, Users, Award, PieChart, Clock, History, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { FormattedDate } from '@/components/ui/formatted-date'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/dashboard')

  // --- TEACHER VIEW ---
  if (profile.role === 'teacher') {
    const { month } = await searchParams
    const currentMonth = month || new Date().toISOString().slice(0, 7) + '-01'
    const { students, payments, currency } = await getTeacherPayments(currentMonth)

    const currencySymbol = currency === 'EGP' ? 'ج.م' : 'ر.س'

    const paidCount = payments.filter((p: any) => p.paid).length
    const unpaidCount = students.length - paidCount

    // Calculations
    const totalCollected = payments.reduce((sum: number, p: any) => sum + (Number(p.amount_paid) || 0), 0)
    const totalExpected = students.reduce((sum: number, s: any) => sum + (Number(s.monthly_price) || 0), 0)
    
    // Fix: Pending should be the difference between expected and collected
    // Ensure we don't show negative values due to rounding
    const pendingRevenue = Math.max(0, totalExpected - totalCollected)

    const monthDate = new Date(currentMonth)
    const monthLabel = monthDate.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })

    const prevDate = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)
    const nextDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
    const prevMonth = prevDate.toISOString().slice(0, 7) + '-01'
    const nextMonth = nextDate.toISOString().slice(0, 7) + '-01'
    const isCurrentMonth = currentMonth === new Date().toISOString().slice(0, 7) + '-01'

    return (
      <div className="space-y-6 pb-20">
        {/* Header Section */}
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
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                disabled={isCurrentMonth}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Global Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border shadow-sm">
            <CardContent className="p-6">
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
            <CardContent className="p-6">
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
            <CardContent className="p-6">
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

        {/* List Section */}
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

  // --- STUDENT VIEW ---
  if (profile.role === 'student') {
    const historyData = await getStudentPaymentHistory(12)
    const history = 'payments' in historyData ? (historyData.payments as any[]) : []
    const currency = 'currency' in historyData ? (historyData.currency as string) : 'SAR'
    const expectedPrice = 'expectedPrice' in historyData ? (historyData.expectedPrice as number) : 0
    
    const currencySymbol = currency === 'EGP' ? 'ج.م' : 'ر.س'
    const currentMonthKey = new Date().toISOString().slice(0, 7) + '-01'
    const thisMonth = history.find((p: any) => p.month === currentMonthKey)

    return (
      <div className="space-y-8 pb-20 animate-in slide-in-from-bottom duration-700">
        <div className="space-y-1 text-center md:text-right">
          <h1 className="text-4xl font-black bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
            سجل مدفوعاتي
          </h1>
          <p className="text-muted-foreground font-medium">متابعة رسوم الاشتراك الشهري والمدفوعات</p>
        </div>

        {/* Current Month Banner */}
        <Card className={`relative overflow-hidden group border-none shadow-2xl transition-all duration-500 hover:scale-[1.01] ${thisMonth?.paid ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-red-600 text-white shadow-red-500/20 ring-4 ring-red-500/20'}`}>
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <CardContent className="p-8 relative">
            <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center shrink-0 shadow-2xl backdrop-blur-3xl bg-white/20 border border-white/30`}>
                  <Wallet className="w-10 h-10 text-white" />
                </div>
                <div className="space-y-2 text-center md:text-right">
                  <h3 className="text-2xl font-black">رسوم شهر {new Date().toLocaleDateString('ar-SA', { month: 'long' })}</h3>
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-md px-4 font-black">
                      {thisMonth?.paid ? "تم الدفع" : "بانتظار السداد"}
                    </Badge>
                    <span className="text-sm font-bold opacity-80">{thisMonth?.paid ? (thisMonth?.amount_paid || 0) : expectedPrice} {currencySymbol}</span>
                  </div>
                </div>
              </div>

              <div className="text-center md:text-left space-y-3 min-w-[200px]">
                <p className="text-sm font-bold opacity-90 leading-relaxed max-w-xs">
                  {thisMonth?.paid
                    ? "نشكرك على التزامك! تم سداد رسوم الشهر الحالي بنجاح."
                    : "يرجى سداد الرسوم المستحقة للمعلم في أقرب وقت لضمان استمرارية حصصك."}
                </p>
                {thisMonth?.paid && thisMonth.paid_at && (
                  <p className="text-[10px] uppercase tracking-widest font-black opacity-60">
                    تم التأكيد بتاريخ <FormattedDate date={thisMonth.paid_at} options={{ day: 'numeric', month: 'long' }} />
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History List */}
        <div className="space-y-6">
          <h2 className="text-xl font-black flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary font-bold">
              <History className="w-5 h-5" />
            </div>
            تاريخ السداد
          </h2>
          <div className="grid gap-4">
            {history.map((p, idx) => (
              <Card
                key={p.id}
                className="group border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-white/40 backdrop-blur-md border border-white/20"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${p.paid ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                      {p.paid ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-black text-lg">{new Date(p.month).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-muted-foreground">{p.paid ? (p.amount_paid || 0) : expectedPrice} {currencySymbol}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={p.paid ? "secondary" : "outline"} className={`px-4 py-1 font-black ${p.paid ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "text-muted-foreground opacity-50"}`}>
                    {p.paid ? "مدفوع" : "معلق"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return redirect('/dashboard')
}
