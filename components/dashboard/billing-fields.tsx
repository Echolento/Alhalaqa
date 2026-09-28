'use client'

// components/dashboard/billing-fields.tsx
// Shared add-student billing block: frequency FIRST (decision order), then
// the per-cycle price with an adaptive label, then the explicit first-bill
// date (default: 1st of next month, pointed out in copy). Named inputs feed
// addStudent opts directly (frequency / price / next_due_date).

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  FREQUENCY_OPTIONS,
  FREQUENCY_PRICE_WORD,
  FREQUENCY_CYCLE_WORD,
  ONBOARDING_COPY,
} from '@/lib/onboarding-copy'
import { normalizeFrequency } from '@/lib/billing-period'

export interface BillingFieldDefaults {
  frequency: string
  price: number
  nextDueDate: string
}

export function BillingFields(props: { defaults?: BillingFieldDefaults }) {
  const [frequency, setFrequency] = useState(props.defaults?.frequency ?? 'monthly')

  const freq = normalizeFrequency(frequency)
  const priceWord = FREQUENCY_PRICE_WORD[freq] ?? FREQUENCY_PRICE_WORD.monthly
  const cycleWord = FREQUENCY_CYCLE_WORD[freq] ?? FREQUENCY_CYCLE_WORD.monthly

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="billing-frequency">{ONBOARDING_COPY.frequencyLabel}</Label>
        <select
          id="billing-frequency"
          name="frequency"
          data-testid="billing-frequency"
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
        <Label htmlFor="billing-price">{ONBOARDING_COPY.priceLabel(priceWord as string)}</Label>
        <Input
          id="billing-price"
          name="price"
          data-testid="billing-price"
          type="number"
          min={0}
          defaultValue={props.defaults?.price ?? ''}
          placeholder="0"
        />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {(ONBOARDING_COPY.priceHint as (w: string) => string)(cycleWord as string)}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="billing-next-due">{ONBOARDING_COPY.nextDueLabel}</Label>
        <Input
          id="billing-next-due"
          name="next_due_date"
          data-testid="billing-next-due"
          type="date"
          defaultValue={props.defaults?.nextDueDate ?? ''}
          className="min-h-[44px]"
        />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {ONBOARDING_COPY.firstBillNote}
        </p>
      </div>
    </div>
  )
}
