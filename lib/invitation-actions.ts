'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function inviteStudent(phone: string) {
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
        .eq('student_phone', phone)
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
        .eq('phone', phone)
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
            student_phone: phone,
        })

    if (inviteError) return { error: inviteError.message }

    // Check if user already exists
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('phone', phone)
        .maybeSingle()

    if (!profile) {
        // Suppress email trigger since we only have phone. 
        // Admin invite requires email, so we can't easily auto-invite by phone only via Supabase Auth Admin API 
        // without an email. Students will have to sign up manually with their phone.
        /* 
        await supabase.auth.admin.inviteUserByEmail(email.toLowerCase(), {
            data: {
                role: 'student',
                full_name: 'طالب جديد'
            }
        })
        */
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

    const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single()

    const phone = profile?.phone
    console.log('[INV] getStudentInvitations: user phone', phone)

    if (!phone) return []

    const { data: invitations, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('student_phone', phone)
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
    const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single()

    const { data: invitation } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('student_phone', profile?.phone)
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

    // Defensive upsert: ensure the profiles row exists and has a real name.
    // The DB trigger SHOULD have created it on auth.users insert, but it can
    // be missing or have a placeholder (e.g. 'طالب جديد') if the user was
    // created via admin.inviteUserByEmail() before the trigger was in place.
    const userName = (user.user_metadata?.full_name && user.user_metadata.full_name !== 'طالب جديد')
        ? user.user_metadata.full_name
        : (user.email || 'طالب')
    console.log('[acceptInvitation] upserting profile for user', user.id, 'name:', userName)
    await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            full_name: userName,
            email: user.email,
            phone: user.user_metadata?.phone || invitation.student_phone,
            role: 'student',
        }, { onConflict: 'id' })

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

    const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single()

    const { error } = await supabase
        .from('invitations')
        .update({ status: 'rejected' })
        .eq('id', invitationId)
        .eq('student_phone', profile?.phone)

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

    const { data: profileRow } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single()

    if (!profileRow?.phone) return { success: true }

    // Get all pending invitations for this user's phone
    const { data: invitations } = await supabase
        .from('invitations')
        .select('*')
        .eq('student_phone', profileRow.phone)
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

        // Defensive upsert: ensure profiles row exists with a real name
        const userName = (user.user_metadata?.full_name && user.user_metadata.full_name !== 'طالب جديد')
            ? user.user_metadata.full_name
            : (user.email || 'طالب')
        await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                full_name: userName,
                email: user.email,
                role: 'student',
            }, { onConflict: 'id' })

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
