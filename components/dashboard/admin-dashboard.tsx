import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Building,
  GraduationCap,
  Users, 
  Calendar, 
  Clock,
  ArrowLeft,
} from 'lucide-react'
import type { AdminStats } from '@/lib/types'

interface AdminDashboardProps {
  data: {
    stats: AdminStats
  } | null
}

export function AdminDashboard({ data }: AdminDashboardProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Building className="w-16 h-16 text-muted-foreground" />
        <p className="text-muted-foreground text-lg">غير مصرح بالوصول</p>
      </div>
    )
  }

  const { stats } = data

  const statCards = [
    { label: 'المؤسسات', value: stats.totalOrganizations, icon: Building, color: 'text-primary', href: '/dashboard/organizations' },
    { label: 'المعلمون', value: stats.totalTeachers, icon: GraduationCap, color: 'text-chart-2', href: '/dashboard/teachers' },
    { label: 'الطلاب', value: stats.totalStudents, icon: Users, color: 'text-chart-4', href: '/dashboard/students' },
    { label: 'إجمالي الحصص', value: stats.totalSessions, icon: Calendar, color: 'text-chart-3', href: '/dashboard/analytics' },
    { label: 'الحصص النشطة', value: stats.activeSessions, icon: Clock, color: 'text-success', href: '/dashboard/analytics' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">لوحة تحكم المشرف</h1>
        <p className="text-muted-foreground">إدارة المؤسسات والمعلمين والطلاب</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              المؤسسات
            </CardTitle>
            <CardDescription>إدارة مؤسسات التحفيظ</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/organizations">
                إدارة المؤسسات
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-chart-2" />
              المعلمون
            </CardTitle>
            <CardDescription>إدارة حسابات المعلمين</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/teachers">
                إدارة المعلمين
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-chart-4" />
              الطلاب
            </CardTitle>
            <CardDescription>إدارة الطلاب ونقلهم بين المعلمين</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/students">
                إدارة الطلاب
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
