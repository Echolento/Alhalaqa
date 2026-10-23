'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, Clock, User, ChevronRight, Pencil, Trash2, Phone, Wallet, CalendarDays, Receipt, AlertTriangle, Undo2, type LucideIcon } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getPaymentStatus } from '@/lib/payment-status'
import { CURRENCY_SYMBOL } from '@/lib/currency'
import { toggleStudentPayment, updateStudentMonthlyPrice } from '@/lib/payment-actions'
import { formatDueDateAr } from '@/lib/billing-next'
import { updateStudent, deleteStudent } from '@/lib/student-actions'
import { PhoneInput } from '@/components/auth/phone-input'
import { FormattedDate } from '@/components/ui/formatted-date'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { REMIND_COPY } from '@/lib/remind-copy'
import { FREQUENCY_PRICE_WORD } from '@/lib/onboarding-copy'
import { RemindButton } from '@/components/dashboard/remind-button'
import { PayerInviteButton } from '@/components/dashboard/payer-invite-button'
import type { DashboardStudent, PaymentView } from '@/lib/types'

interface StudentProfileProps {
  student: DashboardStudent
  payments: PaymentView[]
  month: string
}

function Row({
  icon: Icon,
  label,
  children,
  edit,
}: {
  icon: LucideIcon
  label: string
  children: React.ReactNode
  edit?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 min-h-[64px] border-b last:border-b-0 border-primary/5">
      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className="font-bold text-sm md:text-base truncate">{children}</div>
      </div>
      {edit}
    </div>
  )
}

