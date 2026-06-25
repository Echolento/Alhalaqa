'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Bell, BellOff } from 'lucide-react'
import { usePushNotifications } from '@/hooks/use-push-notifications'

export function NotificationToggle() {
  const { isSubscribed, isLoading, error, toggle } = usePushNotifications()

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="w-5 h-5 rounded-full bg-muted animate-pulse" />
        <div className="space-y-1">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="h-3 w-48 bg-muted rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="w-5 h-5 text-primary" />
          ) : (
            <BellOff className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <Label htmlFor="push-toggle" className="text-sm font-medium">
              {isSubscribed ? 'الإشعارات مفعلة' : 'الإشعارات متوقفة'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {isSubscribed
                ? 'سيتم إرسال إشعار عند تأخر الدفع'
                : 'فعل الإشعارات ليصلك تذكير بالدفعات المتأخرة'}
            </p>
          </div>
        </div>
        <Switch
          id="push-toggle"
          checked={isSubscribed}
          onCheckedChange={toggle}
        />
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
