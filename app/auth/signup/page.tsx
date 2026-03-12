'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signUp } from '@/lib/auth-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, ArrowLeft, CheckCircle, Phone } from 'lucide-react'
import { AuthLayout } from '@/components/auth/auth-layout'
import { PasswordInput } from '@/components/auth/password-input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<string>('student')

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    formData.set('role', role)
    const result = await signUp(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.success) {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-success/20 shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-success">تم إنشاء الحساب بنجاح</CardTitle>
              <CardDescription className="mt-2 text-base">
                تم إرسال رسالة تأكيد إلى بريدك الإلكتروني. يرجى تفعيل حسابك للمتابعة.
              </CardDescription>
            </div>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/auth/login">العودة لتسجيل الدخول</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <AuthLayout
      title="إنشاء حساب جديد"
      description="انضم إلينا وابدأ رحلتك التعليمية"
    >
      <form action={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullName">الاسم الكامل</Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="أدخل اسمك الكامل"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="example@email.com"
            required
            className="text-right"
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">رقم الهاتف</Label>
          <div className="relative">
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="05xxxxxxxx"
              required
              className="text-right pr-10"
              dir="ltr"
            />
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">كلمة المرور</Label>
          <PasswordInput
            id="password"
            name="password"
            placeholder="••••••••"
            required
            minLength={6}
            showStrength
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">نوع الحساب</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue placeholder="اختر نوع الحساب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">طالب</SelectItem>
              <SelectItem value="teacher">معلم</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={loading}>
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              إنشاء حساب
              <ArrowLeft className="w-4 h-4" />
            </>
          )}
        </Button>

        <p className="text-sm text-center text-muted-foreground">
          لديك حساب بالفعل؟{' '}
          <Link href="/auth/login" className="text-primary hover:underline font-medium">
            تسجيل الدخول
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
