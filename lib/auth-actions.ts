'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { UserRole } from './types'

export async function signUp(formData: FormData) {
  try {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const phone = formData.get('phone') as string
    const role = formData.get('role') as UserRole

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
        data: {
          full_name: fullName,
          role: role,
          phone: phone,
        },
      },
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('Signup error:', err)
    return { error: err.message || 'حدث خطأ غير متوقع أثناء إنشاء الحساب' }
  }
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  const user = data.user
  if (user) {
    // Get user profile to check role and settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'teacher') {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('default_monthly_price')
        .eq('profile_id', user.id)
        .single()

      // If it's a new teacher (price is 0 or null), redirect to settings first
      // Use Number() to handle numeric strings or nulls safely
      if (!teacher || !teacher.default_monthly_price || Number(teacher.default_monthly_price) === 0) {
        revalidatePath('/', 'layout')
        redirect('/dashboard/settings?first_login=true')
      }
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function getUserRole(): Promise<UserRole | null> {
  const profile = await getUserProfile()
  return profile?.role || null
}

export async function updateTeacherSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const googleMeetLink = formData.get('google_meet_link') as string
  const bio = formData.get('bio') as string
  const currency = formData.get('currency') as string

  const defaultMonthlyPrice = Number(formData.get('default_monthly_price')) || 0

  // Update teacher record
  const { error } = await supabase
    .from('teachers')
    .update({
      google_meet_link: googleMeetLink,
      bio: bio,
      currency: currency,
      default_monthly_price: defaultMonthlyPrice
    })
    .eq('profile_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function resetPasswordForEmail(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/auth/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updateUserPassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    return { error: 'كلمات المرور غير متطابقة' }
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
