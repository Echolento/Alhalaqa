'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronRight, ChevronLeft, Plus, Video } from 'lucide-react'
import { createSession, updateSessionDetails, deleteSession } from '@/lib/data-actions'
import { cn } from '@/lib/utils'
import { FormattedDate } from '@/components/ui/formatted-date'

interface Session {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: string
  google_meet_link: string | null
  student: {
    id: string
    profile: { full_name: string | null }
  }
}

interface Student {
  id: string
  profile: { full_name: string | null }
}

interface CalendarViewProps {
  sessions: Session[]
  students: Student[]
}

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]

export function CalendarView({ sessions, students }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  useEffect(() => {
    setCurrentDate(new Date())
  }, [])

  if (!currentDate) return null // Prevent hydration mismatch by not rendering calendar until mounted

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startingDay = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const getSessionsForDate = (date: Date) => {
    return sessions.filter((session) => {
      const sessionDate = new Date(session.scheduled_at)
      return (
        sessionDate.getDate() === date.getDate() &&
        sessionDate.getMonth() === date.getMonth() &&
        sessionDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const handleCreateSession = async (formData: FormData) => {
    setLoading(true)
    const studentId = formData.get('student_id') as string
    const time = formData.get('time') as string
    const duration = formData.get('duration') as string
    const meetLink = formData.get('meet_link') as string

    if (!selectedDate || (!studentId && !selectedSession) || !time) {
      setLoading(false)
      return
    }

    const [hours, minutes] = time.split(':')
    const scheduledAt = new Date(selectedDate)
    scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0)

    if (isEditMode && selectedSession) {
      await updateSessionDetails(selectedSession.id, {
        student_id: selectedSession.student.id,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: parseInt(duration) || 30,
        google_meet_link: meetLink || undefined,
      })
    } else {
      await createSession({
        student_id: studentId,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: parseInt(duration) || 30,
        google_meet_link: meetLink || undefined,
      })
    }

    setLoading(false)
    setIsDialogOpen(false)
    setIsEditMode(false)
    setSelectedSession(null)
  }

  const renderCalendarDays = () => {
    const days = []
    const today = new Date()

    // Empty cells before the first day
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 md:h-32" />)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const daySessions = getSessionsForDate(date)
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()

      days.push(
        <div
          key={day}
          className={cn(
            'h-24 md:h-32 border border-border rounded-lg p-1 md:p-2 cursor-pointer hover:bg-accent/50 transition-colors',
            isToday && 'bg-primary/5 border-primary'
          )}
          onClick={() => {
            setSelectedDate(date)
            setIsDialogOpen(true)
            setIsEditMode(false)
            setSelectedSession(null)
          }}
        >
          <div className="flex items-center justify-between mb-1 relative">
            <span
              className={cn(
                'text-sm font-medium',
                isToday && 'text-primary'
              )}
            >
              {day}
            </span>

            {/* Badge */}
            {daySessions.length > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs',
                  'sm:absolute sm:top-1/2 sm:right-1/2 sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2', // center on small screens
                  'md:static md:transform-none' // normal positioning on laptop
                )}
              >
                {daySessions.length}
              </Badge>
            )}
          </div>

          {/* Session list: only show on md (laptop) and above */}
          <div className="hidden md:block space-y-1 overflow-hidden">
            {daySessions.slice(0, 3).map((session) => (
              <div
                key={session.id}
                className={cn(
                  'text-[10px] md:text-xs p-0.5 md:p-1 rounded truncate leading-tight',
                  session.status === 'completed' && 'bg-success/20 text-success',
                  (session.status === 'scheduled' && new Date(new Date(session.scheduled_at).getTime() + (session.duration_minutes || 60) * 60 * 1000) > new Date()) && 'bg-primary/20 text-primary',
                  (session.status === 'scheduled' && new Date(new Date(session.scheduled_at).getTime() + (session.duration_minutes || 60) * 60 * 1000) <= new Date()) && 'bg-warning/20 text-warning'
                )}
              >
                {new Date(session.scheduled_at).toLocaleTimeString('ar-SA', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })
                  .replace('ص', 'AM')
                  .replace('م', 'PM')
                  .replace(' AM', 'ص')
                  .replace(' PM', 'م')}
                <span className="hidden md:inline"> - {session.student?.profile?.full_name || 'طالب'}</span>
              </div>
            ))}
            {daySessions.length > 3 && (
              <p className="text-[10px] md:text-xs text-muted-foreground text-center">
                +{daySessions.length - 3}
              </p>
            )}
          </div>

        </div>
      )
    }

    return days
  }

  const selectedDateSessions = selectedDate ? getSessionsForDate(selectedDate) : []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{MONTHS[month]} {year}</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
          {DAYS.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              <span className="hidden md:inline">{day}</span>
              <span className="md:hidden">
                {day === 'الأحد' ? 'ح' :
                  day === 'الإثنين' ? 'ن' :
                    day === 'الثلاثاء' ? 'ث' :
                      day === 'الأربعاء' ? 'ر' :
                        day === 'الخميس' ? 'خ' :
                          day === 'الجمعة' ? 'ج' : 'س'}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 md:gap-2">{renderCalendarDays()}</div>
      </CardContent>

      {/* Dialog for adding/viewing sessions */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDate?.toLocaleDateString('ar-SA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? 'تعديل الحصة' : 'عرض الحصص أو إضافة حصة جديدة'}
            </DialogDescription>
          </DialogHeader>

          {/* Existing sessions */}
          {!isEditMode && selectedDateSessions.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-auto border-b pb-4 mb-4">
              {selectedDateSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted group"
                >
                  <div
                    className="cursor-pointer hover:underline flex-1"
                    onClick={() => {
                      if (session.status === 'scheduled') {
                        setSelectedSession(session)
                        setIsEditMode(true)
                      }
                    }}
                  >
                    <p className="font-medium">{session.student?.profile?.full_name || 'طالب'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.scheduled_at).toLocaleTimeString('ar-SA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' - '}
                      {session.duration_minutes} دقيقة
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        session.status === 'completed'
                          ? 'default'
                          : 'secondary'
                      }
                      className={
                        (session.status === 'scheduled' && new Date(new Date(session.scheduled_at).getTime() + (session.duration_minutes || 60) * 60 * 1000) <= new Date())
                          ? 'bg-warning text-warning-foreground'
                          : ''
                      }
                    >
                      {session.status === 'completed' && 'مكتمل'}
                      {session.status === 'scheduled' && (
                        new Date(new Date(session.scheduled_at).getTime() + (session.duration_minutes || 60) * 60 * 1000) > new Date()
                          ? 'مجدول'
                          : 'متأخر'
                      )}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add new session form */}
          <form action={handleCreateSession} className="space-y-4">
            {!isEditMode && (
              <h4 className="font-medium flex items-center gap-2">
                <Plus className="w-4 h-4" />
                إضافة حصة جديدة
              </h4>
            )}
            <div className="space-y-2">
              <Label htmlFor="student_id">الطالب</Label>
              <Select
                name="student_id"
                required
                defaultValue={selectedSession?.student.id}
                disabled={isEditMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الطالب" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.profile?.full_name || 'طالب'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time">الوقت</Label>
                <Input
                  id="time"
                  name="time"
                  type="time"
                  required
                  dir="ltr"
                  defaultValue={selectedSession ? new Date(selectedSession.scheduled_at).toTimeString().substring(0, 5) : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">المدة (دقيقة)</Label>
                <Select name="duration" defaultValue={selectedSession?.duration_minutes.toString() || "30"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 دقيقة</SelectItem>
                    <SelectItem value="30">30 دقيقة</SelectItem>
                    <SelectItem value="45">45 دقيقة</SelectItem>
                    <SelectItem value="60">60 دقيقة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meet_link">رابط Google Meet (اختياري)</Label>
              <Input
                id="meet_link"
                name="meet_link"
                type="url"
                placeholder="https://meet.google.com/..."
                dir="ltr"
                defaultValue={selectedSession?.google_meet_link || ''}
              />
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              {isEditMode ? (
                <>
                  <Button
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={async () => {
                      if (!selectedSession) return;
                      if (confirm('هل أنت متأكد من حذف هذه الحصة؟')) {
                        setLoading(true)
                        await deleteSession(selectedSession.id)
                        setLoading(false)
                        setIsDialogOpen(false)
                        setIsEditMode(false)
                        setSelectedSession(null)
                      }
                    }}
                  >
                    حذف الحصة
                  </Button>
                </>
              ) : (
                <Button type="submit" disabled={loading || students.length === 0} className="w-full">
                  {loading ? 'جاري الإضافة...' : 'إضافة الحصة'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
