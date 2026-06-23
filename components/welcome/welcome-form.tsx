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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ والمتابعة'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
