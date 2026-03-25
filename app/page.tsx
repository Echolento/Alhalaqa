import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="w-14 h-14 bg-card/50 border border-border rounded-2xl flex items-center justify-center p-1.5">
            <Image
              src="/Logo.webp"
              alt="Logo"
              width={48}
              height={48}
              className="object-contain"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost">
              <Link href="/auth/login">تسجيل الدخول</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">إنشاء حساب</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center py-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight text-balance">
            منصة متكاملة لإدارة
            <br />
            <span className="text-primary">حلقات تحفيظ القرآن الكريم</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            نظام شامل يساعد المعلمين على إدارة حصصهم مع الطلاب، تسجيل الملاحظات،
            ومتابعة التقدم بكل سهولة ويسر
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/auth/signup">ابدأ الآن مجاناً</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 bg-transparent">
              <Link href="/auth/login">تسجيل الدخول</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>جميع الحقوق محفوظة © {new Date().getFullYear()} منصة تحفيظ القرآن</p>
        </div>
      </footer>
    </div>
  )
}
