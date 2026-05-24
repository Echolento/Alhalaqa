'use client'
// Force rebuild to resolve ReferenceError

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, ArrowLeftRight, BookOpen, Users, UserMinus, Trash2, Calendar, Wallet, Check, X } from 'lucide-react'
import { transferStudent, removeStudent, toggleStudentPayment } from '@/lib/data-actions'
import { CreateSessionDialog } from './create-session-dialog'
import { FormattedDate } from '@/components/ui/formatted-date'
import { StudentNotesModal } from './student-notes-modal'
import { useToast } from '@/components/ui/use-toast'

interface Student {
  id: string
  current_surah: string | null
  current_ayah: number | null
  profile: { full_name: string | null }
  monthly_price: number
  teacher?: {
    id: string
    profile: { full_name: string | null }
  }
}

interface Teacher {
  id: string
  profile: { full_name: string | null }
}

interface StudentsTableProps {
  students: Student[]
  teachers: Teacher[]
  isAdmin: boolean
  payments?: Array<{ student_id: string; paid: boolean }>
  currency?: string
}

export function StudentsTable({ students, teachers, isAdmin, payments = [], currency = 'SAR' }: StudentsTableProps) {
  const currencySymbol = currency === 'EGP' ? 'ج.م' : 'ر.س'
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isRemoveOpen, setIsRemoveOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const filteredStudents = students.filter((student) =>
    student.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) || !search
  )

  const handleTransfer = async (formData: FormData) => {
    if (!selectedStudent) return
    setLoading(true)

    try {
      const newTeacherId = formData.get('teacher_id') as string
      const result = await transferStudent(selectedStudent.id, newTeacherId)

      if (result.success) {
        toast({
          title: "تم النقل بنجاح",
          description: `تم نقل ${selectedStudent.profile?.full_name} إلى المعلم الجديد.`,
        })
        setIsTransferOpen(false)
      } else {
        toast({
          variant: "destructive",
          title: "فشل النقل",
          description: result.error || "حدث خطأ غير متوقع",
        })
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "خطأ في النظام",
        description: err.message || "فشل الاتصال بالخادم",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!selectedStudent) return
    setLoading(true)

    try {
      const result = await removeStudent(selectedStudent.id)

      if (result.success) {
        toast({
          title: "تمت الإزالة",
          description: `تمت إزالة ${selectedStudent.profile?.full_name} من قائمة طلابك.`,
        })
        setIsRemoveOpen(false)
        setSelectedStudent(null)
      } else {
        toast({
          variant: "destructive",
          title: "فشل الإزالة",
          description: result.error || "حدث خطأ غير متوقع",
        })
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "خطأ في النظام",
        description: err.message || "فشل الاتصال بالخادم",
      })
    } finally {
      setLoading(false)
    }
  }

  const getPaymentStatus = (studentId: string) => {
    const p = payments.find(p => p.student_id === studentId)
    return p?.paid ?? null // null = no payment data
  }

  const handlePaymentToggle = async (studentId: string) => {
    setPaymentLoading(studentId)
    const result = await toggleStudentPayment(studentId)
    if (result.success) {
      toast({ title: 'تم تحديث حالة الدفع' })
      window.location.reload()
    } else {
      toast({ variant: 'destructive', title: 'خطأ', description: (result as any).error })
    }
    setPaymentLoading(null)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          قائمة الطلاب ({filteredStudents.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن طالب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-2 border-primary/5">
                <TableHead className="text-right font-black text-xs uppercase tracking-widest text-muted-foreground/50">الطالب</TableHead>
                <TableHead className="text-right font-black text-xs uppercase tracking-widest text-muted-foreground/50">التقدم</TableHead>
                <TableHead className="text-right font-black text-xs uppercase tracking-widest text-muted-foreground/50">السعر</TableHead>
                <TableHead className="text-right font-black text-xs uppercase tracking-widest text-muted-foreground/50">الحالة</TableHead>
                {isAdmin && <TableHead className="text-right font-black text-xs uppercase tracking-widest text-muted-foreground/50">المعلم</TableHead>}
                <TableHead className="text-right font-black text-xs uppercase tracking-widest text-muted-foreground/50">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 4 : 3} className="text-center py-8 text-muted-foreground">
                    لا يوجد طلاب
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => {
                  const isPaid = getPaymentStatus(student.id)
                  const s = student as any
                  return (
                    <TableRow
                      key={student.id}
                      className={`h-20 transition-all border-b border-primary/5 hover:bg-primary/[0.02] ${isPaid === false ? 'bg-red-50/50' : ''}`}
                    >
                      <TableCell>
                        <StudentNotesModal
                          studentId={student.id}
                          studentName={student.profile?.full_name || 'طالب'}
                          trigger={
                            <button className="flex items-center gap-4 text-right hover:text-primary transition-all text-right group w-full outline-none">
                              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                <span className="text-sm font-black">
                                  {student.profile?.full_name?.charAt(0) || '؟'}
                                </span>
                              </div>
                              <span className={`font-black group-hover:translate-x-1 transition-transform ${isPaid === false ? 'text-red-700' : 'text-slate-900'}`}>
                                {student.profile?.full_name || 'طالب'}
                              </span>
                            </button>
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {student.current_surah ? (
                          <Badge variant="outline" className="flex items-center gap-2 w-fit px-3 py-1 font-bold border-primary/20 bg-white/50">
                            <BookOpen className="w-3.5 h-3.5 text-primary" />
                            {student.current_surah} : {student.current_ayah || 1}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground font-medium">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-black text-slate-700">{s.monthly_price || 0} {currencySymbol}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm transition-all ${isPaid === true
                            ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                            : isPaid === false
                              ? 'bg-red-600 text-white animate-pulse shadow-red-600/20'
                              : 'bg-slate-100 text-slate-500'
                            }`}
                        >
                          {isPaid === true ? 'مدفوع ✓' : isPaid === false ? 'غير مدفوع' : 'بانتظار التحصيل'}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="font-medium text-slate-500">
                          {student.teacher?.profile?.full_name || '-'}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl font-bold h-10 border-slate-200 hover:border-primary/30"
                              onClick={() => {
                                setSelectedStudent(student)
                                setIsTransferOpen(true)
                              }}
                            >
                              <ArrowLeftRight className="w-4 h-4 ml-2 text-primary" />
                              نقل
                            </Button>
                          )}
                          {!isAdmin && (
                            <div className="flex items-center gap-2">
                              {getPaymentStatus(student.id) !== null && (
                                <Button
                                  size="sm"
                                  className={`rounded-xl font-black h-10 px-4 transition-all ${getPaymentStatus(student.id)
                                    ? 'bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'
                                    }`}
                                  onClick={() => handlePaymentToggle(student.id)}
                                  disabled={paymentLoading === student.id}
                                >
                                  {getPaymentStatus(student.id) ? (
                                    <>
                                      <X className="w-4 h-4 ml-2" />
                                      إلغاء الدفع
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4 ml-2" />
                                      تحديد كمدفوع
                                    </>
                                  )}
                                </Button>
                              )}
                              <CreateSessionDialog
                                students={students}
                                defaultStudentId={student.id}
                                trigger={
                                  <Button size="sm" variant="outline" className="gap-1">
                                    <Calendar className="w-4 h-4" />
                                    جدولة حصة
                                  </Button>
                                }
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setSelectedStudent(student)
                                  setIsRemoveOpen(true)
                                }}
                              >
                                <UserMinus className="w-4 h-4 ml-1" />
                                إزالة
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card Layout */}
        <div className="md:hidden space-y-3">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا يوجد طلاب
            </div>
          ) : (
            filteredStudents.map((student) => (
              <Card key={student.id} className={getPaymentStatus(student.id) === false ? 'border-red-200 bg-red-50/50' : ''}>
                <CardContent className="p-4 space-y-3">
                  {/* Student Info */}
                  <StudentNotesModal
                    studentId={student.id}
                    studentName={student.profile?.full_name || 'طالب'}
                    trigger={
                      <div className="flex items-center gap-3 w-full text-right hover:bg-muted/50 p-1 -m-1 rounded-lg transition-colors cursor-pointer">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-lg font-medium text-primary">
                            {student.profile?.full_name?.charAt(0) || '؟'}
                          </span>
                        </div>
                        {/* <div className="flex-1 min-w-0 text-right">
                          <p className={`font-bold truncate hover:underline ${getPaymentStatus(student.id) === false ? 'text-red-700' : 'text-primary'}`}>
                            {student.profile?.full_name || 'طالب'}
                          </p>
                          {student.current_surah ? (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit mt-1">
                              <BookOpen className="w-3 h-3" />
                              {student.current_surah} : {student.current_ayah || 1}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">لم يبدأ بعد</span>
                          )}
                        </div> */}
                      </div>
                    }
                  />

                  {/* Admin: Teacher Info */}
                  {isAdmin && student.teacher && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">المعلم:</span>
                      <span className="font-medium">{student.teacher.profile?.full_name || '-'}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t">
                    {isAdmin ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 min-h-[44px]"
                        onClick={() => {
                          setSelectedStudent(student)
                          setIsTransferOpen(true)
                        }}
                      >
                        <ArrowLeftRight className="w-4 h-4 ml-1" />
                        نقل
                      </Button>
                    ) : (
                      <>
                        <CreateSessionDialog
                          students={students}
                          defaultStudentId={student.id}
                          trigger={
                            <Button size="sm" variant="outline" className="flex-1 min-h-[44px] gap-1">
                              <Calendar className="w-4 h-4" />
                              جدولة حصة
                            </Button>
                          }
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-[44px] min-w-[44px] text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => {
                            setSelectedStudent(student)
                            setIsRemoveOpen(true)
                          }}
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>

      {/* Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>نقل الطالب</DialogTitle>
            <DialogDescription>
              نقل {selectedStudent?.profile?.full_name} إلى معلم آخر
            </DialogDescription>
          </DialogHeader>

          <form action={handleTransfer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teacher_id">المعلم الجديد</Label>
              <Select name="teacher_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المعلم" />
                </SelectTrigger>
                <SelectContent>
                  {teachers
                    .filter(t => t.id !== selectedStudent?.teacher?.id)
                    .map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.profile?.full_name || 'معلم'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTransferOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'جاري النقل...' : 'نقل الطالب'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Remove Confirmation Dialog */}
      <Dialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إزالة الطالب</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رغبتك في إزالة {selectedStudent?.profile?.full_name} من قائمة طلابك؟
              سيتمكن الطالب من الانضمام لمعلم آخر بعد الإزالة.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRemoveOpen(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={loading}>
              {loading ? 'جاري الإزالة...' : 'تأكيد الإزالة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </Card>
  )
}
