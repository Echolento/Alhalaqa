'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { formatPhoneNumber, isValidPhoneNumber } from './phone-utils'

function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'بيانات الدخول غير صحيحة',
    'Email not confirmed': 'البريد الإلكتروني غير مؤكد',
    'User already registered': 'هذا البريد مسجل بالفعل',
    'Email already registered': 'هذا البريد مسجل بالفعل',
    'Invalid email or password': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    'Rate limit exceeded': 'طلبات كثيرة جداً، حاول لاحقاً',
    'Password should be at least 6 characters': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    'Email link is invalid or expired': 'رابط البريد الإلكتروني غير صالح أو منتهي الصلاحية',
    'User not found': 'المستخدم غير موجود',
    'Weak password': 'كلمة المرور ضعيفة جداً',
    'New password should be different from the old password': 'كلمة المرور الجديدة يجب أن تختلف عن القديمة',
  }
  return map[message] || message
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      data: {
        full_name: fullName,
        role: 'teacher',
      },
    },
  })

  if (error) {
    return { error: translateAuthError(error.message) }
  }

  if (data.session) {
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  return { success: true }
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
    return { error: translateAuthError(error.message) }
  }

  const user = data.user
  if (user) {
    let { data: teacher } = await supabase
      .from('teachers')
      .select('default_monthly_price')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!teacher) {
      const { data: newTeacher, error: createError } = await supabase
        .from('teachers')
        .insert({ profile_id: user.id })
        .select('default_monthly_price')
        .single()

      if (createError) {
        console.error('Failed to create teacher record:', createError)
      } else {
        teacher = newTeacher
      }
    }

    if (!teacher || !teacher.default_monthly_price || Number(teacher.default_monthly_price) === 0) {
      revalidatePath('/', 'layout')
      redirect('/dashboard/settings?first_login=true')
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

export async function updateUserProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const rawPhone = formData.get('phone') as string
  const fullName = formData.get('full_name') as string

  const phone = rawPhone ? formatPhoneNumber(rawPhone) : null

  if (phone && !isValidPhoneNumber(phone)) {
    return { error: 'يرجى إدخال رقم هاتف هاتف مصري صحيح (مثال: +2001012345678)' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      phone: phone || null,
      full_name: fullName,
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function updateTeacherSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const currency = formData.get('currency') as string
  const defaultMonthlyPrice = Number(formData.get('default_monthly_price')) || 0

  const { error } = await supabase
    .from('teachers')
    .upsert(
      {
        profile_id: user.id,
        currency,
        default_monthly_price: defaultMonthlyPrice,
      },
      { onConflict: 'profile_id' },
    )

  if (error) return { error: error.message }

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
    return { error: translateAuthError(error.message) }
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
    return { error: translateAuthError(error.message) }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
