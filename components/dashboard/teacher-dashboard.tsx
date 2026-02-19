import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Calendar,
  CheckCircle,
  Clock,
  Star,
  Video,
  ArrowLeft,
  BookOpen,
  Plus,
  UserPlus,
  LayoutDashboard,
  MessageSquare,
  AlertCircle,
} from 'lucide-react'
import type { TeacherStats } from '@/lib/types'
import { FormattedDate } from '@/components/ui/formatted-date'
import { InviteStudentDialog } from './invite-student-dialog'
import { CreateSessionDialog } from './create-session-dialog'
import { getTeacherWeeklySessionCounts } from '@/lib/data-actions'

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
        profile: { full_name: string | null }
      }
    }>
    needsSetup?: boolean
  } | null
  students: Array<{
    id: string
    profile: { full_name: string | null }
  }>
}

export async function TeacherDashboard({ data, students }: TeacherDashboardProps) {
  if (!data) return null

  const { stats, upcomingSessions, recentSessions, teacher, needsSetup } = data

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* Welcome & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">مرحباً بك</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {needsSetup
              ? 'لنقم بإعداد حسابك والبدء في إضافة طلابك'
              : 'إليك نظرة سريعة على نشاطك اليوم'}
          </p>
        </div>
      </div>

      {needsSetup && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 text-center md:text-right">
              <h3 className="text-lg font-semibold">إعداد الحساب مطلوب</h3>
              <p className="text-muted-foreground">
                يبدو أن حساب المعلم الخاص بك لم يكتمل بعد. يمكنك البدء بدعوة أول طالب لك أو إضافة حصة جديدة.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <InviteStudentDialog />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions - Super obvious buttons for non-tech savvy users */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-primary" />
          روابط سريعة
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <InviteButton />
          <AddSessionButton students={students} />
          <QuickLink
            href="/dashboard/calendar"
            label="عرض الجدول"
            description="مواعيد حصصك الأسبوعية"
            icon={Calendar}
            color="bg-indigo-500"
          />
          <QuickLink
            href="/dashboard/students"
            label="قائمة الطلاب"
            description="إدارة وتتبع مستوى طلابك"
            icon={Users}
            color="bg-teal-500"
          />
        </div>
      </section>

      {/* Weekly Summary */}
      <WeeklySummary />

      <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
        {/* Upcoming Sessions - Larger Span */}
        <Card className="lg:col-span-2 shadow-md border-muted-foreground/10">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="text-xl font-bold">جدول الحصص القادمة</CardTitle>
              <CardDescription>الحصص المجدولة للأيام القادمة</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/5">
              <Link href="/dashboard/calendar" className="flex items-center gap-1">
                الكل
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-4 md:pt-6 px-4 md:px-6">
            {upcomingSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">لا توجد حصص مجدولة حالياً</p>
                <p className="text-sm text-muted-foreground mt-1">ابدأ بإضافة حصة جديدة من الروابط السريعة</p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors group gap-3 md:gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                        {session.student?.profile?.full_name?.charAt(0) || '؟'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-lg truncate">{session.student?.profile?.full_name || 'طالب'}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <FormattedDate
                              date={session.scheduled_at}
                              options={{
                                weekday: 'long',
                                hour: '2-digit',
                                minute: '2-digit',
                              }}
                            />
                          </span>
                          <Badge variant="outline" className="font-normal text-xs py-0">
                            {session.duration_minutes} دقيقة
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {(session.google_meet_link || teacher.google_meet_link) && (
                        <Button asChild size="lg" className="w-full sm:w-auto min-h-[44px] rounded-xl sm:rounded-full px-6 shadow-sm hover:shadow-md transition-all gap-2">
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity / Sessions */}
        <Card className="shadow-md border-muted-foreground/10">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg">الحصص الأخيرة</CardTitle>
            <CardDescription>آخر ما تم إنجازه</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 md:pt-6 px-4 md:px-6">
            {recentSessions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm italic">لا توجد حصص مكتملة بعد</p>
            ) : (
              <div className="space-y-4">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{session.student?.profile?.full_name || 'طالب'}</p>
                        <p className="text-xs text-muted-foreground">
                          <FormattedDate
                            date={session.scheduled_at}
                            options={{
                              month: 'short',
                              day: 'numeric',
                            }}
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
  )
}

async function WeeklySummary() {
  const weekly = await getTeacherWeeklySessionCounts()

  // Today's local date string for comparison
  const now = new Date()
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        جدول الأسبوع القادم
      </h2>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 md:gap-3">
        {weekly.map((d) => {
          const dateObj = new Date(d.date + 'T12:00:00') // noon local to avoid DST edge-cases
          const isToday = d.date === todayKey
          const hasSession = d.count > 0

          const dayLabel = dateObj.toLocaleDateString('ar-SA', { weekday: 'short' })
          const dayNum = dateObj.getDate()

          return (
            <Link
              key={d.date}
              href={`/dashboard/sessions`}
              className={`
                p-2 md:p-3 min-h-[72px] flex flex-col items-center justify-center gap-1
                rounded-xl border transition-all text-center
                ${isToday
                  ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : hasSession
                    ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
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
              <div className={`
                text-lg font-bold leading-none
                ${isToday ? 'text-primary-foreground' : hasSession ? 'text-primary' : 'text-muted-foreground'}
              `}>
                {d.count}
              </div>
              {hasSession && !isToday && (
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: Math.min(d.count, 3) }).map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-primary" />
                  ))}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function InviteButton() {
  return (
    <InviteStudentDialog trigger={
      <button className="w-full text-right group flex flex-col p-4 min-h-[100px] rounded-2xl bg-card border shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white mb-2 md:mb-3 group-hover:scale-110 transition-transform">
          <UserPlus className="w-5 h-5" />
        </div>
        <p className="font-bold text-foreground">دعوة طالب جديد</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">أضف طالباً جديداً للمتابعة</p>
      </button>
    } />
  )
}

function AddSessionButton({ students }: { students: any[] }) {
  return (
    <CreateSessionDialog students={students} trigger={
      <button className="w-full text-right group flex flex-col p-4 min-h-[100px] rounded-2xl bg-card border shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white mb-2 md:mb-3 group-hover:scale-110 transition-transform">
          <Plus className="w-5 h-5" />
        </div>
        <p className="font-bold text-foreground">إضافة حصة</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">جدولة موعد تعليمي جديد</p>
      </button>
    } />
  )
}

function QuickLink({ href, label, description, icon: Icon, color }: {
  href: string;
  label: string;
  description: string;
  icon: any;
  color: string
}) {
  return (
    <Link href={href} className="group flex flex-col p-4 min-h-[100px] rounded-2xl bg-card border shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white mb-2 md:mb-3 group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="font-bold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
    </Link>
  )
}

