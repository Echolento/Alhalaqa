'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { resendSignupEmail, signUp } from '@/lib/auth-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, ArrowLeft, MailCheck } from 'lucide-react'
import { AuthLayout } from '@/components/auth/auth-layout'
import { GoogleButton } from '@/components/auth/google-button'
import { PasswordInput } from '@/components/auth/password-input'

const RESEND_COOLDOWN_MS = 5 * 60 * 1000

function resendKey(forEmail: string) {
  return `resend-signup:${forEmail.trim().toLowerCase()}`
}

function cooldownLeftMs(forEmail: string): number {
  try {
    const at = Number(localStorage.getItem(resendKey(forEmail)) || 0)
    if (!at) return 0
    return Math.max(0, RESEND_COOLDOWN_MS - (Date.now() - at))
  } catch {
    return 0
  }
}

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null)
  const [emailTaken, setEmailTaken] = useState(false)
  const [success, setSuccess] = useState(false)
  const [confirmedEmail, setConfirmedEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [resendOk, setResendOk] = useState(false)
  const [cooldownMs, setCooldownMs] = useState(0)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Tick the resend cooldown while the check-email panel is visible.
  useEffect(() => {
    if (!success) return
    setCooldownMs(cooldownLeftMs(confirmedEmail || email))
    const id = setInterval(() => {
      setCooldownMs(cooldownLeftMs(confirmedEmail || email))
    }, 1000)
    return () => clearInterval(id)
  }, [success, confirmedEmail, email])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await signUp(formData)

    if (result && 'error' in result && result.error) {
      setError(result.error)
      setEmailTaken(!!(result as { emailTaken?: boolean }).emailTaken)
      setLoading(false)
    } else if (result?.success) {
      // Email confirmation required: stay here and say so — no silent
      // bounce to login. (Auto-login accounts redirect server-side.)
      const doneEmail = (result as any).email || email
      if ((result as any).resent) setResendOk(true)
      setConfirmedEmail(doneEmail)
      try {
        localStorage.setItem(resendKey(doneEmail), String(Date.now()))
      } catch {
        // Cooldown is best-effort without storage.
      }
      setCooldownMs(RESEND_COOLDOWN_MS)
      setSuccess(true)
      setLoading(false)
    }
  }

  async function handleResend() {
    const target = confirmedEmail || email
    if (!target || cooldownMs > 0 || resending) return
    setResending(true)
    setResendError(null)
    setResendOk(false)

    const result = await resendSignupEmail(target)

    if ((result as any)?.error) {
      setResendError((result as any).error as string)
    } else {
      try {
        localStorage.setItem(resendKey(target), String(Date.now()))
      } catch {
        // Cooldown is best-effort without storage.
      }
      setCooldownMs(RESEND_COOLDOWN_MS)
      setResendOk(true)
    }
    setResending(false)
  }

  if (success) {
    return (
      <AuthLayout
        title="تحقق من بريدك الإلكتروني"
        description="أرسلنا لك رابط تأكيد — حسابك جاهز بعد ضغطة واحدة"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card/50 p-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="h-6 w-6 text-primary" />
            </span>
            <p className="text-sm leading-7 text-foreground">
              أرسلنا رابط التأكيد إلى
              <br />
              <span className="font-bold" dir="ltr">{confirmedEmail || email}</span>
              <br />
              افتح بريدك واضغط الرابط لتفعيل حسابك، ثم سجل الدخول.
            </p>
            <p className="text-xs text-muted-foreground">تحقق من مجلد الرسائل المزعجة (Spam) إن لم تجدها.</p>
          </div>

          {resendError && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{resendError}</span>
            </div>
          )}
          {resendOk && (
            <div className="p-3 text-sm text-emerald-700 bg-emerald-50 rounded-lg text-center">
              أُعيد إرسال رابط التأكيد — تحقق من بريدك.
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={resending || cooldownMs > 0}
            onClick={handleResend}
          >
            {resending
              ? 'جاري الإرسال…'
              : cooldownMs > 0
                ? `إعادة الإرسال بعد ${formatCountdown(cooldownMs)}`
                : 'إعادة إرسال رابط التأكيد'}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            أكدت بريدك بالفعل؟{' '}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="إنشاء حساب جديد"
      description="انضم إلينا لتتبع مستحقاتك المالية كمعلم قرآن"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="space-y-3 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            {emailTaken && (
              <p className="text-xs text-muted-foreground border-t border-destructive/20 pt-2">
                قم بتسجيل الدخول{' '}
                <Link href="/auth/login" className="text-primary hover:underline font-medium">
                  من هنا
                </Link>
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullName">الاسم</Label>
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

        <div className="space-y-2">
          <Label htmlFor="password">كلمة المرور</Label>
          <PasswordInput
            id="password"
            name="password"
            placeholder="••••••••"
            required
            minLength={8}
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

        <GoogleButton mode="signup" />

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
