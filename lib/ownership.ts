import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Explicit ownership checks for service-role writes (#25: server-writes only).
 * The service client bypasses RLS, so every write must prove ownership here.
 * Reads stay on the anon client and remain guarded by read-own RLS policies.
 */

export async function getOwnTeacherId(
  service: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await service
    .from('teachers')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}

export async function getStudentTeacherId(
  service: SupabaseClient,
  studentId: string,
): Promise<string | null> {
  const { data } = await service
    .from('students')
    .select('teacher_id')
    .eq('id', studentId)
    .maybeSingle()
  return (data as { teacher_id: string } | null)?.teacher_id ?? null
}

/** Returns the teacher id when the student belongs to the user, else null. */
export async function assertOwnsStudent(
  service: SupabaseClient,
  userId: string,
  studentId: string,
): Promise<string | null> {
  const [ownTeacherId, ownerTeacherId] = await Promise.all([
    getOwnTeacherId(service, userId),
    getStudentTeacherId(service, studentId),
  ])
  if (!ownTeacherId || !ownerTeacherId || ownTeacherId !== ownerTeacherId) {
    return null
  }
  return ownTeacherId
}
