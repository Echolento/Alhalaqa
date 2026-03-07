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
import { Search, ArrowLeftRight, BookOpen, Users, UserMinus, Trash2, Calendar } from 'lucide-react'
import { transferStudent, removeStudent } from '@/lib/data-actions'
import { CreateSessionDialog } from './create-session-dialog'
import { FormattedDate } from '@/components/ui/formatted-date'
import { StudentNotesModal } from './student-notes-modal'

interface Student {
  id: string
  current_surah: string | null
  current_ayah: number | null
  profile: { full_name: string | null }
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
}

export function StudentsTable({ students, teachers, isAdmin }: StudentsTableProps) {
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isRemoveOpen, setIsRemoveOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const filteredStudents = students.filter((student) =>
    student.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) || !search
  )

  const handleTransfer = async (formData: FormData) => {
    if (!selectedStudent) return
    setLoading(true)

    const newTeacherId = formData.get('teacher_id') as string
    await transferStudent(selectedStudent.id, newTeacherId)

    setLoading(false)
    setIsTransferOpen(false)
  }

  const handleRemove = async () => {
    if (!selectedStudent) return
    setLoading(true)
    await removeStudent(selectedStudent.id)
    setLoading(false)
    setIsRemoveOpen(false)
    setSelectedStudent(null)
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
              <TableRow>
                <TableHead className="text-right">الطالب</TableHead>
                <TableHead className="text-right">التقدم الحالي</TableHead>
                {isAdmin && <TableHead className="text-right">المعلم</TableHead>}
                <TableHead className="text-right">الإجراءات</TableHead>
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
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <StudentNotesModal
                        studentId={student.id}
                        studentName={student.profile?.full_name || 'طالب'}
                        trigger={
                          <button className="flex items-center gap-3 text-right hover:text-primary transition-colors text-right group w-full">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <span className="text-sm font-medium text-primary">
                                {student.profile?.full_name?.charAt(0) || '؟'}
                              </span>
                            </div>
                            <span className="font-medium">
                              {student.profile?.full_name || 'طالب'}
                            </span>
                          </button>
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {student.current_surah ? (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <BookOpen className="w-3 h-3" />
                          {student.current_surah} : {student.current_ayah || 1}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {student.teacher?.profile?.full_name || '-'}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedStudent(student)
                              setIsTransferOpen(true)
                            }}
                          >
                            <ArrowLeftRight className="w-4 h-4 ml-1" />
                            نقل
                          </Button>
                        )}
                        {!isAdmin && (
                          <div className="flex items-center gap-2">
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
                ))
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
              <Card key={student.id}>
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
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-primary hover:underline">
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
                        </div>
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
