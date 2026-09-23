'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { setAutoRemindersEnabled } from '@/lib/push-actions'

export function AutoReminderToggle({ defaultEnabled = true }: { defaultEnabled?: boolean }) {
  const [enabled, setEnabled] = useState(defaultEnabled)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onChange = async (next: boolean) => {
    setEnabled(next)
    setSaving(true)
    setError(null)
    const result = await setAutoRemindersEnabled(next)
    setSaving(false)
    if ((result as { error?: string })?.error) {
      setEnabled(!next)
      setError((result as { error: string }).error)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="auto-reminder-toggle" className="text-sm font-medium">
            {enabled ? 'التذكير التلقائي مفعل' : 'التذكير التلقائي متوقف'}
          </Label>
          <p className="text-xs text-muted-foreground">
            {enabled
              ? 'سيتم إرسال تذكير تلقائي عند استحقاق الدفع'
              : 'لن يتم إرسال تذكير تلقائي — التذكير اليدوي فقط'}
          </p>
        </div>
        <Switch
          id="auto-reminder-toggle"
          checked={enabled}
          disabled={saving}
          onCheckedChange={onChange}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
