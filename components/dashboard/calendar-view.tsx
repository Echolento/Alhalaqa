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
import { ChevronRight, ChevronLeft, Plus, Video, Calendar as CalendarIcon } from 'lucide-react'
import { createSession, updateSessionDetails, deleteSession } from '@/lib/data-actions'
import { cn } from '@/lib/utils'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  getDay,
  isToday as isDateToday
} from 'date-fns'
import { arSA } from 'date-fns/locale'

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
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

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
    return sessions.filter((session) => isSameDay(new Date(session.scheduled_at), date))
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
                  (session.status === 'scheduled' && new Date(new Date(session.scheduled_at).getTime() + (session.duration_minutes || 60) * 60 * 1000 + 60 * 60 * 1000) > new Date()) && 'bg-primary/20 text-primary',
                  (session.status === 'scheduled' && new Date(new Date(session.scheduled_at).getTime() + (session.duration_minutes || 60) * 60 * 1000 + 60 * 60 * 1000) <= new Date()) && 'bg-warning/20 text-warning'
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

  const selectedDateSessions = sessions.filter((session) => isSameDay(new Date(session.scheduled_at), selectedDate))

  return (
    <Card className="border-none shadow-xl bg-background/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between border-b bg-muted/30 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary font-bold">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl font-black tracking-tight">
            {format(currentDate, 'MMMM yyyy', { locale: arSA })}
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="rounded-xl">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setCurrentDate(new Date())
              setSelectedDate(new Date())
            }}
            className="rounded-xl px-4 font-bold"
          >
            اليوم
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="rounded-xl">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Mobile View: Compact Grid */}
        <div className="block md:hidden">
          <MobileCalendar 
            currentDate={currentDate} 
            selectedDate={selectedDate} 
            setSelectedDate={setSelectedDate}
            sessions={sessions}
          />
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                {format(selectedDate, 'eeee, d MMMM', { locale: arSA })}
                <Badge variant="secondary" className="mr-2 rounded-full font-black px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                  {selectedDateSessions.length} حصص
                </Badge>
              </h3>
            </div>
            
            <MobileSessionList 
              sessions={selectedDateSessions} 
              onEdit={(session) => {
                setSelectedSession(session)
                setIsEditMode(true)
                setIsDialogOpen(true)
              }}
            />
          </div>
        </div>

        {/* Desktop View: Grid */}
        <div className="hidden md:block p-6">
          <div className="grid grid-cols-7 gap-px bg-muted/30 rounded-2xl overflow-hidden border border-muted/50">
            {DAYS.map((day) => (
              <div key={day} className="bg-muted/10 p-3 text-center text-xs font-black text-muted-foreground uppercase tracking-wider">
                {day}
              </div>
            ))}
            {renderCalendarDays()}
          </div>
        </div>
      </CardContent>

      {/* Dialog for adding/viewing sessions */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         <DialogContent className="sm:max-w-lg">
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
                        (session.status === 'scheduled' && new Date(new Date(session.scheduled_at).getTime() + (session.duration_minutes || 60) * 60 * 1000 + 60 * 60 * 1000) <= new Date())
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

          {isEditMode && (
            <form action={handleCreateSession} className="space-y-4 pt-4 border-t mt-4">
              <div className="space-y-2">
                <Label htmlFor="student_id">الطالب</Label>
                <Select
                  name="student_id"
                  required
                  defaultValue={selectedSession?.student?.id}
                  disabled={true}
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
                  <Select name="duration" defaultValue={selectedSession?.duration_minutes?.toString() || "30"}>
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
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function MobileCalendar({ currentDate, selectedDate, setSelectedDate, sessions }: { 
  currentDate: Date, 
  selectedDate: Date, 
  setSelectedDate: (d: Date) => void,
  sessions: Session[]
}) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  })

  return (
    <div className="bg-muted/30 p-4">
      <div className="grid grid-cols-7 mb-4">
        {['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map((day, i) => (
          <div key={i} className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-2">
        {calendarDays.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate)
          const isCurrentMonth = isSameMonth(day, monthStart)
          const daySessions = sessions.filter(s => isSameDay(new Date(s.scheduled_at), day))
          const isToday = isDateToday(day)

          return (
            <div 
              key={i} 
              onClick={() => setSelectedDate(day)}
              className={cn(
                "relative flex flex-col items-center justify-center py-3 transition-all duration-300 rounded-2xl cursor-pointer",
                isSelected && "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110 z-10",
                !isSelected && isCurrentMonth && "hover:bg-muted/50",
                !isCurrentMonth && "opacity-10",
                isToday && !isSelected && "border border-primary/20 bg-primary/5 text-primary"
              )}
            >
              <span className="text-sm font-bold">{format(day, 'd')}</span>
              {daySessions.length > 0 && (
                <div className={cn(
                  "mt-0.5 flex gap-0.5",
                  isSelected ? "opacity-100" : "opacity-60"
                )}>
                  {daySessions.slice(0, 3).map((_, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "w-1 h-1 rounded-full",
                        isSelected ? "bg-primary-foreground" : "bg-primary"
                      )} 
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MobileSessionList({ sessions, onEdit }: { sessions: Session[], onEdit: (s: Session) => void }) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/20 rounded-3xl border border-dashed border-muted/50">
        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CalendarIcon className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-medium">لا توجد حصص مجدولة لهذا اليوم</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sessions.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()).map((session) => (
        <div 
          key={session.id}
          onClick={() => onEdit(session)}
          className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:bg-muted transition-all active:scale-95 cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0 border border-primary/10">
              <span className="text-[10px] font-black text-primary/70 leading-none">
                {format(new Date(session.scheduled_at), 'a', { locale: arSA })}
              </span>
              <span className="text-sm font-black text-primary">
                {format(new Date(session.scheduled_at), 'hh:mm')}
              </span>
            </div>
            <div>
              <p className="font-black text-base group-hover:text-primary transition-colors">
                {session.student?.profile?.full_name || 'طالب'}
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                المدة: {session.duration_minutes} دقيقة
              </p>
            </div>
          </div>
          <Badge 
            variant={session.status === 'completed' ? 'secondary' : 'outline'}
            className={cn(
              "rounded-lg px-3 py-1 font-bold",
              session.status === 'completed' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
              session.status === 'scheduled' && "bg-blue-500/10 text-blue-600 border-blue-500/20"
            )}
          >
            {session.status === 'completed' ? 'مكتمل' : 'مجدول'}
          </Badge>
        </div>
      ))}
    </div>
  )
}
