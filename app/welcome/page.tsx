import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WelcomeForm } from '@/components/welcome/welcome-form'
import Image from 'next/image'

export default async function WelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: teacher } = await supabase
    .from('teachers')
    .select('default_monthly_price, currency')
    .eq('profile_id', user.id)
    .single()

  if (teacher?.default_monthly_price && teacher?.currency) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-card/50 backdrop-blur-sm border border-border rounded-2xl flex items-center justify-center p-2 shadow-sm">
              <Image
                src="/Logo.png"
                alt="Alhalaqa"
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">أهلاً بك في الحلقة</h1>
          <p className="text-muted-foreground mt-1.5 font-medium">قم بتحديد إعداداتك الأولية للمتابعة</p>
        </div>
        <WelcomeForm />
      </div>
    </div>
  )
}
