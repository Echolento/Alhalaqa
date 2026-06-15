'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPasswordForEmail } from '@/lib/auth-actions'
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { AuthLayout } from '@/components/auth/auth-layout'

export default function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError(null)
        setSuccess(false)

        const result = await resetPasswordForEmail(formData)

        if (result.error) {
            setError(result.error)
        } else {
            setSuccess(true)
        }

        setLoading(false)
    }

    if (success) {
        return (
            <AuthLayout
                title="تم إرسال الرابط"
                description="يرجى التحقق من بريدك الإلكتروني"
            >
                <div className="text-center space-y-6">
                    <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                        <CheckCircle className="w-8 h-8 text-success" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">تم إرسال رابط إعادة التعيين</h3>
                        <p className="text-muted-foreground text-sm">
                            تحقق من صندوق بريدك الإلكتروني للحصول على التعليمات.
                        </p>
                    </div>
                    <Button asChild className="w-full">
                        <Link href="/auth/login">العودة لتسجيل الدخول</Link>
                    </Button>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout
            title="نسيت كلمة المرور؟"
            description="أدخل بريدك الإلكتروني لاستعادة حسابك"
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
                        placeholder="name@example.com"
                        required
                        dir="ltr"
                        className="text-right"
                        disabled={loading}
                    />
                </div>

                <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={loading}>
                    {loading ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            جاري الإرسال...
                        </>
                    ) : (
                        <>
                            إرسال الرابط
                            <ArrowLeft className="w-4 h-4" />
                        </>
                    )}
                </Button>

                <Button
                    variant="ghost"
                    className="w-full"
                    asChild
                    disabled={loading}
                >
                    <Link href="/auth/login">العودة لتسجيل الدخول</Link>
                </Button>
            </form>
        </AuthLayout>
    )
}