export function StudentProfile({ student, payments, month }: StudentProfileProps) {
  const router = useRouter()
  const { toast } = useToast()
  const currencySymbol = CURRENCY_SYMBOL
  // The price label must match the student's cycle — "الاشتراك الشهري" on a
  // weekly student read as a contradiction.
  const freqWord =
    FREQUENCY_PRICE_WORD[student.frequency || 'monthly'] ?? 'الشهري'
  // Paid students already advanced next_due_date, so their settled row lives
  // on paidCycleKey (the cycle to undo). Unpaid students target the outstanding
  // cycle. billing-state owns the four-state rule; the UI only maps it.
  const targetMonth = student.paidCycleKey ?? student.currentMonthKey ?? month
  const current = payments.find((p) => p.month === targetMonth)
  const rowPaid = current?.paid || false
  const state = student.paymentState
  const status = getPaymentStatus(state)

  const [loading, setLoading] = useState(false)
  const [editField, setEditField] = useState<'name' | 'phone' | 'price' | null>(null)
  const [nameVal, setNameVal] = useState(student.full_name || student.name || '')
  const [phoneVal, setPhoneVal] = useState(
    (student.phone || '').startsWith('+20') ? (student.phone || '').slice(3) : (student.phone || '')
  )
  const [priceVal, setPriceVal] = useState(String(student.monthly_price || 0))
  const [deleteOpen, setDeleteOpen] = useState(false)

  const refresh = () => router.refresh()

  const saveName = async () => {
    setLoading(true)
    const phone = student.phone || undefined
    const result = await updateStudent(student.id, nameVal, phone)
    setLoading(false)
    if ('success' in result) {
      toast({ title: '✓ تم الحفظ' })
      setEditField(null)
      refresh()
    } else {
      toast({ variant: 'destructive', title: 'خطأ', description: result.error })
    }
  }

  const savePhone = async () => {
    setLoading(true)
    const phone = phoneVal ? `+20${phoneVal}` : undefined
    const result = await updateStudent(student.id, student.full_name || student.name || '', phone)
    setLoading(false)
    if ('success' in result) {
      toast({ title: '✓ تم الحفظ' })
      setEditField(null)
      refresh()
    } else {
      toast({ variant: 'destructive', title: 'خطأ', description: result.error })
    }
  }

  const savePrice = async () => {
    const price = parseFloat(priceVal)
    if (isNaN(price)) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'يرجى إدخال رقم صحيح' })
      return
    }
    setLoading(true)
    const result = await updateStudentMonthlyPrice(student.id, price, targetMonth)
    setLoading(false)
    if ('success' in result) {
      toast({ title: '✓ تم الحفظ' })
      setEditField(null)
      refresh()
    } else {
      toast({ variant: 'destructive', title: 'خطأ', description: result.error })
    }
  }

  const handleToggle = async () => {
    setLoading(true)
    const result = await toggleStudentPayment(student.id, targetMonth)
    setLoading(false)
    if ('success' in result) {
      toast({ title: '✓ تم التحديث' })
      refresh()
    } else {
      toast({ variant: 'destructive', title: 'خطأ', description: result.error })
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    const result = await deleteStudent(student.id)
    setLoading(false)
    if ('success' in result) {
      toast({ title: 'تم الحذف' })
      router.push('/dashboard')
    } else {
      toast({ variant: 'destructive', title: 'خطأ', description: result.error })
    }
  }

  return (
    <div className="space-y-4 pb-20">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px]">
        <ChevronRight className="w-4 h-4 rotate-180" />
        رجوع للقائمة
      </Link>

      <Card className={`overflow-hidden border shadow-sm md:border-none md:shadow-md ${status.cardClass}`}>
        <CardContent className="p-4 md:p-6 flex items-center gap-3">
          {status.icon === 'check' ? <Check className={`w-7 h-7 shrink-0 ${status.iconClass}`} /> : <Clock className={`w-7 h-7 shrink-0 ${status.iconClass}`} />}
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-2xl md:text-4xl truncate">{student.full_name || student.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant={status.badgeVariant} className={status.badgeClass}>
                {status.label}
              </Badge>
              {student.paidLastPeriod ? (
                <Badge
                  data-testid="profile-paid-last-period"
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
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {student.monthly_price} {currencySymbol} ·{' '}
              {state === 'awaiting_start'
                ? `يبدأ ${formatDueDateAr(student.starts_on ?? student.next_due_date)}`
                : `الاستحقاق ${formatDueDateAr(student.next_due_date)}`}
            </p>
          </div>
          <Button
            onClick={handleToggle}
            disabled={loading}
            className={rowPaid ? 'font-bold min-h-[44px] w-auto ms-auto text-red-600 hover:text-red-700 hover:bg-red-50' : 'font-bold min-h-[44px] bg-emerald-600 hover:bg-emerald-700'}
            variant={rowPaid ? 'ghost' : 'default'}
          >
            {loading ? (
              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : rowPaid ? (
              <>
                <Undo2 className="w-4 h-4" />
                تراجع
              </>
            ) : 'تحديد كمدفوع'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <Row
          icon={User}
          label="الاسم"
          edit={<Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px] gap-1" onClick={() => { setNameVal(student.full_name || student.name || ''); setEditField('name') }}><Pencil className="w-4 h-4" />تعديل</Button>}
        >
          {student.full_name || student.name}
        </Row>
        <Row
          icon={Phone}
          label={REMIND_COPY.payerPhoneRowLabel}
          edit={<Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px] gap-1" onClick={() => setEditField('phone')}><Pencil className="w-4 h-4" />تعديل</Button>}
        >
          <span dir="ltr" className="font-mono">{student.phone || '—'}</span>
        </Row>
        <Row
          icon={Wallet}
          label={`الاشتراك ${freqWord}`}
          edit={<Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px] gap-1" onClick={() => { setPriceVal(String(student.monthly_price || 0)); setEditField('price') }}><Pencil className="w-4 h-4" />تعديل</Button>}
        >
          {student.monthly_price} {currencySymbol}
        </Row>
        <Row
          icon={CalendarDays}
          label="تاريخ الاستحقاق"
        >
          الاستحقاق {formatDueDateAr(student.next_due_date)}
        </Row>
        <Row
          icon={CalendarDays}
          label="جدول الدفع"
        >
          {freqWord}
        </Row>
      </Card>

      {/* Actions — hidden entirely when there's nothing to act on. Awaiting-start
          and claimed students had no button (nothing to review/remind/invite),
          which left an empty card. */}
      {state === 'pending' || (state === 'unpaid' && !!student.claimed_by) || !student.claimed_by ? (
        <Card>
          <CardContent className="p-4 space-y-3" dir="rtl">
            {state === 'pending' ? (
              <Link href={`/dashboard/unpaid?student=${student.id}`}>
                <Button className="w-full min-h-[44px] bg-amber-500 hover:bg-amber-600 font-bold">
                  مراجعة الإيصال
                </Button>
              </Link>
            ) : null}
            {state === 'unpaid' && student.claimed_by ? (
              <RemindButton
                studentId={student.id}
                studentName={student.full_name || student.name || 'طالب'}
                payerProfileId={student.claimed_by ?? student.payer_profile_id ?? student.payerProfileId ?? null}
                amount={Number(student.monthly_price) || undefined}
                periodKey={month}
                phone={student.phone ?? null}
              />
            ) : null}
            {!student.claimed_by ? (
              <PayerInviteButton
                studentId={student.id}
                studentName={student.full_name || student.name || 'طالب'}
                phone={student.phone ?? null}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="w-4 h-4" />
            سجل المدفوعات
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {payments.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">لا يوجد سجل بعد</p>
          ) : (
            payments.map((p) => (
              <div key={p.month} className="flex items-center gap-3 px-4 py-3 min-h-[44px] border-t border-primary/5 text-sm">
                <span className="font-mono" dir="ltr">{p.month}</span>
                <Badge variant={p.paid ? 'secondary' : 'destructive'} className="text-[10px]">
                  {p.paid ? 'مدفوع' : 'لم يدفع'}
                </Badge>
                <span className="text-muted-foreground">{p.amount_paid || 0} {currencySymbol}</span>
                {p.paid_at && (
                  <span className="text-xs text-muted-foreground mr-auto">
                    <FormattedDate date={p.paid_at} options={{ day: 'numeric', month: 'long' }} />
                  </span>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <div className="flex items-center gap-3 px-4 py-3 min-h-[64px]">
          <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">حذف الطالب</p>
            <p className="text-xs text-muted-foreground">يخفي الطالب من القوائم — سجلات الدفع محفوظة ويمكن الاسترجاع</p>
          </div>
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="min-h-[44px]">حذف الطالب</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <div className="mx-auto sm:mx-0 w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-2">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <AlertDialogTitle>حذف الطالب</AlertDialogTitle>
                <AlertDialogDescription>
                  هل أنت متأكد من حذف {student.full_name || student.name}؟ سيُخفى من القوائم مع بقاء سجلات الدفع — ويمكن استرجاعه لاحقًا.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
                  تأكيد الحذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      <Dialog open={editField === 'name'} onOpenChange={(o) => { if (!o) setEditField(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل الاسم</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>الاسم</Label>
            <Input value={nameVal} onChange={(e) => setNameVal(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditField(null)}>إلغاء</Button>
            <Button onClick={saveName} disabled={loading} className="min-h-[44px]">حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editField === 'phone'} onOpenChange={(o) => { if (!o) setEditField(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{REMIND_COPY.editPhoneDialogTitle}</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <PhoneInput id="profile-phone" name="phone" value={phoneVal} onChange={setPhoneVal} required={false} label={REMIND_COPY.payerPhoneLabel} />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {REMIND_COPY.payerPhoneHelper}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditField(null)}>إلغاء</Button>
            <Button onClick={savePhone} disabled={loading} className="min-h-[44px]">حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editField === 'price'} onOpenChange={(o) => { if (!o) setEditField(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل الاشتراك</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>السعر ({currencySymbol})</Label>
            <Input type="number" value={priceVal} onChange={(e) => setPriceVal(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditField(null)}>إلغاء</Button>
            <Button onClick={savePrice} disabled={loading} className="min-h-[44px]">حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
