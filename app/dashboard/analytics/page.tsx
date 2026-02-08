import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UnderConstruction } from '@/components/ui/under-construction'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'student') {
    redirect('/dashboard')
  }

  return (
    <UnderConstruction
      title="الإحصائيات"
      description="صفحة الإحصائيات والتحليلات قيد التطوير"
    />
  )
}
