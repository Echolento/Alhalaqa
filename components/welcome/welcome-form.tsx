'use client'

// components/welcome/welcome-form.tsx
// Onboarding STEP 1 (billing basics): currency + frequency + per-cycle
// price. Frequency comes FIRST — the price label adapts to it (weekly
// amount vs monthly amount). InstaPay moved to step 2 (/welcome/instapay);
// payment_day is legacy and no longer collected.
// Test seam: `onSubmit` override; production uses completeOnboarding.

import { useState } from 'react'
import { completeOnboarding } from '@/lib/auth-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { CurrencySelect } from '@/components/ui/currency-select'
import { AlertCircle } from 'lucide-react'
import {
  FREQUENCY_OPTIONS,
  FREQUENCY_PRICE_WORD,
  FREQUENCY_CYCLE_WORD,
  ONBOARDING_COPY,
} from '@/lib/onboarding-copy'
import { normalizeFrequency } from '@/lib/billing-period'

export function WelcomeForm(props: {
  onSubmit?: (formData: FormData) => Promise<{ error?: string } | undefined | void>
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [frequency, setFrequency] = useState<string>('monthly')

  const freq = normalizeFrequency(frequency)
  const priceWord = FREQUENCY_PRICE_WORD[freq] ?? FREQUENCY_PRICE_WORD.monthly
  const cycleWord = FREQUENCY_CYCLE_WORD[freq] ?? FREQUENCY_CYCLE_WORD.monthly

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    try {
      const result = props.onSubmit
        ? await props.onSubmit(formData)
        : await completeOnboarding(formData)
      if ((result as { error?: string } | undefined | void)?.error) {
        setError((result as { error: string }).error)
        setLoading(false)
      }
    } catch {
      setError('تعذر الحفظ — حاول مرة أخرى')
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
            <Label htmlFor="default_frequency">{ONBOARDING_COPY.frequencyLabel}</Label>
            <select
              id="default_frequency"
              name="default_frequency"
              data-testid="frequency-select"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[44px]"
            >
              {FREQUENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_monthly_price">
              {ONBOARDING_COPY.priceLabel(priceWord as string)}
            </Label>
            <Input
              id="default_monthly_price"
              name="default_monthly_price"
              data-testid="price-input"
              type="number"
              placeholder="0"
              required
            />
            <p className="text-xs text-muted-foreground leading-5">
              {(ONBOARDING_COPY.priceHint as (w: string) => string)(cycleWord as string)}
            </p>
            <p className="text-xs text-muted-foreground leading-5">{ONBOARDING_COPY.firstBillNote}</p>
          </div>

          <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
            {loading ? ONBOARDING_COPY.basicsSaving : ONBOARDING_COPY.basicsSubmit}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
