// lib/join-code-store.ts
// Service-role persistence for per-teacher join codes.
//
// SECURITY POSTURE:
//   K1. The code table is service-role only (RLS enabled, no policies). The
//       `teachers` row itself is readable by other org members, so the code
//       must NOT live as a column there.
//   K2. Rotation replaces ONLY the code row. It never touches students or
//       claim_tokens — existing claimed parents keep access and existing
//       invite links keep working (user requirement).
//   K3. Code collisions are astronomically unlikely (~40 bits) but handled:
//       a 23505 on the unique code retries; a 23505 on the teacher_id primary
//       key (concurrent first-create) re-reads the winner.

import type { SupabaseClient } from '@supabase/supabase-js'
import { generateJoinCode } from '@/lib/join-codes'

const TABLE = 'teacher_join_codes'
const MAX_ATTEMPTS = 5

function errorCode(error: unknown): string {
  return String((error as { code?: string } | null)?.code ?? '')
}

/** Read the teacher's current code, or null when none has been minted. */
export async function readJoinCode(
  service: SupabaseClient,
  teacherId: string,
): Promise<string | null> {
  const { data } = await service
    .from(TABLE)
    .select('code')
    .eq('teacher_id', teacherId)
    .maybeSingle()
  return (data as { code?: string } | null)?.code ?? null
}

/**
 * Get the teacher's code, minting one on first use. Idempotent: concurrent
 * callers converge on the winner's code.
 */
export async function ensureJoinCode(
  service: SupabaseClient,
  teacherId: string,
): Promise<string> {
  const existing = await readJoinCode(service, teacherId)
  if (existing) return existing

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = generateJoinCode()
    const { error } = await service.from(TABLE).insert({ teacher_id: teacherId, code })
    if (!error) return code

    if (errorCode(error) === '23505') {
      // Either the teacher row appeared concurrently (re-read wins) or the
      // code collided (regenerate).
      const raced = await readJoinCode(service, teacherId)
      if (raced) return raced
      continue
    }
    throw new Error('join_code_create_failed')
  }
  throw new Error('join_code_create_failed')
}

/**
 * Replace the teacher's code (K2). If no row exists yet, create one. Returns
 * the new raw code. Existing claims/invites are untouched by construction.
 */
export async function rotateJoinCode(
  service: SupabaseClient,
  teacherId: string,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = generateJoinCode()
    const { data, error } = await service
      .from(TABLE)
      .update({ code, rotated_at: new Date().toISOString() })
      .eq('teacher_id', teacherId)
      .select('code')
      .maybeSingle()

    if (error) {
      if (errorCode(error) === '23505') continue
      throw new Error('join_code_rotate_failed')
    }
    if (data) return (data as { code: string }).code

    // No row to update — mint the first one.
    return ensureJoinCode(service, teacherId)
  }
  throw new Error('join_code_rotate_failed')
}
