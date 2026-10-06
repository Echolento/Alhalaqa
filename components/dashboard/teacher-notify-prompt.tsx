'use client'

// components/dashboard/teacher-notify-prompt.tsx
// Visible teacher push prompt. The dashboard header's SilentTeacherPush can't
// ask on mobile (the permission prompt needs a user gesture) and shows nothing
// when the browser suppresses it — so teachers never subscribed and never got
// the "new receipt" alert. This is the tappable fallback: one gesture enables it.

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BellRing } from 'lucide-react'
import { usePushNotifications } from '@/hooks/use-push-notifications'

export function TeacherNotifyPrompt() {
  const { isSubscribed, isLoading, error, subscribe } = usePushNotifications()

  if (isLoading || isSubscribed) return null

  return (
    <Card data-testid="teacher-notify-prompt" dir="rtl" className="border-primary/30 bg-primary/5">
      <CardContent className="flex items-center gap-3 p-3">
        <BellRing className="h-5 w-5 shrink-0 text-primary" />
        <p className="flex-1 text-sm leading-relaxed">
          فعّل الإشعارات ليصلك تنبيه فور أن يرفع ولي الأمر إيصالاً جديداً للمراجعة.
        </p>
        <Button
          type="button"
          size="sm"
          className="shrink-0 min-h-[44px]"
          onClick={() => void subscribe()}
        >
          تفعيل
        </Button>
      </CardContent>
      {error ? (
        <p data-testid="teacher-notify-error" className="px-3 pb-3 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </Card>
  )
}
