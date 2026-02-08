'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from '@/lib/auth-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { AuthLayout } from '@/components/auth/auth-layout'
import { PasswordInput } from '@/components/auth/password-input'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await signIn(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="مرحباً بعودتك"
      description="أدخل بياناتك للدخول إلى حسابك"
    >
      <form action={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">كلمة المرور</Label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-primary hover:underline font-medium"
            >
              نسيت كلمة المرور؟
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            placeholder="••••••••"
            required
          />
        </div>

        <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={loading}>
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              تسجيل الدخول
              <ArrowLeft className="w-4 h-4" />
            </>
          )}
        </Button>

        <p className="text-sm text-center text-muted-foreground">
          ليس لديك حساب؟{' '}
          <Link href="/auth/signup" className="text-primary hover:underline font-medium">
            إنشاء حساب جديد
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
