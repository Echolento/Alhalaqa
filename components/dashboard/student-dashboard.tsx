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
      } catch (_) { }
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stats Card */}
        <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">الحصص المكتملة</p>
                <p className="text-3xl font-black">{stats.completedSessions}</p>
              </div>
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                <Award className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Session Card */}
        <Card className="border shadow-sm bg-primary/5 border-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">الحصة القادمة</p>
              {upcomingSessions.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                  مجدولة
                </div>
              )}
            </div>
            {upcomingSessions.length > 0 ? (
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-black text-xl text-primary">
                    <FormattedDate date={upcomingSessions[0].scheduled_at} options={{ weekday: 'long' }} />
                  </p>
                  <p className="text-sm font-bold text-muted-foreground mt-1">
                    الساعة <FormattedDate date={upcomingSessions[0].scheduled_at} options={{ hour: 'numeric', minute: 'numeric' }} />
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-muted-foreground/60 uppercase">المدة</p>
                  <p className="text-sm font-black">{upcomingSessions[0].duration_minutes || 30} دقيقة</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2 text-center">
                <Calendar className="w-5 h-5 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground font-medium">لا توجد حصص مجدولة حالياً</p>
              </div>
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

          {/* Recent Notes - More Detailed */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              ملاحظات الحصة الأخيرة
            </h3>
            {latestNote ? (
              <Card className="border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
                <div className="bg-primary/5 px-6 py-3 border-b border-primary/10">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">الخطة الدراسية والحفظ</p>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {latestNote.new_content && (
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">الجديد</p>
                          <p className="font-bold text-slate-800 bg-emerald-50 p-2 rounded-lg border border-emerald-100">{latestNote.new_content}</p>
                        </div>
                      )}
                      {latestNote.next_task && (
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">الواجب القادم</p>
                          <p className="font-black text-primary bg-primary/5 p-2 rounded-lg border border-primary/10">{latestNote.next_task}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      {(latestNote.recent_past_review || latestNote.far_past_review) && (
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">المراجعة</p>
                          <div className="space-y-2">
                            {latestNote.recent_past_review && (
                              <p className="text-sm font-bold bg-blue-50 p-2 rounded-lg border border-blue-100">
                                <span className="text-[10px] text-blue-600 block mb-0.5">القريب:</span>
                                {latestNote.recent_past_review}
                              </p>
                            )}
                            {latestNote.far_past_review && (
                              <p className="text-sm font-bold bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                                <span className="text-[10px] text-indigo-600 block mb-0.5">البعيد:</span>
                                {latestNote.far_past_review}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {latestNote.general_notes && (
                    <div className="pt-4 border-t border-dashed">
                      <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">ملاحظات إضافية</p>
                      <p className="text-sm italic text-muted-foreground bg-muted/30 p-3 rounded-xl border border-muted/50">
                        "{latestNote.general_notes}"
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 bg-muted/20 rounded-3xl border border-dashed border-muted/50">
                <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">لا توجد ملاحظات من الحصص السابقة</p>
              </div>
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
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14.5 2 14.5 7 20 7" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  )
}
