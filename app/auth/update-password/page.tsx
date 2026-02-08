'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { updateUserPassword } from '@/lib/auth-actions'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { AuthLayout } from '@/components/auth/auth-layout'
import { PasswordInput } from '@/components/auth/password-input'

export default function UpdatePasswordPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError(null)

        const result = await updateUserPassword(formData)

        if (result?.error) {
            setError(result.error)
        }

        // On success, the server action redirects to dashboard
        setLoading(false)
    }

    return (
        <AuthLayout
            title="كلمة المرور الجديدة"
            description="قم بتعيين كلمة مرور قوية لحسابك"
        >
            <form action={handleSubmit} className="space-y-6">
                {error && (
                    <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="password">كلمة المرور الجديدة</Label>
                    <PasswordInput
                        id="password"
                        name="password"
                        required
                        showStrength
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                    <PasswordInput
                        id="confirmPassword"
                        name="confirmPassword"
                        required
                    />
                </div>

                <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={loading}>
                    {loading ? (
                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            تحديث كلمة المرور
                            <ArrowLeft className="w-4 h-4" />
                        </>
                    )}
                </Button>
            </form>
        </AuthLayout>
    )
}
