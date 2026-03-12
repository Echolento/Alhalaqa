'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { Calendar, CheckCircle, Clock, Star, Users, TrendingUp } from 'lucide-react'
import type { UserRole } from '@/lib/types'

interface SessionNote {
  rating: number | null
}

interface Session {
  id: string
  scheduled_at: string
  status: string
  duration_minutes: number
  session_notes?: SessionNote[]
}

interface Student {
  id: string
  profile: { full_name: string | null }
}

interface AnalyticsViewProps {
  sessions: Session[]
  students: Student[]
  role: UserRole
}

// Compute colors in JS since Recharts doesn't support CSS variables
const COLORS = {
  primary: '#14a085',
  success: '#34a78f',
  warning: '#d4a832',
  muted: '#64748b',
  chart1: '#14a085',
  chart2: '#34a78f',
  chart3: '#d4a832',
  chart4: '#4a90a8',
}

export function AnalyticsView({ sessions, students, role }: AnalyticsViewProps) {
  // Calculate statistics
  const now = new Date()
  const completedSessions = sessions.filter(s => s.status === 'completed')
  const overdueSessions = sessions.filter(s => {
    if (s.status !== 'scheduled') return false
    const endTime = new Date(new Date(s.scheduled_at).getTime() + (s.duration_minutes || 60) * 60 * 1000)
    return endTime <= now
  })
  const scheduledSessions = sessions.filter(s => {
    if (s.status !== 'scheduled') return false
    const endTime = new Date(new Date(s.scheduled_at).getTime() + (s.duration_minutes || 60) * 60 * 1000)
    return endTime > now
  })

  const ratings = completedSessions
    .flatMap(s => s.session_notes?.map(n => n.rating) || [])
    .filter((r): r is number => r !== null)

  const avgRating = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : 0

  const totalMinutes = completedSessions.reduce((sum, s) => sum + s.duration_minutes, 0)
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10

  // Sessions by status for pie chart
  const statusData = [
    { name: 'مكتملة', value: completedSessions.length, color: COLORS.success },
    { name: 'قادمة', value: scheduledSessions.length, color: COLORS.primary },
    { name: 'متأخرة', value: overdueSessions.length, color: COLORS.warning },
  ].filter(d => d.value > 0)

  // Sessions by month for bar chart
  const monthlyData = getMonthlyData(sessions)

  // Rating distribution
  const ratingData = [1, 2, 3, 4, 5].map(rating => ({
    rating: `${rating}`,
    count: ratings.filter(r => r === rating).length,
  }))

  // Weekly trend (last 8 weeks)
  const weeklyTrend = getWeeklyTrend(sessions)

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sessions.length}</p>
              <p className="text-sm text-muted-foreground">إجمالي الحصص</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-success/10 text-success">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedSessions.length}</p>
              <p className="text-sm text-muted-foreground">مكتملة</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-warning/10 text-warning">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overdueSessions.length}</p>
              <p className="text-sm text-muted-foreground">متأخرة</p>
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
            <div className="p-3 rounded-lg bg-chart-4/10 text-chart-4">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalHours}</p>
              <p className="text-sm text-muted-foreground">ساعات تدريس</p>
            </div>
          </CardContent>
        </Card>

        {role === 'teacher' && (
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-chart-2/10 text-chart-2">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-sm text-muted-foreground">طالب</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sessions Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">توزيع الحصص</CardTitle>
            <CardDescription>حسب الحالة</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">لا توجد بيانات</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex justify-center gap-4 mt-4">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Sessions Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">الحصص الشهرية</CardTitle>
            <CardDescription>آخر 6 أشهر</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">لا توجد بيانات</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="sessions" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              الاتجاه الأسبوعي
            </CardTitle>
            <CardDescription>آخر 8 أسابيع</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyTrend.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">لا توجد بيانات</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrend}>
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="sessions"
                      stroke={COLORS.primary}
                      strokeWidth={2}
                      dot={{ fill: COLORS.primary }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">توزيع التقييمات</CardTitle>
            <CardDescription>تقييمات الحصص المكتملة</CardDescription>
          </CardHeader>
          <CardContent>
            {ratings.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">لا توجد تقييمات</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ratingData} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="rating" type="category" tick={{ fontSize: 12 }} width={30} />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.chart3} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Students (for teachers) */}
      {role === 'teacher' && students.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">الطلاب</CardTitle>
            <CardDescription>قائمة طلابك الحاليين</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {students.map((student) => (
                <Badge key={student.id} variant="secondary" className="text-sm py-2 px-3">
                  {student.profile?.full_name || 'طالب'}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function getMonthlyData(sessions: Session[]) {
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  const now = new Date()
  const result = []

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthSessions = sessions.filter(s => {
      const sessionDate = new Date(s.scheduled_at)
      return sessionDate.getMonth() === date.getMonth() && sessionDate.getFullYear() === date.getFullYear()
    })
    result.push({
      month: months[date.getMonth()],
      sessions: monthSessions.length,
    })
  }

  return result
}

function getWeeklyTrend(sessions: Session[]) {
  const now = new Date()
  const result = []

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    const weekSessions = sessions.filter(s => {
      const sessionDate = new Date(s.scheduled_at)
      return sessionDate >= weekStart && sessionDate < weekEnd
    })

    result.push({
      week: `أسبوع ${8 - i}`,
      sessions: weekSessions.length,
    })
  }

  return result
}
