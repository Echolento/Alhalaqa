import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UnderConstruction } from '@/components/ui/under-construction'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <UnderConstruction
      title="التقدم"
      description="صفحة التقدم قيد التطوير"
    />
  )
}
