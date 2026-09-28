import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InstapayForm } from '@/components/welcome/instapay-form'
import { OnboardingSteps } from '@/components/onboarding/onboarding-steps'
import { ONBOARDING_COPY } from '@/lib/onboarding-copy'
import Image from 'next/image'

// Onboarding STEP 2: InstaPay contract (optional). Basics-first: teachers
// without a teacher row land back on /welcome; the faint Later jumps to
// the dashboard (Settings covers the contract later).
export default async function InstapayOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!teacher) {
    redirect('/welcome')
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
          <h1 className="text-2xl font-extrabold tracking-tight">{ONBOARDING_COPY.instapayTitle}</h1>
          <p className="text-muted-foreground mt-1.5 font-medium">{ONBOARDING_COPY.instapaySubtitle}</p>
        </div>
        <div className="mb-6">
          <OnboardingSteps active={2} />
        </div>
        <InstapayForm />
      </div>
    </div>
  )
}
