'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  CheckCircle,
  Clock,
  Video,
  ArrowLeft,
  BookOpen,
  User,
  History,
  MessageSquare,
  Wallet,
  TrendingUp,
  Award,
  ChevronLeft
} from 'lucide-react'
import type { StudentStats } from '@/lib/types'
import { FormattedDate } from '@/components/ui/formatted-date'

interface StudentDashboardProps {
  data: {
    student: {
      id: string
      current_surah: string | null
      current_ayah: number | null
      teacher_id: string | null
      profile: { full_name: string | null }
      teacher: {
        id: string
        google_meet_link: string | null
        profile: { full_name: string | null }
      } | null
    }
    stats: StudentStats
    upcomingSessions: Array<{
      id: string
      scheduled_at: string
      duration_minutes: number
      google_meet_link: string | null
    }>
    recentSessions: Array<{
      id: string
      scheduled_at: string
      session_notes: Array<{
        rating_new: number | null
        rating_far_past: number | null
        rating_recent_past: number | null
        new_content: string | null
        far_past_review: string | null
        recent_past_review: string | null
        general_notes: string | null
        next_task: string | null
      }>
    }>
  } | null
  paymentStatus?: {
    month: string
    paid: boolean
    paid_at: string | null
  } | null
}

export function StudentDashboard({ data, paymentStatus }: StudentDashboardProps) {
  const [teacherName, setTeacherName] = useState<string | null>(null)
  
  if (!data) return null

  const { student, stats, upcomingSessions, recentSessions } = data
  const isPaid = paymentStatus?.paid ?? false

  useEffect(() => {
    async function fetchTeacherName() {
      try {
        const teacher = (student as any)?.teacher
        const haveName = teacher?.profile?.full_name
        const teacherId = teacher?.id

        if (!haveName && teacherId) {
          const res = await fetch(`/api/teachers/${teacherId}/display`)
          if (res.ok) {
            const d = await res.json()
            if (d?.full_name) setTeacherName(d.full_name)
          }
        }
      } catch (_) {}
    }
    if (student?.teacher) fetchTeacherName()
  }, [student?.teacher])

  const latestNote = recentSessions.length > 0 ? recentSessions[0].session_notes?.[0] : null

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">مرحباً {student.profile?.full_name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground font-medium">نظرة سريعة على حصصك ومدفوعاتك</p>
        </div>
        
        <Link href="/dashboard/payments">
          <Badge className={`px-4 py-2 rounded-xl text-sm font-bold border-none ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700 font-bold border border-red-200"}`}>
            {isPaid ? "رسوم الشهر مدفوعة ✓" : "رسوم الشهر لم تدفع"}
          </Badge>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Simple Progress Card */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Award className="w-5 h-5" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">التقدم الحالي</p>
            </div>
            <h2 className="text-xl font-bold">سورة {student.current_surah || 'لم تحدد'}</h2>
            <p className="text-sm text-muted-foreground mt-1">آية {student.current_ayah || '-'}</p>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">الحصص المكتملة</p>
                <p className="text-2xl font-bold">{stats.completedSessions}</p>
              </div>
              <div className="w-px h-10 bg-muted" />
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">التقييم</p>
                <p className="text-2xl font-bold text-amber-500">{stats.averageRating}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Session Card */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">الحصة القادمة</p>
            {upcomingSessions.length > 0 ? (
              <div>
                <p className="font-bold text-lg">
                  <FormattedDate date={upcomingSessions[0].scheduled_at} options={{ weekday: 'long' }} />
                </p>
                <p className="text-xs text-muted-foreground">
                  الساعة <FormattedDate date={upcomingSessions[0].scheduled_at} options={{ hour: 'numeric', minute: 'numeric' }} />
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">لا توجد حصص مجدولة</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Teacher Profile Card - Simplified */}
          {student.teacher && (
            <div className="p-4 rounded-xl border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المعلم</p>
                  <h3 className="font-bold">{student.teacher.profile?.full_name || teacherName || 'معلم'}</h3>
                </div>
              </div>
              {student.teacher.google_meet_link && (
                <Button asChild size="sm" className="w-full sm:w-auto">
                  <Link href={student.teacher.google_meet_link} target="_blank">
                    <Video className="w-4 h-4 ml-2" />
                    دخول الحصة
                  </Link>
                </Button>
              )}
            </div>
          )}

          {/* Recent Notes - Simplified */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">ملاحظات الحصة الأخيرة</h3>
            {latestNote ? (
              <Card className="border shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">الواجب القادم</p>
                    <p className="font-bold">{latestNote.next_task || 'لا يوجد واجب محدد'}</p>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-1">ملاحظات المعلم</p>
                    <p className="text-sm italic">"{latestNote.general_notes || 'لا توجد ملاحظات'}"</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="text-muted-foreground text-center py-8 border-2 border-dashed rounded-xl">
                لا توجد ملاحظات سابقة
              </p>
            )}
          </div>
        </div>

        {/* Sidebar: Upcoming Sessions - Simplified */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold">الحصص القادمة</h3>
          <div className="space-y-3">
            {upcomingSessions.length > 0 ? (
              upcomingSessions.slice(0, 3).map((session) => (
                <Card key={session.id} className="border shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold">
                        <FormattedDate date={session.scheduled_at} options={{ weekday: 'long', day: 'numeric', month: 'short' }} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        الساعة <FormattedDate date={session.scheduled_at} options={{ hour: 'numeric', minute: 'numeric' }} />
                      </p>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-muted-foreground/30" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد حصص مجدولة</p>
            )}
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/dashboard/sessions">عرض الكل</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FileText({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14.5 2 14.5 7 20 7"/>
      <line x1="16" x2="8" y1="13" y2="13"/>
      <line x1="16" x2="8" y1="17" y2="17"/>
      <line x1="10" x2="8" y1="9" y2="9"/>
    </svg>
  )
}
