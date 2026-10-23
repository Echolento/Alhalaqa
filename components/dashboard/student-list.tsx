'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, Clock, Search, Users, Undo2, ChevronDown } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toggleStudentPayment } from '@/lib/payment-actions'
import { applyPaidOverride, getPaymentStatus } from '@/lib/payment-status'
import { CURRENCY_SYMBOL } from '@/lib/currency'
import { AddStudentDialog } from '@/components/dashboard/add-student-dialog'
import { ShareEntryCard } from '@/components/dashboard/share-entry-card'
import { useToast } from '@/hooks/use-toast'
import { RemindButton } from '@/components/dashboard/remind-button'
import { CLAIM_COPY } from '@/lib/claim-copy'
import { formatDueDateAr } from '@/lib/billing-next'
import type { DashboardStudent, PaymentView } from '@/lib/types'

interface StudentListProps {
  students: DashboardStudent[]
  payments: PaymentView[]
  month: string
  /** Ids of the overdue students — the ?overdue=1 email overlay lists just these. */
  overdueIds?: string[]
  showOverdue?: boolean
  /** Teacher join code shown beside the entry link (null when unavailable). */
  joinCode?: string | null
  /** Full on the first-ever render, collapsed on later visits. */
  shareEntryDefaultOpen: boolean
}

