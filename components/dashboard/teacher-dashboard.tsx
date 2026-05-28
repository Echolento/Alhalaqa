import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Calendar,
  CheckCircle,
  Clock,
  Video,
  ArrowLeft,
  UserPlus,
  AlertCircle,
  Wallet,
  CalendarPlus,
} from 'lucide-react'
import type { TeacherStats } from '@/lib/types'
import { FormattedDate } from '@/components/ui/formatted-date'
import { InviteStudentDialog } from './invite-student-dialog'
import { CreateSessionDialog } from './create-session-dialog'
import { getTeacherWeeklySessionCounts } from '@/lib/data-actions'
import { StudentNotesModal } from './student-notes-modal'
import { CompleteSessionButton } from './complete-session-button'

interface TeacherDashboardProps {
  data: {
    teacher: { google_meet_link: string | null }
    stats: TeacherStats
    upcomingSessions: Array<{
      id: string
      scheduled_at: string
      duration_minutes: number
      google_meet_link: string | null
      student: {
        id: string
        profile: { full_name: string | null }
      }
    }>
    recentSessions: Array<{
      id: string
      scheduled_at: string
      student: {
        id: string
        profile: { full_name: string | null }
      }
    }>
    needsSetup?: boolean
  } | null
  students: Array<{
    id: string
    profile: { full_name: string | null }
  }>
  paymentData?: {
    students: Array<{ id: string; monthly_price: number }>
    payments: Array<{ student_id: string; paid: boolean; amount_paid: number }>
    currency?: string
  }
  revenueTrend?: Array<{
    month: string
    label: string
    revenue: number
    count: number
  }>
}

