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
  Plus,
  UserPlus,
  AlertCircle,
  Wallet,
} from 'lucide-react'
import type { TeacherStats } from '@/lib/types'
import { FormattedDate } from '@/components/ui/formatted-date'
import { InviteStudentDialog } from './invite-student-dialog'
import { CreateSessionDialog } from './create-session-dialog'
import { getTeacherWeeklySessionCounts } from '@/lib/data-actions'
import { StudentNotesModal } from './student-notes-modal'

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
              <h3 className="text-xl font-black text-primary mb-1">إعداد الحساب مطلوب</h3>
              <p className="font-medium text-muted-foreground">ابدأ بدعوة أول طالب لك أو إضافة حصة جديدة لتتمكن من استخدام كافة المميزات.</p>
            </div>
            <InviteStudentDialog />
          </CardContent>
        </Card>
      )}

      {/* Simplified Payment Stats Banner */}
      {totalStudents > 0 && (
        <Link href="/dashboard/payments">
          <Card className={`border shadow-sm ${unpaidCount > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${unpaidCount > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">ملخص المدفوعات</h3>
                    <p className={`text-sm font-medium ${unpaidCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      {unpaidCount > 0
                        ? `يوجد ${unpaidCount} طلاب لم يدفعوا هذا الشهر`
                        : 'تم استلام جميع المدفوعات ✓'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-medium mb-1">المبلغ المستلم</p>
                    <p className="text-2xl font-bold">{totalCollected} {currencySymbol}</p>
                  </div>
                  <div className="w-px h-10 bg-muted" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-medium mb-1">المبلغ المتبقي</p>
                    <p className="text-2xl font-bold text-red-600">{Math.max(0, totalExpected - totalCollected)} {currencySymbol}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Simplified Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <Link href="/dashboard/payments" className="p-4 rounded-xl border bg-card hover:bg-muted transition-colors flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="font-bold">المدفوعات</span>
        </Link>
        <InviteStudentDialog trigger={
          <button className="p-4 rounded-xl border bg-card hover:bg-muted transition-colors flex items-center gap-3 w-full text-right">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="font-bold">دعوة طالب</span>
          </button>
        } />
        <CreateSessionDialog students={students} trigger={
          <button className="p-4 rounded-xl border bg-card hover:bg-muted transition-colors flex items-center gap-3 w-full text-right">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-bold">إضافة حصة</span>
          </button>
        } />
        <Link href="/dashboard/calendar" className="p-4 rounded-xl border bg-card hover:bg-muted transition-colors flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="font-bold">الجدول</span>
        </Link>
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
                  <p className="text-muted-foreground">لا توجد حصص مجدولة حالياً</p>
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
                              options={{ weekday: 'long', hour: '2-digit', minute: '2-digit' }}
                            />
                            <Badge variant="outline" className="text-xs py-0">
                              {session.duration_minutes} دقيقة
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {(session.google_meet_link || teacher.google_meet_link) && (
                        <Button asChild size="sm" className="w-full sm:w-auto gap-2">
                          <a
                            href={session.google_meet_link || teacher.google_meet_link || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Video className="w-4 h-4" />
                            دخول الحصة
                          </a>
                        </Button>
                      )}
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
                <p className="text-muted-foreground text-center py-8 text-sm">لا توجد حصص مكتملة بعد</p>
              ) : (
                <div className="space-y-3">
                  {recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
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
                      <Button asChild size="sm" variant="ghost" className="h-8">
                        <Link href={`/dashboard/sessions/${session.id}`}>التفاصيل</Link>
                      </Button>
                    </div>
                  ))}
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
            href="/dashboard/sessions"
            className={`
              p-2 min-h-[68px] flex flex-col items-center justify-center gap-0.5
              rounded-lg border text-center
              ${isToday
                ? 'border-primary bg-primary text-primary-foreground'
                : hasSession
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-muted bg-card hover:bg-accent/30'
              }
            `}
          >
            <span className={`text-xs font-medium ${isToday ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
              {isToday ? 'اليوم' : dayLabel}
            </span>
            <span className={`text-sm font-bold ${isToday ? 'text-primary-foreground' : ''}`}>
              {dayNum}
            </span>
            <span className={`text-lg font-bold leading-none ${isToday ? 'text-primary-foreground' : hasSession ? 'text-primary' : 'text-muted-foreground'}`}>
              {d.count}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