export function StudentList({ students, payments, month, overdueIds = [], showOverdue = false, joinCode = null, shareEntryDefaultOpen }: StudentListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showAwaiting, setShowAwaiting] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [undoTarget, setUndoTarget] = useState<string | null>(null)
  const [localPayments, setLocalPayments] = useState(payments)
  const { toast } = useToast()
  const currencySymbol = CURRENCY_SYMBOL
  const overdueList = overdueIds.length ? students.filter((s) => overdueIds.includes(s.id)) : []

  useEffect(() => {
    setLocalPayments(payments)
  }, [payments])

  const filtered = students.filter((s) =>
    (s.full_name || s.name || '').toLowerCase().includes(search.toLowerCase()) || !search
  )

  const resolved = filtered.map((student) => {
    const payment = localPayments.find((p) => p.student_id === student.id)
    const rowPaid = payment?.paid || false
    // billing-state owns the four-state rule; the local paid row is an
    // optimistic overlay so mark-paid/undo update the card immediately.
    const state = applyPaidOverride(student.paymentState, rowPaid)
    return { student, payment, rowPaid, state }
  })
  const awaitingRows = resolved.filter((r) => r.state === 'awaiting_start')
  const mainRows = resolved.filter((r) => r.state !== 'awaiting_start')

  const handleToggle = async (studentId: string) => {
    setLoading(studentId)
    const payment = localPayments.find((p) => p.student_id === studentId)
    const newPaid = !payment?.paid
    const row = students.find((s) => s.id === studentId)
    // Target the student's OUTSTANDING cycle (the same one the pay screen and
    // cron use), so the toggle/undo hits the right row for every frequency.
    const targetMonth = row?.paidCycleKey ?? row?.currentMonthKey ?? payment?.month ?? month
    const now = new Date().toISOString()
    setLocalPayments((prev) =>
      prev.some((p) => p.student_id === studentId)
        ? prev.map((p) => (p.student_id === studentId ? { ...p, paid: newPaid, paid_at: newPaid ? now : null } : p))
        : [...prev, { student_id: studentId, month: targetMonth, paid: newPaid, paid_at: newPaid ? now : null }]
    )
    const hadEntry = !!payment
    const prevPaidAt = payment?.paid_at ?? null
    const revert = () => {
      setLocalPayments((prev) =>
        hadEntry
          ? prev.map((p) => (p.student_id === studentId ? { ...p, paid: !newPaid, paid_at: !newPaid ? prevPaidAt : null } : p))
          : prev.filter((p) => p.student_id !== studentId)
      )
    }
    try {
      const result = await toggleStudentPayment(studentId, targetMonth)
      if (result.success) {
        // Deterministic close: Radix also closes on action-click, but the
        // controlled `open` prop is the source of truth — a stale undoTarget
        // reopened the cancel dialog on later mark-paid toggles.
        setUndoTarget(null)
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
      {students.length > 0 ? (
        <ShareEntryCard joinCode={joinCode} defaultOpen={shareEntryDefaultOpen} />
      ) : null}

      <div className="flex gap-3 items-center">
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
          {mainRows.map(({ student, rowPaid, state }) => {
            const status = getPaymentStatus(state)
            const cardHref =
              state === 'pending'
                ? `/dashboard/unpaid?student=${student.id}`
                : `/dashboard/students/${student.id}`
            return (
              <Card
                key={student.id}
                onClick={() => router.push(cardHref)}
                className={`overflow-hidden transition-all duration-300 border shadow-sm md:border-none md:shadow-md hover:shadow-lg cursor-pointer ${status.cardClass}`}
              >
                <CardContent className={`flex justify-between gap-3 ${state === 'paid' ? 'items-center px-3 py-2 md:px-4 md:py-2.5' : 'p-3 md:p-5 flex-col sm:flex-row items-center'}`}>
                  <Link href={cardHref} className="flex items-center gap-3 min-w-0 flex-1">
                      {status.icon === 'check' ? <Check className={`w-6 h-6 md:w-7 md:h-7 shrink-0 ${status.iconClass}`} /> : <Clock className={`w-6 h-6 md:w-7 md:h-7 shrink-0 ${status.iconClass}`} />}
                      <div className="space-y-1 flex-1 min-w-0">
                        <h3 className="font-black text-lg md:text-2xl truncate">{student.full_name || student.name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={status.badgeVariant} className={status.badgeClass}>
                            {status.label}
                          </Badge>
                          {student.paidLastPeriod ? (
                            <Badge
                              data-testid={`paid-last-period-${student.id}`}
                              variant="outline"
                              className="text-[10px] px-2 py-0.5"
                            >
                              الفترة السابقة مدفوعة
                            </Badge>
                          ) : null}
                          {student.claimed_by ? (
                            <Badge variant="secondary" className="bg-sky-100 text-sky-700 border-transparent text-[10px] px-2 py-0.5">
                              ولي الأمر مربوط
                            </Badge>
                          ) : null}
                          {!student.claimed_by && !student.phone ? (
                            <Badge
                              data-testid={`missing-phone-${student.id}`}
                              variant="secondary"
                              className="bg-amber-100 text-amber-700 border-transparent text-[10px] px-2 py-0.5"
                            >
                              {CLAIM_COPY.missingPhoneBadge}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                          <span>الاشتراك: <span className="font-bold text-primary">{student.monthly_price} {currencySymbol}</span></span>
                          <span>الاستحقاق {formatDueDateAr(student.next_due_date)}</span>
                        </div>
                      </div>
                    </Link>
                    <div
                      className={state === 'paid' ? 'shrink-0' : 'w-full sm:w-auto flex flex-col gap-2'}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {rowPaid ? (
                        <AlertDialog open={undoTarget === student.id} onOpenChange={(open) => setUndoTarget(open ? student.id : null)}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="تراجع عن الدفع"
                              data-testid={`undo-${student.id}`}
                              disabled={loading === student.id}
                              className="h-11 w-11 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {loading === student.id ? (
                                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                              ) : (
                                <Undo2 className="w-4 h-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
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
                                onClick={() => handleToggle(student.id)}
                              >
                                نعم، تراجع
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="default"
                            onClick={() => handleToggle(student.id)}
                            disabled={loading === student.id}
                            className="w-full sm:w-[120px] font-bold bg-emerald-600 hover:bg-emerald-700 min-h-[44px]"
                          >
                            {loading === student.id ? (
                              <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                            ) : 'تحديد كمدفوع'}
                          </Button>
                          {state === 'unpaid' && student.claimed_by ? (
                            <RemindButton
                              studentId={student.id}
                              studentName={student.full_name || student.name || 'طالب'}
                              payerProfileId={student.claimed_by ?? student.payer_profile_id ?? student.payerProfileId ?? null}
                              amount={Number(student.monthly_price) || undefined}
                              periodKey={student.currentMonthKey ?? month}
                              phone={student.phone ?? null}
                            />
                          ) : null}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
            )
          })}
        </div>
      )}

      {awaitingRows.length > 0 ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowAwaiting((v) => !v)}
            className="flex w-full items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-start"
            data-testid="awaiting-start-toggle"
          >
            <Clock className="h-5 w-5 text-sky-600" />
            <span className="font-bold">لم يبدأ بعد</span>
            <Badge variant="secondary" className="bg-sky-100 text-sky-700 border-transparent">
              {awaitingRows.length}
            </Badge>
            <ChevronDown
              className={`ms-auto h-5 w-5 transition-transform ${showAwaiting ? 'rotate-180' : ''}`}
            />
          </button>
          {showAwaiting ? (
            <div className="grid gap-3">
              {awaitingRows.map(({ student }) => (
                <Link
                  key={student.id}
                  href={`/dashboard/students/${student.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-sky-50/40 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">{student.full_name || student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      يبدأ {formatDueDateAr(student.starts_on ?? student.next_due_date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary" className="bg-sky-100 text-sky-700 border-transparent">
                      لم يبدأ بعد
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ?overdue=1 (the "still hasn't paid" email CTA): overlay the roster with
          just the overdue students the email named. */}
      <Dialog open={showOverdue} onOpenChange={(open) => { if (!open) router.replace('/dashboard') }}>
        <DialogContent dir="rtl" className="max-w-md" data-testid="overdue-overlay">
          <DialogHeader>
            <DialogTitle>متأخرون عن الدفع ({overdueList.length})</DialogTitle>
          </DialogHeader>
          {overdueList.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              لا يوجد متأخرون — كل الطلاب سدّدوا.
            </p>
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-auto">
              {overdueList.map((student) => {
                const paid = localPayments.find((p) => p.student_id === student.id)?.paid || false
                return (
                  <div
                    key={student.id}
                    data-testid={`overdue-row-${student.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold">{student.full_name || student.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.monthly_price} {currencySymbol} · الاستحقاق {formatDueDateAr(student.next_due_date)}
                      </p>
                    </div>
                    {paid ? (
                      <Badge variant="secondary" className="shrink-0 bg-emerald-100 text-emerald-700 border-transparent">
                        مدفوع
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleToggle(student.id)}
                        disabled={loading === student.id}
                        className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
                      >
                        {loading === student.id ? (
                          <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                        ) : (
                          'تحديد كمدفوع'
                        )}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
