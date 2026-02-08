'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function inviteStudent(email: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'غير مصرح' }

    // Resolve teacher ID, auto-create if necessary for users with role=teacher
    const { data: teacherRow } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle()

    let teacherId: string | null = teacherRow?.id ?? null

    if (!teacherId) {
        // Verify user is actually a teacher and create the row if missing
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'teacher') {
            return { error: 'هذا الإجراء متاح للمعلمين فقط' }
        }

        const { data: newTeacher, error: createTeacherError } = await supabase
            .from('teachers')
            .insert({
                profile_id: user.id,
                organization_id: profile.organization_id ?? null,
            })
            .select('id')
            .single()

        if (createTeacherError) {
            return { error: createTeacherError.message }
        }

        teacherId = newTeacher.id
    }

    // Check if there's ALREADY a pending invitation from ANY teacher
    const { data: globalInvite } = await supabase
        .from('invitations')
        .select('id, teacher:teachers(profile:profiles(full_name))')
        .eq('student_email', email.toLowerCase())
        .eq('status', 'pending')
        .maybeSingle()

    if (globalInvite) {
        const teacherName = (globalInvite.teacher as any)?.profile?.full_name || 'معلم آخر'
        return { error: `هذا الطالب لديه دعوة معلقة بالفعل من ${teacherName}` }
    }

    // Check if student is already linked to ANY teacher
    const { data: existingStudentProfile } = await supabase
        .from('profiles')
        .select('id, students(teacher:teachers(profile:profiles(full_name)))')
        .eq('email', email.toLowerCase())
        .maybeSingle()

    const studentRecord = (existingStudentProfile?.students as any)?.[0]
    if (studentRecord?.teacher) {
        const teacherName = studentRecord.teacher.profile?.full_name || 'معلم آخر'
        return { error: `هذا الطالب مسجل بالفعل مع ${teacherName}` }
    }

    // Create invitation record in DB
    const { error: inviteError } = await supabase
        .from('invitations')
        .insert({
            teacher_id: teacherId,
            student_email: email.toLowerCase(),
        })

    if (inviteError) return { error: inviteError.message }

    // Check if user already exists
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle()

    if (!profile) {
        // Trigger Supabase Invite Email for new users
        // Note: This requires service role/admin privileges in a real app, 
        // but for a dev flow, it often works if configured in Supabase.
        await supabase.auth.admin.inviteUserByEmail(email.toLowerCase(), {
            data: {
                role: 'student',
                full_name: 'طالب جديد'
            }
        })
    }

    revalidatePath('/dashboard/students')
    revalidatePath('/dashboard')

    return { success: true }
}

export async function getTeacherInvitations() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', user.id)
        .single()

    if (!teacher) return []

    const { data: invitations } = await supabase
        .from('invitations')
        .select('*')
        .eq('teacher_id', teacher.id)
        .order('created_at', { ascending: false })

    return invitations || []
}

export async function getStudentInvitations() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        console.log('[INV] getStudentInvitations: no user')
        return []
    }

    const email = (user.email || '').toLowerCase()
    console.log('[INV] getStudentInvitations: user email', email)

    // Visibility sanity check: how many rows are visible for this email (any status)?
    const { count: visibleCount, error: visibleErr } = await supabase
        .from('invitations')
        .select('id', { count: 'exact', head: true })
        .ilike('student_email', email)
    console.log('[INV] visibleCount for email', { visibleCount, visibleErr: visibleErr?.message })

    const { data: invitations, error } = await supabase
        .from('invitations')

        .select('*')
        .ilike('student_email', email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    console.log('[INV] pending invitations fetch', { count: invitations?.length, error: error?.message })

    return invitations || []
}

export async function acceptInvitation(invitationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'غير مصرح' }

    // Get the invitation
    const { data: invitation } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('student_email', user.email?.toLowerCase())
        .eq('status', 'pending')
        .single()

    if (!invitation) {
        return { error: 'الدعوة غير موجودة أو منتهية الصلاحية' }
    }

    // Check if user already has a student record
    const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', user.id)
        .single()

    if (existingStudent) {
        // Update existing student to new teacher
        await supabase
            .from('students')
            .update({ teacher_id: invitation.teacher_id })
            .eq('id', existingStudent.id)
    } else {
        // Create new student record
        await supabase
            .from('students')
            .insert({
                profile_id: user.id,
                teacher_id: invitation.teacher_id,
            })
    }

    // Mark invitation as accepted
    await supabase
        .from('invitations')
        .update({
            status: 'accepted',
            accepted_at: new Date().toISOString()
        })
        .eq('id', invitationId)

    revalidatePath('/dashboard')

    return { success: true }
}

export async function rejectInvitation(invitationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'غير مصرح' }

    const { error } = await supabase
        .from('invitations')
        .update({ status: 'rejected' })
        .eq('id', invitationId)
        .eq('student_email', user.email?.toLowerCase())

    if (error) return { error: error.message }

    revalidatePath('/dashboard')

    return { success: true }
}

export async function cancelInvitation(invitationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'غير مصرح' }

    // Verify this is the teacher's invitation
    const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', user.id)
        .single()

    if (!teacher) return { error: 'غير مصرح' }

    const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)
        .eq('teacher_id', teacher.id)
        .eq('status', 'pending')

    if (error) return { error: error.message }

    revalidatePath('/dashboard/students')

    return { success: true }
}
export async function autoAcceptInvitations() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false }

    // Get all pending invitations for this user's email
    const { data: invitations } = await supabase
        .from('invitations')
        .select('*')
        .eq('student_email', user.email?.toLowerCase())
        .eq('status', 'pending')

    if (!invitations || invitations.length === 0) return { success: true }

    // For each invitation, accept it
    for (const invite of invitations) {
        // Check if student record exists
        const { data: student } = await supabase
            .from('students')
            .select('id, teacher_id')
            .eq('profile_id', user.id)
            .maybeSingle()

        if (student) {
            // If student exists but has no teacher, or if we want to honor the latest invitation
            // Logic: If they have NO teacher, or if this is the most recent invite, assign them.
            // For now, if they have NO teacher, assign them.
            if (!student.teacher_id) {
                await supabase
                    .from('students')
                    .update({ teacher_id: invite.teacher_id })
                    .eq('id', student.id)
            }
        } else {
            // Create student record
            await supabase
                .from('students')
                .insert({
                    profile_id: user.id,
                    teacher_id: invite.teacher_id,
                })
        }

        // Mark as accepted
        await supabase
            .from('invitations')
            .update({
                status: 'accepted',
                accepted_at: new Date().toISOString()
            })
            .eq('id', invite.id)
    }

    revalidatePath('/dashboard')
    return { success: true, acceptedCount: invitations.length }
}
