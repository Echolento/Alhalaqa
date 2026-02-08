'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { SessionNoteForm, SessionForm } from './types'

// Teacher actions
export async function getTeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get teacher record
  const { data: teacher } = await supabase
    .from('teachers')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  if (!teacher) {
    // If user is a teacher but record is missing, return skeleton data
    // to allow the dashboard to render with "Get Started" actions
    return {
      teacher: { google_meet_link: null },
      stats: {
        totalStudents: 0,
        totalSessions: 0,
        completedSessions: 0,
        upcomingSessions: 0,
        averageRating: 0,
      },
      upcomingSessions: [],
      recentSessions: [],
      needsSetup: true
    }
  }

  // Get students count
  const { count: studentsCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', teacher.id)

  // Get sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select(`
      *,
      student:students(
        *,
        profile:profiles(*)
      )
    `)
    .order('scheduled_at', { ascending: true })

  // Validate and normalize student profiles
  const normalizedSessions = sessions?.map(session => {
    const s = session as any
    // Handle case where student might be an array (though unlikely for many-to-one)
    const student = Array.isArray(s.student) ? s.student[0] : s.student

    if (student) {
      // Handle case where profile is an array (common with Supabase joins)
      const profile = Array.isArray(student.profile) ? student.profile[0] : student.profile
      return {
        ...session,
        student: {
          ...student,
          profile: {
            ...profile,
            full_name: profile?.full_name || profile?.email || `Student ${student.id?.substring(0, 4)}...`
          }
        }
      }
    }
    return session
  }) || []

  const now = new Date().toISOString()
  /* 
   * SORTING LOGIC:
   * Upcoming: Ascending (Close to future) -> Already sorted by query
   * Completed: Descending (Close to past "now") -> Need to reverse or sort
   */
  const upcomingSessions = normalizedSessions.filter(s => s.scheduled_at > now && s.status === 'scheduled')

  // Sort completed sessions by date descending (most recent first)
  const completedSessions = normalizedSessions
    .filter(s => s.status === 'completed')
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())

  // Get average rating
  const { data: notes } = await supabase
    .from('session_notes')
    .select('rating_new, rating_far_past, rating_recent_past')

  let totalRating = 0
  let count = 0
  notes?.forEach(n => {
    if (n.rating_new) { totalRating += n.rating_new; count++ }
    if (n.rating_far_past) { totalRating += n.rating_far_past; count++ }
    if (n.rating_recent_past) { totalRating += n.rating_recent_past; count++ }
  })

  const avgRating = count > 0 ? totalRating / count : 0

  return {
    teacher,
    stats: {
      totalStudents: studentsCount || 0,
      totalSessions: sessions?.length || 0,
      completedSessions: completedSessions.length,
      upcomingSessions: upcomingSessions.length,
      averageRating: Math.round(avgRating * 10) / 10,
    },
    upcomingSessions: upcomingSessions.slice(0, 5),
    recentSessions: completedSessions.slice(0, 5),
    needsSetup: false
  }
}

export async function getTeacherStudents() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!teacher) return []

  const { data: students } = await supabase
    .from('students')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  const normalizedStudents = students?.map(student => {
    const s = student as any
    const profile = Array.isArray(s.profile) ? s.profile[0] : s.profile
    return {
      ...s,
      profile: {
        ...profile,
        full_name: profile?.full_name || profile?.email || `Student ${s.id?.substring(0, 4)}...`
      }
    }
  }) || []

  return normalizedStudents
}

export async function getTeacherSessions(filter?: 'all' | 'upcoming' | 'completed') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!teacher) return []

  let query = supabase
    .from('sessions')
    .select(`
      *,
      student:students(
        *,
        profile:profiles(*)
      ),
      session_notes(*)
    `)
    .eq('teacher_id', teacher.id)

  // Default sort is descending (newest first) for history/all
  // but for upcoming, we want ascending (closest first)
  const isUpcoming = filter === 'upcoming'
  query = query.order('scheduled_at', { ascending: isUpcoming })

  const now = new Date().toISOString()

  if (filter === 'upcoming') {
    query = query.gte('scheduled_at', now).eq('status', 'scheduled')
  } else if (filter === 'completed') {
    query = query.eq('status', 'completed')
  }

  const { data: sessions } = await query

  // Normalize student profile data
  const normalizedSessions = sessions?.map(session => {
    const s = session as any
    const student = Array.isArray(s.student) ? s.student[0] : s.student

    if (student) {
      const profile = Array.isArray(student.profile) ? student.profile[0] : student.profile
      return {
        ...session,
        student: {
          ...student,
          profile: {
            ...profile,
            full_name: profile?.full_name || profile?.email || `Student ${student.id?.substring(0, 4)}...`
          }
        }
      }
    }
    return session
  }) || []

  return normalizedSessions
}

export async function createSession(data: SessionForm) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'غير مصرح' }

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, google_meet_link')
    .eq('profile_id', user.id)
    .single()

  if (!teacher) return { error: 'لم يتم العثور على المعلم' }

  const { error } = await supabase
    .from('sessions')
    .insert({
      teacher_id: teacher.id,
      student_id: data.student_id,
      scheduled_at: data.scheduled_at,
      duration_minutes: data.duration_minutes,
      google_meet_link: data.google_meet_link || teacher.google_meet_link,
      status: 'scheduled',
    })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard/calendar')

  return { success: true }
}

export async function updateSessionStatus(sessionId: string, status: 'completed' | 'cancelled') {
  const supabase = await createClient()

  const { error } = await supabase
    .from('sessions')
    .update({ status })
    .eq('id', sessionId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard/calendar')

  return { success: true }
}

export async function createSessionNote(sessionId: string, data: SessionNoteForm) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('session_notes')
    .upsert({
      session_id: sessionId,
      new_content: data.new_content,
      far_past_review: data.far_past_review,
      recent_past_review: data.recent_past_review,
      general_notes: data.general_notes,
      next_task: data.next_task,
      rating_new: data.rating_new,
      rating_far_past: data.rating_far_past,
      rating_recent_past: data.rating_recent_past,
    }, {
      onConflict: 'session_id'
    })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/sessions')

  return { success: true }
}

export async function updateSessionNotes(sessionId: string, data: Partial<SessionNoteForm>) {
  const supabase = await createClient()

  const { data: result, error } = await supabase
    .from('session_notes')
    .upsert({
      session_id: sessionId,
      ...data,
    }, {
      onConflict: 'session_id'
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/sessions')

  return { success: true, data: result }
}

export async function completeSession(sessionId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard/calendar')

  return { success: true }
}

export async function updateTeacherSettings(data: { google_meet_link?: string; bio?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'غير مصرح' }

  const { error } = await supabase
    .from('teachers')
    .update(data)
    .eq('profile_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')

  return { success: true }
}

export async function updateStudentProgress(studentId: string, surah: string, ayah: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('students')
    .update({
      current_surah: surah,
      current_ayah: ayah,
      updated_at: new Date().toISOString(),
    })
    .eq('id', studentId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')

  return { success: true }
}

export async function updateSessionDetails(sessionId: string, data: SessionForm) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('sessions')
    .update({
      scheduled_at: data.scheduled_at,
      duration_minutes: data.duration_minutes,
      google_meet_link: data.google_meet_link,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('status', 'scheduled') // Only allow updating scheduled sessions

  if (error) return { error: error.message }

  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard/calendar')
  revalidatePath('/dashboard')

  return { success: true }
}

export async function deleteSession(sessionId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard/calendar')
  revalidatePath('/dashboard')

  return { success: true }
}

export async function getTeacherDisplayInfo(teacherId: string): Promise<{ full_name: string | null } | null> {
  const supabase = await createClient()
  const { data: teacher } = await supabase
    .from('teachers')
    .select('profile_id')
    .eq('id', teacherId)
    .maybeSingle()

  if (!teacher) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', (teacher as any).profile_id)
    .maybeSingle()

  return { full_name: (profile as any)?.full_name ?? null }
}

export async function getTeacherWeeklySessionCounts() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (!teacher) return []

  // Compute current week [start..end)
  const now = new Date()
  const day = now.getDay() // 0..6 (Sun..Sat)
  const weekStart = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - day) // start on Sunday
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, scheduled_at')
    .eq('teacher_id', (teacher as any).id)
    .gte('scheduled_at', weekStart.toISOString())
    .lt('scheduled_at', weekEnd.toISOString())

  const counts: Record<string, number> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    counts[key] = 0
  }

  sessions?.forEach(s => {
    const key = new Date((s as any).scheduled_at).toISOString().slice(0, 10)
    if (counts[key] !== undefined) counts[key]++
  })

  return Object.keys(counts).map(date => ({ date, count: counts[date] }))
}

// Student actions
export async function getStudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: student } = await supabase
    .from('students')
    .select(`
      *,
      profile:profiles(*),
      teacher:teachers(
        *,
        profile:profiles(*)
      )
    `)
    .eq('profile_id', user.id)
    .single()

  if (!student) return null

  // Normalize student profile and teacher profile data
  const s = student as any
  const studentProfile = Array.isArray(s.profile) ? s.profile[0] : s.profile
  const teacher = Array.isArray(s.teacher) ? s.teacher[0] : s.teacher

  if (teacher) {
    const teacherProfile = Array.isArray(teacher.profile) ? teacher.profile[0] : teacher.profile
    s.teacher = {
      ...teacher,
      profile: {
        ...teacherProfile,
        full_name: teacherProfile?.full_name || teacherProfile?.email || `Teacher ${teacher.id?.substring(0, 4)}...`
      }
    }
  }

  if (studentProfile) {
    s.profile = {
      ...studentProfile,
      full_name: studentProfile?.full_name || studentProfile?.email || `Student ${student.id?.substring(0, 4)}...`
    }
  }

  const { data: sessions } = await supabase
    .from('sessions')
    .select(`
      *,
      session_notes(*)
    `)
    .eq('student_id', student.id)
    .order('scheduled_at', { ascending: false })

  const now = new Date().toISOString()

  // Upcoming: sort ascending (closest first)
  const upcomingSessions = sessions
    ?.filter(s => s.scheduled_at > now && s.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()) || []

  // Completed: sort descending (recent first) - already sorted by query but good to be explicit or if query changes
  const completedSessions = sessions
    ?.filter(s => s.status === 'completed')
    || []

  const ratings: number[] = []
  sessions?.forEach(s => {
    s.session_notes?.forEach((n: any) => {
      if (n.rating_new) ratings.push(n.rating_new)
      if (n.rating_far_past) ratings.push(n.rating_far_past)
      if (n.rating_recent_past) ratings.push(n.rating_recent_past)
    })
  })

  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0

  return {
    student,
    stats: {
      totalSessions: sessions?.length || 0,
      completedSessions: completedSessions.length,
      upcomingSessions: upcomingSessions.length,
      averageRating: Math.round(avgRating * 10) / 10,
      currentProgress: `${student.current_surah || '-'} : ${student.current_ayah || '-'}`,
    },
    upcomingSessions: upcomingSessions.slice(0, 5),
    recentSessions: completedSessions.slice(0, 5),
  }
}

export async function getStudentSessions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!student) return []

  const { data: sessions } = await supabase
    .from('sessions')
    .select(`
      *,
      teacher:teachers(
        *,
        profile:profiles(*)
      ),
      session_notes(*)
    `)
    .eq('student_id', student.id)
    .order('scheduled_at', { ascending: false })

  const normalizedSessions = sessions?.map(session => {
    const s = session as any
    const teacher = Array.isArray(s.teacher) ? s.teacher[0] : s.teacher

    if (teacher) {
      const profile = Array.isArray(teacher.profile) ? teacher.profile[0] : teacher.profile
      return {
        ...session,
        teacher: {
          ...teacher,
          profile: {
            ...profile,
            full_name: profile?.full_name || profile?.email || `Teacher ${teacher.id?.substring(0, 4)}...`
          }
        }
      }
    }
    return session
  }) || []

  return normalizedSessions
}

// Admin actions
export async function getAdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return null

  const { count: orgsCount } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })

  const { count: teachersCount } = await supabase
    .from('teachers')
    .select('*', { count: 'exact', head: true })

  const { count: studentsCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })

  const { count: sessionsCount } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })

  const now = new Date().toISOString()
  const { count: activeCount } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'scheduled')
    .gte('scheduled_at', now)

  return {
    stats: {
      totalOrganizations: orgsCount || 0,
      totalTeachers: teachersCount || 0,
      totalStudents: studentsCount || 0,
      totalSessions: sessionsCount || 0,
      activeSessions: activeCount || 0,
    },
  }
}

export async function getAllTeachers() {
  const supabase = await createClient()

  const { data: teachers } = await supabase
    .from('teachers')
    .select(`
      *,
      profile:profiles(*),
      organization:organizations(*)
    `)
    .order('created_at', { ascending: false })

  return teachers || []
}

export async function getAllStudents() {
  const supabase = await createClient()

  const { data: students } = await supabase
    .from('students')
    .select(`
      *,
      profile:profiles(*),
      teacher:teachers(
        *,
        profile:profiles(*)
      ),
      organization:organizations(*)
    `)
    .order('created_at', { ascending: false })

  return students || []
}

export async function getAllOrganizations() {
  const supabase = await createClient()

  const { data: organizations } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  return organizations || []
}

export async function transferStudent(studentId: string, newTeacherId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('students')
    .update({ teacher_id: newTeacherId })
    .eq('id', studentId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/students')

  return { success: true }
}

export async function createOrganization(data: { name: string; slug: string }) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('organizations')
    .insert(data)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/organizations')

  return { success: true }
}
export async function removeStudent(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Verify the student belongs to this teacher or user is admin
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  if (!teacher && !isAdmin) return { error: 'Unauthorized' }

  const query = supabase
    .from('students')
    .update({ teacher_id: null })
    .eq('id', studentId)

  if (!isAdmin) {
    query.eq('teacher_id', teacher?.id)
  }

  const { error } = await query

  if (error) return { error: error.message }

  revalidatePath('/dashboard/students')

  return { success: true }
}
