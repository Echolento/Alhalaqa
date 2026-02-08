import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UnderConstruction } from '@/components/ui/under-construction'

export default async function OrganizationsPage() {
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

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <UnderConstruction
      title="المؤسسات"
      description="إدارة المؤسسات قيد التطوير وستكون متاحة قريباً"
    />
  )
}
