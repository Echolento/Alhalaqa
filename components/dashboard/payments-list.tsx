'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreditCard, Check, User, Clock, Settings2, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toggleStudentPayment, updateStudentMonthlyPrice, updateStudentPaymentDay } from '@/lib/data-actions'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { FormattedDate } from '@/components/ui/formatted-date'

interface PaymentsListProps {
  students: any[]
  payments: any[]
  month: string
  currency: string
}

export function PaymentsList({ students, payments, month, currency }: PaymentsListProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [tempPrice, setTempPrice] = useState('')
  const [editingDay, setEditingDay] = useState<string | null>(null)
  const [undoTarget, setUndoTarget] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const currencySymbol = currency === 'EGP' ? 'ج.م' : 'ر.س'

  const handleToggle = async (studentId: string) => {
    setLoading(studentId)
    try {
      const result = await toggleStudentPayment(studentId, month)
      if (result.success) {
        router.refresh()
        toast({ title: '✓ تم التحديث', description: 'تم تغيير حالة الدفع بنجاح' })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل تحديث حالة الدفع' })
    } finally {
      setLoading(null)
    }
  }

  const handleStartEdit = (studentId: string, currentPrice: number) => {
    setEditingPrice(studentId)
    setTempPrice(currentPrice.toString())
  }

  const handleSavePrice = async (studentId: string) => {
    const priceVal = tempPrice
    if (loading === studentId) return
    
    setLoading(studentId)
    
    const price = parseFloat(priceVal)
    if (isNaN(price)) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'يرجى إدخال رقم صحيح' })
      setLoading(null)
      return
    }

    try {
      const result = await updateStudentMonthlyPrice(studentId, price, month)
      if (result.success) {
        setEditingPrice(null)
        router.refresh()
        toast({ title: '✓ تم الحفظ', description: `تم تحديث السعر إلى ${price} بنجاح` })
      } else {
        toast({ variant: 'destructive', title: 'فشل الحفظ', description: result.error || 'حدث خطأ غير معروف' })
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'خطأ في النظام', description: err.message })
    } finally {
      setLoading(null)
    }
  }

  const handleDaySelect = async (studentId: string, day: number) => {
    setLoading(studentId)
    try {
      const result = await updateStudentPaymentDay(studentId, day)
      if (result.success) {
        setEditingDay(null)
        router.refresh()
        toast({ title: '✓ تم الحفظ', description: 'تم تحديث يوم الدفع بنجاح' })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل تحديث يوم الدفع' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid gap-4 p-4">
      {students.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          لا يوجد طلاب مسجلين
        </div>
      ) : (
        students.map((student) => {
          const payment = payments.find((p) => p.student_id === student.id)
          const isPaid = payment?.paid || false
          const isEditing = editingPrice === student.id

          return (
            <Card 
              key={student.id} 
              className={`overflow-hidden transition-all duration-300 border-none shadow-md hover:shadow-lg ${
                isPaid ? 'bg-emerald-50/30' : 'bg-red-50/30 border-r-4 border-r-red-500'
              }`}
            >
              <CardContent className="p-3 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 w-full">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    isPaid ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                  }`}>
                    {isPaid ? <Check className="w-5 h-5 md:w-6 md:h-6" /> : <User className="w-5 h-5 md:w-6 md:h-6" />}
                  </div>
                  
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm md:text-lg truncate">{student.full_name}</h3>
                      <Badge 
                        variant={isPaid ? 'secondary' : 'destructive'} 
                        className={`text-[10px] px-2 py-0 ${!isPaid ? 'bg-red-600 animate-pulse' : ''}`}
                      >
                        {isPaid ? 'مدفوع' : 'لم يدفع'}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                      {/* Price Setting */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/50 px-2 py-1.5 rounded-md border border-muted-foreground/10 hover:border-muted-foreground/20 transition-colors">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>الاشتراك:</span>
                        {isEditing ? (
                          <div className="relative flex items-center gap-1">
                            <Input 
                              type="number"
                              value={tempPrice}
                              onChange={(e) => setTempPrice(e.target.value)}
                              onBlur={() => handleSavePrice(student.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  ;(e.target as any).blur()
                                }
                                if (e.key === 'Escape') setEditingPrice(null)
                                if (e.key === 'Enter' || e.key === 'Escape') e.preventDefault()
                              }}
                              className="h-8 w-20 text-xs px-2 text-center bg-white border-primary/30 focus:border-primary shadow-sm"
                              autoFocus
                            />
                            {loading === student.id && (
                              <div className="absolute -left-6 text-primary animate-spin">
                                <Settings2 className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleStartEdit(student.id, student.monthly_price)}
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <span className="font-bold text-primary">{student.monthly_price} {currencySymbol}</span>
                          </button>
                        )}
                      </div>

                      {/* Payment Day Setting */}
                      <Popover open={editingDay === student.id} onOpenChange={(open) => { if (!open) setEditingDay(null) }}>
                        <PopoverTrigger asChild>
                          <button
                            onClick={() => setEditingDay(student.id)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/50 px-2 py-1.5 rounded-md border border-muted-foreground/10 hover:border-muted-foreground/20 hover:text-primary transition-colors"
                          >
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span>يوم الدفع:</span>
                            <span className="font-bold text-slate-700">{student.payment_day || 1}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-fit p-3" align="start">
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                              const isSelected = d === (student.payment_day || 1)
                              return (
                                <button
                                  key={d}
                                  onClick={() => handleDaySelect(student.id, d)}
                                  disabled={loading === student.id}
                                  className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${
                                    isSelected
                                      ? 'bg-primary text-primary-foreground shadow-sm'
                                      : 'hover:bg-muted text-foreground'
                                  }`}
                                >
                                  {d}
                                </button>
                              )
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {isPaid && payment?.paid_at && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <FormattedDate date={payment.paid_at} options={{ day: 'numeric', month: 'long' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="w-full sm:w-auto">
                  {isPaid ? (
                    <AlertDialog open={undoTarget === student.id} onOpenChange={(open) => setUndoTarget(open ? student.id : null)}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          disabled={loading === student.id}
                          className="w-full sm:w-[120px] font-bold"
                        >
                          {loading === student.id ? (
                            <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                          ) : "تراجع"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <div className="mx-auto sm:mx-0 w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-2">
                            <AlertTriangle className="w-6 h-6 text-destructive" />
                          </div>
                          <AlertDialogTitle>تراجع عن الدفع</AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>سيتم إلغاء حالة الدفع للطالب <strong>{student.full_name}</strong>.</p>
                            <p>سيتم إعادة المبلغ المستلم إلى صفر وإزالة تاريخ الدفع. يمكنك إعادة تعيين الدفع لاحقاً.</p>
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
                    <Button
                      variant="default"
                      onClick={() => handleToggle(student.id)}
                      disabled={loading === student.id}
                      className="w-full sm:w-[120px] font-bold bg-emerald-600 hover:bg-emerald-700"
                    >
                      {loading === student.id ? (
                        <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                      ) : "تحديد كمدفوع"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
