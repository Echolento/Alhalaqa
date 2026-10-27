'use client'

// components/pwa/install-page-card.tsx
// The one-time escape from a host that cannot open the contact picker.
//
// Samsung Internet (default on Samsung phones) exposes `navigator.contacts`
// and then refuses to open the picker, and its 22+ release removes the API
// outright. An icon installed from it can never import contacts. The same page
// installed from Chrome becomes a WebAPK — Chrome's own engine in a real app
// shell — where `select()` works. So this page exists to move the teacher onto
// that icon once; the picker then works from the home screen every day.

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, CheckCircle2, MoreVertical, Trash2 } from 'lucide-react'
import { InstallButton } from '@/components/pwa/install-button'
import { isStandaloneDisplay, useInstallPrompt } from '@/hooks/use-install-prompt'

export function InstallPageCard() {
  const { canInstall } = useInstallPrompt()
  const [standalone, setStandalone] = useState(false)
  // The prompt is only dispatched after the manifest + service worker are
  // recognised, which can land a beat after hydration.
  const [waited, setWaited] = useState(false)

  useEffect(() => {
    setStandalone(isStandaloneDisplay())
    const t = setTimeout(() => setWaited(true), 2500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <div className="container mx-auto max-w-xl px-6 py-12 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">ثبّت «الحلقة» من Chrome</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            استيراد جهات الاتصال يحتاج تطبيق الحلقة المثبّت من Chrome. الأيقونة
            المضافة من متصفح آخر تفتح الصفحة داخل متصفح لا يستطيع عرض قائمة
            جهات الاتصال، ولهذا يظهر الخطأ.
          </p>
        </header>

        {canInstall ? (
          <div className="space-y-2 rounded-lg border p-4">
            <InstallButton label="ثبّت التطبيق الآن" />
            <p className="text-xs text-muted-foreground">
              بعد التثبيت، افتح «الحلقة» من الأيقونة الجديدة وسيعمل زر جهات الاتصال.
            </p>
          </div>
        ) : standalone ? (
          <div className="flex items-start gap-2 rounded-lg border border-dashed p-4 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              أنت داخل تطبيق الحلقة بالفعل. إن كان زر جهات الاتصال ما زال لا
              يعمل، فالأيقونة مثبّتة من متصفح غير Chrome — احذفها وثبّت من
              Chrome.
            </p>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium text-foreground">خطوات التثبيت</p>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MoreVertical className="mt-0.5 h-4 w-4 shrink-0" />
                <span>اضغط زر القائمة (⋮) أعلى Chrome.</span>
              </li>
              <li className="flex items-start gap-2">
                <Download className="mt-0.5 h-4 w-4 shrink-0" />
                <span>اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</span>
              </li>
              <li className="flex items-start gap-2">
                <Trash2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>احذف الأيقونة القديمة حتى لا تفتح المتصفح الخطأ.</span>
              </li>
            </ol>
            {waited && (
              <p className="text-xs text-muted-foreground">
                إن لم يظهر خيار التثبيت، ف Chrome قديم أو التثبيت معطّل على هذا
                الجهاز.
              </p>
            )}
          </div>
        )}

        <Button asChild variant="outline" className="w-full">
          <a href="/start">فتح الحلقة</a>
        </Button>
      </div>
    </div>
  )
}
