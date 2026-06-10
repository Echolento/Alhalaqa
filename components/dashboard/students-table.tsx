'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Search, Users, Plus, Pencil, Trash2, Settings2 } from 'lucide-react'
import { addStudent, updateStudent, deleteStudent, updateStudentPaymentDay } from '@/lib/data-actions'
import { useToast } from '@/components/ui/use-toast'
import { PhoneInput } from '@/components/auth/phone-input'

interface Student {
  id: string
  name: string | null
  phone: string | null
  monthly_price: number
  payment_day: number
}

interface StudentsTableProps {
  students: Student[]
  currency?: string
}

export function StudentsTable({ students, currency = 'SAR' }: StudentsTableProps) {
  const currencySymbol = currency === 'EGP' ? 'ج.م' : 'ر.س'
  const [search, setSearch] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(false)
  const [phoneValue, setPhoneValue] = useState('')
  const [editPhoneValue, setEditPhoneValue] = useState('')
  const [dayPickerOpen, setDayPickerOpen] = useState<string | null>(null)
  const [dayLoading, setDayLoading] = useState(false)
  const { toast } = useToast()

  const filteredStudents = students.filter((student) =>
    student.name?.toLowerCase().includes(search.toLowerCase()) || !search
  )

  const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const form = e.currentTarget
    const formData = new FormData(form)
    const name = formData.get('name') as string
    const phone = phoneValue ? `+20${phoneValue}` : undefined
    const result = await addStudent(name, phone)
    if (result.success) {
      toast({ title: 'تمت الإضافة', description: `تم إضافة ${name}` })
      setAddDialogOpen(false)
      setPhoneValue('')
      window.location.reload()
    } else {
      toast({ variant: 'destructive', title: 'خطأ', description: result.error })
    }
    setLoading(false)
  }

  const handleEditStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedStudent) return
    setLoading(true)
    const form = e.currentTarget
    const formData = new FormData(form)
    const name = formData.get('name') as string
    const phone = editPhoneValue ? `+20${editPhoneValue}` : undefined
    const result = await updateStudent(selectedStudent.id, name, phone)
    if (result.success) {
      toast({ title: 'تم التحديث' })
      setEditDialogOpen(false)
      window.location.reload()
    } else {
      toast({ variant: 'destructive', title: 'خطأ', description: result.error })
    }
    setLoading(false)
  }

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return
    setLoading(true)
    const result = await deleteStudent(selectedStudent.id)
    if (result.success) {
      toast({ title: 'تم الحذف', description: `تم حذف ${selectedStudent.name}` })
      setDeleteDialogOpen(false)
      window.location.reload()
    } else {
      toast({ variant: 'destructive', title: 'خطأ', description: result.error })
    }
    setLoading(false)
  }

  const handleSaveDay = async (studentId: string, day: number) => {
    setDayLoading(true)
    const result = await updateStudentPaymentDay(studentId, day)
    if (result.success) {
      toast({ title: 'تم الحفظ' })
      setDayPickerOpen(null)
      window.location.reload()
    } else {
      toast({ variant: 'destructive', title: 'خطأ', description: result.error })
    }
    setDayLoading(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-4 md:px-6 py-4 md:py-6">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          قائمة الطلاب ({filteredStudents.length})
        </CardTitle>
        <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (open) setPhoneValue('') }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة طالب
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة طالب جديد</DialogTitle>
              <DialogDescription>أدخل اسم الطالب ورقم الهاتف (اختياري)</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم <span className="text-destructive">*</span></Label>
                <Input id="name" name="name" required placeholder="أدخل اسم الطالب" />
              </div>
              <PhoneInput
                id="phone"
                name="phone"
                value={phoneValue}
                onChange={setPhoneValue}
                required={false}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={loading}>{loading ? 'جاري...' : 'إضافة'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="px-4 md:px-6 pb-4 md:pb-6 space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن طالب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Mobile list */}
        <div className="md:hidden rounded-lg border divide-y divide-primary/5">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">لا يوجد طلاب</div>
          ) : (
            filteredStudents.map((student) => (
              <div key={student.id} className="flex items-center gap-2 px-3 py-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-black">{student.name?.charAt(0) || '؟'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm truncate">{student.name || 'بدون اسم'}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="p-1.5 h-7 w-7"
                        onClick={() => {
                          setSelectedStudent(student)
                          setEditDialogOpen(true)
                          const phone = student.phone || ''
                          setEditPhoneValue(phone.startsWith('+20') ? phone.slice(3) : phone)
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="p-1.5 h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => { setSelectedStudent(student); setDeleteDialogOpen(true) }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    {student.phone && (
                      <>
                        <span className="font-mono" dir="ltr">{student.phone}</span>
                        <span>·</span>
                      </>
                    )}
                    <span className="font-semibold text-foreground">{student.monthly_price || 0} {currencySymbol}</span>
                    <span>·</span>
                    <Popover open={dayPickerOpen === student.id} onOpenChange={(open) => { if (!open) setDayPickerOpen(null) }}>
                      <PopoverTrigger asChild>
                        <button onClick={() => setDayPickerOpen(student.id)} className="hover:text-primary transition-colors">
                          يوم {student.payment_day || 1}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-fit p-3" align="start">
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                            const isSelected = d === (student.payment_day || 1)
                            return (
                              <button
                                key={d}
                                onClick={() => handleSaveDay(student.id, d)}
                                disabled={dayLoading}
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
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-lg border overflow-x-auto">
          <Table className="text-xs md:text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-2 border-primary/5">
                <TableHead className="text-right font-black text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground/50">الطالب</TableHead>
                <TableHead className="text-right font-black text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground/50">الهاتف</TableHead>
                <TableHead className="text-right font-black text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground/50">السعر</TableHead>
                <TableHead className="text-right font-black text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground/50">يوم الدفع</TableHead>
                <TableHead className="text-right font-black text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground/50">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    لا يوجد طلاب
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id} className="transition-all border-b border-primary/5">
                    <TableCell>
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <span className="text-xs md:text-sm font-black">{student.name?.charAt(0) || '؟'}</span>
                        </div>
                        <span className="font-bold text-sm md:text-base truncate max-w-[100px] md:max-w-none">{student.name || 'بدون اسم'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-muted-foreground" dir="ltr">
                      {student.phone || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="font-black">{student.monthly_price || 0} {currencySymbol}</span>
                    </TableCell>
                    <TableCell>
                      <Popover open={dayPickerOpen === student.id} onOpenChange={(open) => { if (!open) setDayPickerOpen(null) }}>
                        <PopoverTrigger asChild>
                          <button
                            onClick={() => setDayPickerOpen(student.id)}
                            className="flex items-center gap-1 hover:text-primary transition-colors py-1"
                          >
                            <span className="font-medium">يوم {student.payment_day || 1}</span>
                            <Settings2 className="w-3 h-3 opacity-60" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-fit p-3" align="start">
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                              const isSelected = d === (student.payment_day || 1)
                              return (
                                <button
                                  key={d}
                                  onClick={() => handleSaveDay(student.id, d)}
                                  disabled={dayLoading}
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
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedStudent(student)
                              setEditDialogOpen(true)
                              const phone = student.phone || ''
                              setEditPhoneValue(phone.startsWith('+20') ? phone.slice(3) : phone)
                            }}
                            className="p-2 md:px-3"
                          >
                            <Pencil className="w-4 h-4" />
                            <span className="hidden md:inline mr-1">تعديل</span>
                          </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 p-2 md:px-3"
                          onClick={() => { setSelectedStudent(student); setDeleteDialogOpen(true) }}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden md:inline mr-1">حذف</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditPhoneValue('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الطالب</DialogTitle>
            <DialogDescription>تعديل بيانات {selectedStudent?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditStudent} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">الاسم <span className="text-destructive">*</span></Label>
              <Input id="edit-name" name="name" defaultValue={selectedStudent?.name || ''} required />
            </div>
            <PhoneInput
              id="edit-phone"
              name="phone"
              value={editPhoneValue}
              onChange={setEditPhoneValue}
              required={false}
              label="رقم الهاتف (اختياري)"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={loading}>{loading ? 'جاري...' : 'حفظ'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف الطالب</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف {selectedStudent?.name}؟ سيتم حذف جميع سجلات الدفع المرتبطة به.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDeleteStudent} disabled={loading}>
              {loading ? 'جاري...' : 'تأكيد الحذف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
