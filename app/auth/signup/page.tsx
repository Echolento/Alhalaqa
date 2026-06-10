'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signUp } from '@/lib/auth-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { AuthLayout } from '@/components/auth/auth-layout'
import { PasswordInput } from '@/components/auth/password-input'
import { PhoneInput } from '@/components/auth/phone-input'
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/phone-utils'

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await signUp(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.success) {
      // If we're here, auto-login didn't trigger, possibly still needing verification
      // Redirect to login with a success message instead of showing the screen
      window.location.href = '/auth/login?signup_success=true'
    }
  }

  return (
    <AuthLayout
      title="إنشاء حساب جديد"
      description="انضم إلينا لتتبع مستحقاتك المالية كمعلم قرآن"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
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
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <PhoneInput
          id="phone"
          name="phone"
          value={phone}
          onChange={(val) => setPhone(val)}
          required
        />

        <div className="space-y-2">
          <Label htmlFor="password">كلمة المرور</Label>
          <PasswordInput
            id="password"
            name="password"
            placeholder="••••••••"
            required
            minLength={6}
            showStrength
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={loading}>
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              إنشاء حساب معلم
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
