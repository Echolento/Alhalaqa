'use client'

// components/welcome/instapay-form.tsx
// Onboarding STEP 2 (InstaPay contract): fully optional — blanks skip and
// the teacher fills it later from Settings. Faint Later jumps straight to
// the dashboard (conscious skip, never prominent).
// Test seam: `onSubmit` override; production uses completeInstapayOnboarding.

import { useState } from 'react'
import Link from 'next/link'
import { completeInstapayOnboarding } from '@/lib/auth-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { ONBOARDING_COPY } from '@/lib/onboarding-copy'

export function InstapayForm(props: {
  onSubmit?: (formData: FormData) => Promise<{ error?: string } | undefined | void>
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    try {
      const result = props.onSubmit
        ? await props.onSubmit(formData)
        : await completeInstapayOnboarding(formData)
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
            <Label htmlFor="instapay_link">{ONBOARDING_COPY.instapayLinkLabel}</Label>
            <Input
              id="instapay_link"
              name="instapay_link"
              data-testid="instapay-link-input"
              type="url"
              placeholder="https://ipn.eg/S/..."
              dir="ltr"
              className="text-left"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instapay_handle">{ONBOARDING_COPY.instapayHandleLabel}</Label>
            <Input
              id="instapay_handle"
              name="instapay_handle"
              data-testid="instapay-handle-input"
              type="text"
              placeholder="name@instapay"
              dir="ltr"
              className="text-left"
            />
          </div>

          <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
            {loading ? ONBOARDING_COPY.basicsSaving : ONBOARDING_COPY.instapaySubmit}
          </Button>

          <div className="text-center">
            <Link
              href="/dashboard"
              className="text-xs font-normal text-muted-foreground/50 hover:text-muted-foreground"
            >
              {ONBOARDING_COPY.instapayLater}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
