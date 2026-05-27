'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
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
  ChevronLeft,
  Star
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
  autoAccepted?: boolean
}

export function StudentDashboard({ data, paymentStatus, autoAccepted }: StudentDashboardProps) {
  const [teacherName, setTeacherName] = useState<string | null>(null)

  function isToday(dateStr: string) {
    const d = new Date(dateStr)
    const t = new Date()
    return d.getFullYear() === t.getFullYear() &&
      d.getMonth() === t.getMonth() &&
      d.getDate() === t.getDate()
  }

  useEffect(() => {
    if (autoAccepted) {
      toast.success('تم قبول دعوة المعلم تلقائياً', { duration: 3000 })
    }
  }, [autoAccepted])

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
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">مرحباً {student.profile?.full_name?.split(' ')[0]}!</h1>
          <p className="text-slate-500 font-medium mt-1">نظرة سريعة على حصصك ومدفوعاتك</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/payments">
            <Badge className={`px-4 py-2 rounded-xl text-sm font-bold border-none ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700 font-bold border border-red-200"}`}>
              {isPaid ? "رسوم الشهر مدفوعة ✓" : "رسوم الشهر لم تدفع"}
            </Badge>
          </Link>
        </div>
      </div>


      <div className="space-y-8">
        {student.teacher && (
          <div className="p-5 rounded-3xl border bg-card/50 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">معلمك الحالي</p>
                <h3 className="text-xl font-black text-slate-800">{student.teacher.profile?.full_name || teacherName || 'معلم'}</h3>
              </div>
            </div>
            {student.teacher.google_meet_link && (
              <Button asChild className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                <Link href={student.teacher.google_meet_link} target="_blank">
                  <Video className="w-5 h-5 ml-2" />
                  دخول الحصة الآن
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* Last Session Notes */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" />
            ملاحظات الحصة الأخيرة
          </h2>
          {latestNote ? (
            <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white">
              <div className="bg-primary/5 px-6 py-4 border-b border-primary/5">
                <p className="text-xs font-black text-primary uppercase tracking-widest">ملخص الأداء والحفظ</p>
              </div>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    {latestNote.new_content && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الجديد</p>
                          {latestNote.rating_new != null && latestNote.rating_new > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1 text-xs px-2 py-0.5">
                              <Star className="w-3 h-3 text-amber-500" />
                              {latestNote.rating_new === 5 ? 'ممتاز' : latestNote.rating_new === 4 ? 'جيد جداً' : latestNote.rating_new === 3 ? 'جيد' : latestNote.rating_new === 2 ? 'مقبول' : 'ضعيف'}
                            </Badge>
                          )}
                        </div>
                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                          <p className="text-lg font-bold text-emerald-900 leading-relaxed">{latestNote.new_content}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    {(latestNote.recent_past_review || latestNote.far_past_review) && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">المراجعة</p>
                        <div className="grid gap-3">
                          {latestNote.recent_past_review && (
                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">القريب:</span>
                                {latestNote.rating_recent_past != null && latestNote.rating_recent_past > 0 && (
                                  <Badge variant="outline" className="flex items-center gap-1 text-xs px-2 py-0.5">
                                    <Star className="w-3 h-3 text-amber-500" />
                                    {latestNote.rating_recent_past === 5 ? 'ممتاز' : latestNote.rating_recent_past === 4 ? 'جيد جداً' : latestNote.rating_recent_past === 3 ? 'جيد' : latestNote.rating_recent_past === 2 ? 'مقبول' : 'ضعيف'}
                                  </Badge>
                                )}
                              </div>
                              <p className="font-bold text-blue-900">{latestNote.recent_past_review}</p>
                            </div>
                          )}
                          {latestNote.far_past_review && (
                            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">البعيد:</span>
                                {latestNote.rating_far_past != null && latestNote.rating_far_past > 0 && (
                                  <Badge variant="outline" className="flex items-center gap-1 text-xs px-2 py-0.5">
                                    <Star className="w-3 h-3 text-amber-500" />
                                    {latestNote.rating_far_past === 5 ? 'ممتاز' : latestNote.rating_far_past === 4 ? 'جيد جداً' : latestNote.rating_far_past === 3 ? 'جيد' : latestNote.rating_far_past === 2 ? 'مقبول' : 'ضعيف'}
                                  </Badge>
                                )}
                              </div>
                              <p className="font-bold text-indigo-900">{latestNote.far_past_review}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {latestNote.general_notes && (
                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">ملاحظات المعلم</p>
                    <p className="text-lg italic text-slate-600 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 leading-relaxed">
                      "{latestNote.general_notes}"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold text-lg">لا توجد ملاحظات من الحصص السابقة حتى الآن</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Schedule Section */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-black flex items-center gap-2">
              <Calendar className="w-7 h-7 text-primary" />
              جدول الحصص القادمة
            </h2>
            <div className="grid gap-3">
              {upcomingSessions.length > 0 ? (
                upcomingSessions.slice(0, 3).map((session) => (
                  <Card key={session.id} className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            <FormattedDate date={session.scheduled_at} options={{ month: 'short' }} />
                          </span>
                          <span className="text-lg font-black text-slate-800 leading-none">
                            <FormattedDate date={session.scheduled_at} options={{ day: 'numeric' }} />
                          </span>
                        </div>
                        <div>
                          <p className="font-black text-slate-800 flex items-center gap-2">
                            <FormattedDate date={session.scheduled_at} options={{ weekday: 'long' }} />
                            {isToday(session.scheduled_at) && (
                              <Badge variant="default" className="bg-primary/10 text-primary border-primary/20 text-[10px] py-0">
                                اليوم
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm font-bold text-primary">
                            الساعة <FormattedDate date={session.scheduled_at} options={{ hour: 'numeric', minute: 'numeric' }} />
                          </p>
                        </div>
                      </div>
                      <ChevronLeft className="w-5 h-5 text-slate-300" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-200">
                  <p className="text-slate-500 font-bold">لا توجد حصص مجدولة حالياً</p>
                </div>
              )}
              <Button asChild variant="ghost" className="w-full text-slate-500 font-bold hover:bg-slate-100 rounded-xl">
                <Link href="/dashboard/sessions">عرض كل المواعيد</Link>
              </Button>
            </div>
          </div>

          {/* Quick History Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-400">آخر الحصص المنتهية</h2>
            <div className="space-y-3">
              {recentSessions.length > 0 ? (
                recentSessions.slice(1, 4).map((session) => (
                  <div key={session.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-600">
                        <FormattedDate date={session.scheduled_at} options={{ day: 'numeric', month: 'long' }} />
                      </p>
                      <p className="text-xs text-slate-400">
                        حصة مكتملة ✓
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-100/50 text-emerald-600 border-none">
                      مكتمل
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">لا يوجد تاريخ حصص بعد</p>
              )}
              {recentSessions.length > 4 && (
                <Button asChild variant="link" className="w-full text-slate-500 font-bold">
                  <Link href="/dashboard/sessions">عرض الكل</Link>
                </Button>
              )}
            </div>
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
