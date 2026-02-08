'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, BookOpen, Calendar, TrendingUp } from 'lucide-react'
import { FormattedDate } from '@/components/ui/formatted-date'

interface SessionNote {
  new_content: string | null
  far_past_review: string | null
  recent_past_review: string | null
  general_notes: string | null
  rating: number | null
}

interface Session {
  id: string
  scheduled_at: string
  status: string
  session_notes?: SessionNote[]
}

interface ProgressViewProps {
  sessions: Session[]
}

export function ProgressView({ sessions }: ProgressViewProps) {
  const completedSessions = sessions.filter(s => s.status === 'completed')

  const ratings = completedSessions
    .flatMap(s => s.session_notes?.map(n => n.rating) || [])
    .filter((r): r is number => r !== null)

  const avgRating = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : 0

  const recentJadeed = completedSessions
    .flatMap(s => s.session_notes?.filter(n => n.new_content) || [])
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedSessions.length}</p>
              <p className="text-sm text-muted-foreground">حصة مكتملة</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-chart-3/10 text-chart-3">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgRating || '-'}</p>
              <p className="text-sm text-muted-foreground">متوسط التقييم</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-success/10 text-success">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{recentJadeed.length}</p>
              <p className="text-sm text-muted-foreground">مقاطع جديدة</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-chart-4/10 text-chart-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sessions.length}</p>
              <p className="text-sm text-muted-foreground">إجمالي الحصص</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle>سجل الحصص</CardTitle>
          <CardDescription>تفاصيل جميع الحصص المكتملة</CardDescription>
        </CardHeader>
        <CardContent>
          {completedSessions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">لا توجد حصص مكتملة بعد</p>
          ) : (
            <div className="space-y-4">
              {completedSessions.map((session) => {
                const note = session.session_notes?.[0]
                return (
                  <div
                    key={session.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium">
                        <FormattedDate
                          date={session.scheduled_at}
                          options={{
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }}
                        />
                      </p>
                      {note?.rating && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {note.rating}/5
                        </Badge>
                      )}
                    </div>

                    {note && (
                      <div className="space-y-2 text-sm">
                        {note.new_content && (
                          <div className="p-2 rounded bg-primary/5">
                            <span className="font-medium text-primary">الجديد:</span>{' '}
                            {note.new_content}
                          </div>
                        )}
                        {note.recent_past_review && (
                          <div className="p-2 rounded bg-muted">
                            <span className="font-medium text-muted-foreground">الماضي القريب:</span>{' '}
                            {note.recent_past_review}
                          </div>
                        )}
                        {note.far_past_review && (
                          <div className="p-2 rounded bg-muted">
                            <span className="font-medium text-muted-foreground">الماضي البعيد:</span>{' '}
                            {note.far_past_review}
                          </div>
                        )}
                        {note.general_notes && (
                          <div className="p-2 rounded bg-chart-3/5">
                            <span className="font-medium text-chart-3">ملاحظات:</span>{' '}
                            {note.general_notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
