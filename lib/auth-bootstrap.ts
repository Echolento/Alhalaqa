// lib/auth-bootstrap.ts
// Shared post-login identity side-effects for every auth return leg
// (OAuth /auth/callback and email-link /auth/confirm). Payer flows
// (/pay, /claim) must NEVER mint teacher identity — a parent logging in
// is not a teacher — so both routes route through here.

import { createServiceClient } from '@/lib/supabase/service'

/** True when the destination belongs to the payer experience. */
export function isPayerFlow(next: string): boolean {
  return (
    next === '/pay' ||
    next.startsWith('/pay?') ||
    next === '/claim' ||
    next.startsWith('/claim?')
  )
}

/**
 * Runs the identity bootstrap for a freshly-authenticated user and returns the
 * final destination (upgrading /welcome → /dashboard for already-onboarded
 * teachers). `next` must already be a sanitized relative path.
 */
export async function resolvePostAuthDestination(userId: string, next: string): Promise<string> {
  const service = createServiceClient()

  if (!isPayerFlow(next)) {
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile && (profile as { role: string }).role !== 'teacher') {
      await service.from('profiles').update({ role: 'teacher' }).eq('id', userId)
    }

    await service
      .from('teachers')
      .upsert({ profile_id: userId }, { onConflict: 'profile_id' })
  }

  let dest = next
  if (next === '/welcome') {
    const { data: teacher } = await service
      .from('teachers')
      .select('default_monthly_price')
      .eq('profile_id', userId)
      .maybeSingle()

    const price = Number(
      (teacher as { default_monthly_price: unknown } | null)?.default_monthly_price ?? 0,
    )
    if (price !== 0) dest = '/dashboard'
  }

  return dest
}
