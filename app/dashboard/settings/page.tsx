import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/dashboard/settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/auth/login')
  }

  // Get teacher data if applicable
  let teacherData = null
  if (profile.role === 'teacher') {
    const { data } = await supabase
      .from('teachers')
      .select('*')
      .eq('profile_id', user.id)
      .single()
    teacherData = data
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground">إدارة حسابك وتفضيلاتك</p>
      </div>
      <SettingsForm profile={profile} teacherData={teacherData} email={user.email || ''} />
    </div>
  )
}
