import React from "react"
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
    // If user is authenticated but has no profile, show a setup message
    // preventing infinite redirect loop with middleware
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 bg-card rounded-lg shadow-lg border text-center space-y-4">
          <h2 className="text-xl font-bold text-destructive">الملف الشخصي غير موجود</h2>
          <p className="text-muted-foreground">
            لم يتم العثور على ملف شخصي لحسابك. يرجى التواصل مع المشرف لإنشاء ملفك الشخصي.
          </p>
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            User ID: {user.id}
          </div>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-primary hover:underline">
              تسجيل الخروج
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar profile={profile} />
      <div className="flex-1 flex flex-col md:mr-64">
        <DashboardHeader profile={profile} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
