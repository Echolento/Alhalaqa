import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Calendar, Users, BarChart3, Video, Shield } from 'lucide-react'

const features = [
  {
    icon: Calendar,
    title: 'جدولة الحصص',
    description: 'تقويم متكامل لإدارة مواعيد الحصص مع الطلاب',
  },
  {
    icon: BookOpen,
    title: 'تسجيل الملاحظات',
    description: 'تدوين ملاحظات الجديد والماضي البعيد والماضي القريب والتقييم',
  },
  {
    icon: Video,
    title: 'روابط Google Meet',
    description: 'مشاركة روابط الاجتماعات مباشرة مع الطلاب',
  },
  {
    icon: BarChart3,
    title: 'تحليلات متقدمة',
    description: 'متابعة تقدم الطلاب وإحصائيات الأداء',
  },
  {
    icon: Users,
    title: 'إدارة الطلاب',
    description: 'نظام متكامل لإدارة بيانات الطلاب ونقلهم بين المعلمين',
  },
  {
    icon: Shield,
    title: 'إدارة المؤسسات',
    description: 'لوحة تحكم للمشرفين لإدارة المعلمين والطلاب',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 bg-primary/10 backdrop-blur-sm border border-primary/20 rounded-2xl flex items-center justify-center p-2 shadow-sm">
              <Image
                src="/Logo.webp"
                alt="Logo"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <span className="text-xl font-bold">منصة تحفيظ القرآن</span>
          </div>
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
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
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

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">مميزات المنصة</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              كل ما تحتاجه لإدارة حلقات التحفيظ في مكان واحد
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="bg-card hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-3xl">ابدأ رحلتك في تعليم القرآن الكريم</CardTitle>
              <CardDescription className="text-primary-foreground/80 text-lg">
                انضم إلى مئات المعلمين الذين يستخدمون منصتنا لإدارة حلقاتهم
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" variant="secondary" className="text-lg px-8">
                <Link href="/auth/signup">إنشاء حساب مجاني</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>جميع الحقوق محفوظة © {new Date().getFullYear()} منصة تحفيظ القرآن</p>
        </div>
      </footer>
    </div>
  )
}
