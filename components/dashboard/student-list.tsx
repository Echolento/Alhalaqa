'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, User, Search, Users } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { AlertTriangle } from 'lucide-react'
import { toggleStudentPayment } from '@/lib/payment-actions'
import { getPaymentStatus } from '@/lib/payment-status'
import { getCurrencySymbol } from '@/lib/currencies'
import { AddStudentDialog } from '@/components/dashboard/add-student-dialog'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

interface StudentListProps {
  students: any[]
  payments: any[]
  month: string
  currency: string
}

export function StudentList({ students, payments, month, currency }: StudentListProps) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [undoTarget, setUndoTarget] = useState<string | null>(null)
  const [localPayments, setLocalPayments] = useState(payments)
  const router = useRouter()
  const { toast } = useToast()
  const currencySymbol = getCurrencySymbol(currency)

  useEffect(() => {
    setLocalPayments(payments)
  }, [payments])

  const filtered = students.filter((s) =>
    (s.full_name || s.name || '').toLowerCase().includes(search.toLowerCase()) || !search
  )

  const handleToggle = async (e: React.MouseEvent, studentId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setLoading(studentId)
    const payment = localPayments.find((p) => p.student_id === studentId)
    const newPaid = !payment?.paid
    const now = new Date().toISOString()
    setLocalPayments((prev) =>
      prev.some((p) => p.student_id === studentId)
        ? prev.map((p) => (p.student_id === studentId ? { ...p, paid: newPaid, paid_at: newPaid ? now : null } : p))
        : [...prev, { student_id: studentId, month, paid: newPaid, paid_at: newPaid ? now : null }]
    )
    const hadEntry = !!payment
    const prevPaidAt = payment?.paid_at ?? null
    const revert = () =>
      setLocalPayments((prev) =>
        hadEntry
          ? prev.map((p) => (p.student_id === studentId ? { ...p, paid: !newPaid, paid_at: !newPaid ? prevPaidAt : null } : p))
          : prev.filter((p) => p.student_id !== studentId)
      )
    try {
      const result = await toggleStudentPayment(studentId, month)
      if (result.success) {
        router.refresh()
        toast({ title: '✓ تم التحديث', description: 'تم تغيير حالة الدفع بنجاح' })
      } else {
        revert()
        toast({ variant: 'destructive', title: 'خطأ', description: result.error || 'فشل تحديث حالة الدفع' })
      }
    } catch {
      revert()
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل تحديث حالة الدفع' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن طالب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 min-h-[44px]"
          />
        </div>
        <AddStudentDialog students={students} />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
          <CardContent className="p-8 md:p-12 flex flex-col items-center gap-4 text-center">
            <Users className="w-12 h-12 text-primary/40" />
            <div>
              <h3 className="text-xl font-bold mb-1">{students.length === 0 ? 'لا يوجد طلاب بعد' : 'لا يوجد طلاب'}</h3>
              <p className="text-muted-foreground">
                {students.length === 0 ? 'أضف طلابك الجدد لبدء تتبع المدفوعات' : 'جرّب بحثاً مختلفاً'}
              </p>
            </div>
            {students.length === 0 && <AddStudentDialog students={students} />}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 bg-muted/40 md:bg-transparent rounded-2xl p-2 md:p-0">
          {filtered.map((student) => {
            const payment = localPayments.find((p) => p.student_id === student.id)
            const isPaid = payment?.paid || false
            const status = getPaymentStatus(isPaid)
            return (
              <Link key={student.id} href={`/dashboard/students/${student.id}`} className="block">
                <Card className={`overflow-hidden transition-all duration-300 border-none shadow-md hover:shadow-lg ${status.cardClass}`}>
                  <CardContent className="p-3 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 w-full">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0 ${status.avatarClass}`}>
                        {status.icon === 'check' ? <Check className="w-5 h-5 md:w-6 md:h-6" /> : <User className="w-5 h-5 md:w-6 md:h-6" />}
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm md:text-lg truncate">{student.full_name || student.name}</h3>
                          <Badge variant={status.badgeVariant} className={status.badgeClass}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                          <span>الاشتراك: <span className="font-bold text-primary">{student.monthly_price} {currencySymbol}</span></span>
                          <span>يوم {student.payment_day || 1}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto" onClick={(e) => e.preventDefault()}>
                      {isPaid ? (
                        <AlertDialog open={undoTarget === student.id} onOpenChange={(open) => setUndoTarget(open ? student.id : null)}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              disabled={loading === student.id}
                              className="w-full sm:w-[120px] font-bold min-h-[44px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {loading === student.id ? (
                                <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                              ) : 'تراجع'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <div className="mx-auto sm:mx-0 w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-2">
                                <AlertTriangle className="w-6 h-6 text-destructive" />
                              </div>
                              <AlertDialogTitle>تراجع عن الدفع</AlertDialogTitle>
                              <AlertDialogDescription className="space-y-2">
                                <span className="block">سيتم إلغاء حالة الدفع للطالب <strong>{student.full_name || student.name}</strong>.</span>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={(e) => handleToggle(e, student.id)}
                              >
                                نعم، تراجع
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button
                          variant="default"
                          onClick={(e) => handleToggle(e, student.id)}
                          disabled={loading === student.id}
                          className="w-full sm:w-[120px] font-bold bg-emerald-600 hover:bg-emerald-700 min-h-[44px]"
                        >
                          {loading === student.id ? (
                            <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                          ) : 'تحديد كمدفوع'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
