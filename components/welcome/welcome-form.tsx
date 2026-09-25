'use client'

import { useState } from 'react'
import { completeOnboarding } from '@/lib/auth-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { CurrencySelect } from '@/components/ui/currency-select'
import { AlertCircle } from 'lucide-react'

export function WelcomeForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await completeOnboarding(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currency">العملة</Label>
            <CurrencySelect name="currency" defaultValue="EGP" onValueChange={() => {}} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_monthly_price">السعر الشهري</Label>
            <Input
              id="default_monthly_price"
              name="default_monthly_price"
              type="number"
              placeholder="0"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_payment_day">يوم الدفع الافتراضي (اختياري)</Label>
            <Input
              id="default_payment_day"
              name="default_payment_day"
              type="number"
              min={1}
              max={31}
              placeholder="مثال: 5"
            />
            <p className="text-xs text-muted-foreground leading-5">
              يُستخدم كيوم افتراضي لكل طالب جديد — ويمكن تغييره لكل طالب لاحقاً.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            <div className="space-y-2">
              <Label htmlFor="instapay_link">رابط الدفع (انستاباي)</Label>
              <Input
                id="instapay_link"
                name="instapay_link"
                type="url"
                placeholder="https://ipn.eg/S/..."
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instapay_handle">اسم انستاباي (اختياري)</Label>
              <Input
                id="instapay_handle"
                name="instapay_handle"
                type="text"
                placeholder="name@instapay"
                dir="ltr"
                className="text-left"
              />
            </div>

            <p className="text-xs text-muted-foreground leading-5">
              يظهر هذا الرابط داخل تنبيهات الدفع وشاشة الدفع الخاصة بولي الأمر.
              يمكنك تغييره لاحقاً من الإعدادات.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ والمتابعة'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
