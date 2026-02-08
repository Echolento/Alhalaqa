'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  CheckCircle,
  Clock,
  Star,
  Video,
  ArrowLeft,
  BookOpen,
  User,
} from 'lucide-react'
import type { StudentStats } from '@/lib/types'
import { FormattedDate } from '@/components/ui/formatted-date'

interface StudentDashboardProps {
  data: {
    student: {
      current_surah: string | null
      current_ayah: number | null
      teacher: {
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
        next_task: string | null
      }>
    }>
  } | null
}

export function StudentDashboard({ data }: StudentDashboardProps) {
  const [teacherName, setTeacherName] = useState<string | null>(null)

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <BookOpen className="w-16 h-16 text-muted-foreground" />
        <p className="text-muted-foreground text-lg">لم يتم إعداد حساب الطالب بعد</p>
        <p className="text-sm text-muted-foreground">يرجى التواصل مع المعلم لإضافتك كطالب</p>
      </div>
    )
  }

  const { student, stats, upcomingSessions, recentSessions } = data

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
      } catch (_) {
        // ignore
      }
    }
    if (student?.teacher) fetchTeacherName()
  }, [student?.teacher])

  const statCards = [
    { label: 'الحصص المكتملة', value: stats.completedSessions, icon: CheckCircle, color: 'text-success' },
    { label: 'متوسط التقييم', value: stats.averageRating || '-', icon: Star, color: 'text-chart-3' },
  ]

  // Get the latest task
  const latestNote = recentSessions.length > 0 ? recentSessions[0].session_notes?.[0] : null

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">مرحباً بك</h1>
        <p className="text-sm md:text-base text-muted-foreground">متابعة حصصك وتقدمك في حفظ القرآن الكريم</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Teacher Info */}
          {student.teacher && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">معلمك</p>
                    <p className="text-lg font-bold truncate">{student.teacher.profile?.full_name || teacherName || 'معلم'}</p>
                  </div>
                </div>
                {student.teacher.google_meet_link && (
                  <Button asChild variant="outline" className="w-full sm:w-auto min-h-[44px]">
                    <a href={student.teacher.google_meet_link} target="_blank" rel="noopener noreferrer">
                      <Video className="w-4 h-4 ml-2" />
                      انضم للحصة
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {statCards.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Upcoming Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">الحصص القادمة</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/sessions">
                  عرض الكل
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              {upcomingSessions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">لا توجد حصص قادمة</p>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg bg-muted/50 gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            <FormattedDate
                              date={session.scheduled_at}
                              options={{ weekday: 'long' }}
                            />
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <FormattedDate
                              date={session.scheduled_at}
                              options={{
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }}
                            />
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <Badge variant="secondary" className="shrink-0">{session.duration_minutes} دقيقة</Badge>
                        {(session.google_meet_link || student.teacher?.google_meet_link) && (
                          <Button asChild size="sm" variant="outline" className="gap-2 min-h-[44px] w-full sm:w-auto">
                            <a
                              href={session.google_meet_link || student.teacher?.google_meet_link || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Video className="w-4 h-4" />
                              <span className="sm:hidden">دخول</span>
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
        </div>

        <div className="space-y-6">
          {/* Next Task Card */}
          {latestNote?.next_task && (
            <Card className="border-warning/20 bg-warning/5 overflow-hidden">
              <div className="h-2 bg-warning" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-warning" />
                  الواجب القادم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold leading-relaxed">{latestNote.next_task}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