export async function TeacherDashboard({ data, students, paymentData, revenueTrend }: TeacherDashboardProps) {
  if (!data) return null

  const { stats, upcomingSessions, recentSessions, teacher, needsSetup } = data
  const currency = paymentData?.currency || 'SAR'
  const currencySymbol = currency === 'EGP' ? 'ج.م' : 'ر.س'

  const totalStudents = paymentData?.students.length || 0
  const paidCount = paymentData?.payments.filter(p => p.paid).length || 0
  const unpaidCount = totalStudents - paidCount

  const totalCollected = paymentData?.payments.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0) || 0
  const totalExpected = paymentData?.students.reduce((sum, s) => sum + (Number(s.monthly_price) || 0), 0) || 0
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0

  function isToday(dateStr: string) {
    const d = new Date(dateStr)
    const t = new Date()
    return d.getFullYear() === t.getFullYear() &&
      d.getMonth() === t.getMonth() &&
      d.getDate() === t.getDate()
  }

  function canFinishSession(session: { scheduled_at: string; duration_minutes: number }) {
    const now = new Date()
    const sessionStart = new Date(session.scheduled_at)
    const sessionEnd = new Date(sessionStart.getTime() + (session.duration_minutes || 60) * 60000)
    const graceEnd = new Date(sessionEnd.getTime() + 60 * 60 * 1000)
    return now >= sessionStart && now <= graceEnd
  }

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">مرحباً بك</h1>
        </div>
      </div>

      {needsSetup && (
        <Card className="border-2 border-dashed border-primary/20 bg-primary/5 animate-pulse">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 shadow-inner">
              <AlertCircle className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-right">
              <h3 className="text-xl font-black text-primary mb-1">دعوة طلابك</h3>
              <p className="font-medium text-muted-foreground">ابدأ بدعوة طلابك الآن. سيتلقى كل طالب دعوة عبر الواتساب فور إرسال الرابط.</p>
            </div>
            <InviteStudentDialog />
          </CardContent>
        </Card>
      )}

      {/* Quick Tips for new users */}
      {students.length === 0 && (
        <div className="flex items-center gap-2 p-4 text-sm bg-blue-50 text-blue-800 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-4 duration-1000">
          <span className="text-xl">💡</span>
          <p className="font-medium">نصيحة: ابدأ بدعوة طلابك لتتمكن من إدارة حصصهم ومتابعة مدفوعاتهم في مكان واحد.</p>
        </div>
      )}

      {/* Simplified Quick Actions */}
      <div className={`grid gap-4 mt-6 ${students.length === 0 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <InviteStudentDialog trigger={
          <div role="button" tabIndex={0} className={`p-4 rounded-xl border bg-card hover:bg-muted active:bg-muted/80 transition-colors flex flex-col items-center text-center justify-center gap-2 w-full cursor-pointer h-full ${students.length === 0 ? 'border-primary/20 shadow-sm' : ''}`}>
            <div className="p-3 bg-blue-100 text-blue-700 rounded-full mb-1">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm">دعوة طالب</span>
          </div>
        } />
        
        {students.length > 0 && (
          <>
            <Link href="/dashboard/payments" className="p-4 rounded-xl border bg-card hover:bg-muted transition-colors flex flex-col items-center text-center justify-center gap-2">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-full mb-1">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm">المدفوعات</span>
            </Link>
            <CreateSessionDialog students={students} trigger={
              <div role="button" tabIndex={0} className="p-4 rounded-xl border bg-card hover:bg-muted active:bg-muted/80 transition-colors flex flex-col items-center text-center justify-center gap-2 w-full cursor-pointer h-full">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full mb-1">
                  <CalendarPlus className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm">إضافة حصة</span>
              </div>
            } />
            <Link href="/dashboard/calendar" className="p-4 rounded-xl border bg-card hover:bg-muted active:bg-muted/80 transition-colors flex flex-col items-center text-center justify-center gap-2 h-full">
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-full mb-1">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm">الجدول</span>
            </Link>
          </>
        )}
      </div>

      {/* Weekly Summary */}
      <div>
        <h2 className="text-lg font-semibold mb-3">جدول الأسبوع</h2>
        <WeeklySummary />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming Sessions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">الحصص القادمة</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/calendar" className="flex items-center gap-1">
                  الكل
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingSessions.length === 0 ? (
                <div className="text-center py-10">
                  <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {students.length === 0 
                      ? 'لا توجد حصص مجدولة. جرب دعوة طالب جديد للبدء!' 
                      : 'لا توجد حصص مجدولة حالياً'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                          {session.student?.profile?.full_name?.charAt(0) || '؟'}
                        </div>
                        <div className="min-w-0">
                          <StudentNotesModal
                            studentId={session.student?.id}
                            studentName={session.student?.profile?.full_name || 'طالب'}
                            trigger={
                              <p className="font-semibold truncate hover:text-primary cursor-pointer">
                                {session.student?.profile?.full_name || 'طالب'}
                              </p>
                            }
                          />
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                            <Clock className="w-3.5 h-3.5" />
                            <FormattedDate
                              date={session.scheduled_at}
                              options={{ weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }}
                            />
                            {isToday(session.scheduled_at) && (
                              <Badge variant="default" className="bg-primary/10 text-primary border-primary/20 text-[10px] py-0">
                                اليوم
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full">
                        {(session.google_meet_link || teacher.google_meet_link) && canFinishSession(session) && (
                          <Button asChild size="sm" variant="outline" className="flex-1 gap-2">
                            <a
                              href={session.google_meet_link || teacher.google_meet_link || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Video className="w-4 h-4" />
                              <span className="hidden sm:inline">دخول الحصة</span>
                            </a>
                          </Button>
                        )}
                        <div className={session.google_meet_link || teacher.google_meet_link ? 'flex-1' : 'w-full'}>
                          <CompleteSessionButton session={session as any} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">الحصص الأخيرة</CardTitle>
            </CardHeader>
            <CardContent>
              {recentSessions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">لا توجد حصص مكتملة. بمجرد بدء التدريس ستظهر حصصك هنا.</p>
              ) : (
                <div className="space-y-3">
                  {recentSessions.slice(0, 4).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{session.student?.profile?.full_name || 'طالب'}</p>
                        <p className="text-xs text-muted-foreground">
                          <FormattedDate
                            date={session.scheduled_at}
                            options={{ month: 'short', day: 'numeric' }}
                          />
                        </p>
                      </div>
                    </div>
                  ))}
                  {recentSessions.length > 4 && (
                    <Button asChild variant="link" className="w-full text-sm">
                      <Link href="/dashboard/sessions">عرض الكل</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

async function WeeklySummary() {
  const weekly = await getTeacherWeeklySessionCounts()

  const now = new Date()
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
      {weekly.map((d) => {
        const dateObj = new Date(d.date + 'T12:00:00')
        const isToday = d.date === todayKey
        const hasSession = d.count > 0

        const dayLabel = dateObj.toLocaleDateString('ar-SA', { weekday: 'short' })
        const dayNum = dateObj.getDate()

        return (
          <Link
            key={d.date}
            href="/dashboard/calendar"
            className={`
              p-3 min-h-[80px] flex flex-col items-center justify-center gap-1
              rounded-2xl border transition-all duration-300 active:scale-95
              ${isToday
                ? 'border-primary bg-primary text-primary-foreground'
                : hasSession
                  ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                  : 'border-border bg-card hover:bg-muted'
              }
            `}
          >
            <span className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-primary-foreground/70' : 'text-muted-foreground/60'}`}>
              {isToday ? 'اليوم' : dayLabel}
            </span>
            <span className={`text-sm font-black transition-all ${isToday ? 'text-primary-foreground' : ''}`}>
              {dayNum}
            </span>
            {hasSession && (
              <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isToday ? 'bg-primary-foreground' : 'bg-primary animate-pulse'}`} />
            )}
          </Link>
        )
      })}
    </div>
  )
}
