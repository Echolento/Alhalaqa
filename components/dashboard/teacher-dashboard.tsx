import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Wallet, TrendingUp, DollarSign } from 'lucide-react'

interface TeacherDashboardProps {
  students: Array<{ id: string; monthly_price: number }>
  paymentData: {
    students: Array<{ id: string; monthly_price: number }>
    payments: Array<{ student_id: string; paid: boolean; amount_paid: number }>
    currency?: string
  }
}

export function TeacherDashboard({ students, paymentData }: TeacherDashboardProps) {
  const currency = paymentData?.currency || 'SAR'
  const currencySymbol = currency === 'EGP' ? 'ج.م' : 'ر.س'

  const totalStudents = students.length
  const paidCount = paymentData?.payments.filter(p => p.paid).length || 0
  const unpaidCount = totalStudents - paidCount

  const totalCollected = paymentData?.payments.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0) || 0
  const totalExpected = paymentData?.students.reduce((sum, s) => sum + (Number(s.monthly_price) || 0), 0) || 0
  const pendingAmount = Math.max(0, totalExpected - totalCollected)
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight">لوحة التحكم</h1>
        <p className="text-muted-foreground">نظرة عامة على المدفوعات والطلاب</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <Link href="/dashboard/students">
          <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">إجمالي الطلاب</p>
              </div>
              <h2 className="text-2xl font-bold">{totalStudents}</h2>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/payments">
          <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <DollarSign className="w-5 h-5" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">المتحصل هذا الشهر</p>
              </div>
              <h2 className="text-2xl font-bold">{totalCollected} {currencySymbol}</h2>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/payments">
          <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <Wallet className="w-5 h-5" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">المبالغ المتبقية</p>
              </div>
              <h2 className="text-2xl font-bold">{pendingAmount} {currencySymbol}</h2>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/payments">
          <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">نسبة التحصيل</p>
              </div>
              <h2 className="text-2xl font-bold">{collectionRate}%</h2>
            </CardContent>
          </Card>
        </Link>
      </div>

      {totalStudents === 0 && (
        <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
          <CardContent className="p-8 md:p-12 flex flex-col items-center gap-4 text-center">
            <Users className="w-12 h-12 text-primary/40" />
            <div>
              <h3 className="text-xl font-bold mb-1">لا يوجد طلاب بعد</h3>
              <p className="text-muted-foreground">أضف طلابك الجدد لبدء تتبع المدفوعات</p>
            </div>
            <Button asChild>
              <Link href="/dashboard/students">إضافة طالب</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
