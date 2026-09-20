import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center">
          <FileQuestion className="w-10 h-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <p className="text-6xl font-bold text-muted-foreground/50" dir="ltr">
            404
          </p>
          <h1 className="text-2xl font-bold text-foreground">الصفحة غير موجودة</h1>
          <p className="text-muted-foreground">
            يبدو أنك وصلت إلى صفحة غير موجودة. تحقق من الرابط أو عد إلى الصفحة الرئيسية.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/">الصفحة الرئيسية</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto bg-transparent">
            <Link href="/auth/login">تسجيل الدخول</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
