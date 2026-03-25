'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { User, Video, FileText, CheckCircle, AlertCircle, Calendar } from 'lucide-react'
import { FormattedDate } from '@/components/ui/formatted-date'
import { updateTeacherSettings, signOut } from '@/lib/auth-actions'
import type { Profile } from '@/lib/types'

interface TeacherData {
  id: string
  google_meet_link: string | null
  bio: string | null
  currency: string
  default_monthly_price: number
}

interface SettingsFormProps {
  profile: Profile
  teacherData: TeacherData | null
  email: string
}

export function SettingsForm({ profile, teacherData, email }: SettingsFormProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roleLabels = {
    admin: 'مشرف',
    teacher: 'معلم',
    student: 'طالب',
  }

  const handleTeacherSettings = async (formData: FormData) => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    const result = await updateTeacherSettings(formData)

    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }

    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            معلومات الحساب
          </CardTitle>
          <CardDescription>معلومات حسابك الأساسية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {profile.full_name?.charAt(0) || '؟'}
              </span>
            </div>
            <div>
              <p className="text-lg font-medium">{profile.full_name || 'مستخدم'}</p>
              <Badge variant="secondary">{roleLabels[profile.role]}</Badge>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={profile.full_name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input value={email} disabled dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>تاريخ الانضمام</Label>
              <div
                className="flex-1 text-right"
              >
                <FormattedDate
                  date={profile.created_at}
                  options={{
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }}
                  className="px-3 py-2 border rounded-md bg-muted block w-full text-right"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teacher Settings */}
      {profile.role === 'teacher' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              إعدادات المعلم
            </CardTitle>
            <CardDescription>إعدادات خاصة بحساب المعلم</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleTeacherSettings} className="space-y-4">
              {success && (
                <div className="flex items-center gap-2 p-3 text-sm text-success bg-success/10 rounded-lg">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>تم حفظ الإعدادات بنجاح</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="google_meet_link">رابط Google Meet الافتراضي</Label>
                <Input
                  id="google_meet_link"
                  name="google_meet_link"
                  type="url"
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  defaultValue={teacherData?.google_meet_link || ''}
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  سيُستخدم هذا الرابط تلقائياً لجميع الحصص الجديدة
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">العملة والمنطقة</Label>
                <select
                  id="currency"
                  name="currency"
                  defaultValue={teacherData?.currency || 'EGP'}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="EGP">الجنية المصري (EGP)</option>
                  <option value="SAR">الريال السعودي (SAR)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  اختر العملة التي تود ضهورها في تقارير المدفوعات والاشتراكات
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_monthly_price">السعر الافتراضي للطلاب الجدد ({teacherData?.currency === 'EGP' ? 'ج.م' : 'ر.س'})</Label>
                <Input
                  id="default_monthly_price"
                  name="default_monthly_price"
                  type="number"
                  placeholder="0"
                  defaultValue={teacherData?.default_monthly_price || 0}
                />
                <p className="text-xs text-muted-foreground">
                  سيتم تطبيق هذا السعر تلقائياً عند إضافة طالب جديد
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">نبذة عنك</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  placeholder="اكتب نبذة مختصرة عن خبرتك في التدريس..."
                  defaultValue={teacherData?.bio || ''}
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Logout */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">تسجيل الخروج</CardTitle>
          <CardDescription>
            قم بتسجيل الخروج من حسابك على هذا الجهاز
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => signOut()}>
            تسجيل الخروج
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
