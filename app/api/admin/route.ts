import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Admin bridge for Skye.
 *
 * Holds the service-role key server-side and exposes a small, explicit set of
 * admin actions. The caller must present a valid Supabase access token whose
 * user id is in SKYE_ADMIN_USER_IDS (comma-separated). The elevated key never
 * leaves this process.
 *
 * Contract:
 *   POST /api/admin
 *   Authorization: Bearer <supabase user JWT>
 *   { "action": "<name>", "params": { ... } }
 *   → { "ok": true, "result": <any> } | { "ok": false, "error": "..." }
 */

function adminIds(): string[] {
  return (process.env.SKYE_ADMIN_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

async function callerId(authHeader: string | null): Promise<string | null> {
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return null
  const client = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

type Params = Record<string, any>

export async function POST(request: Request) {
  const ids = adminIds()
  if (ids.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'admin bridge not configured (SKYE_ADMIN_USER_IDS empty)' },
      { status: 503 },
    )
  }

  const userId = await callerId(request.headers.get('authorization'))
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  if (!ids.includes(userId)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
  }

  let body: { action?: string; params?: Params } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 })
  }
  const action = body.action
  const params: Params = body.params || {}
  const service = createServiceClient()

  try {
    switch (action) {
      case 'list_users': {
        const { data, error } = await service.auth.admin.listUsers({ perPage: 100 })
        if (error) throw error
        const users = (data?.users || []).map((u) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          banned: Boolean((u as any).banned_until),
        }))
        return NextResponse.json({ ok: true, result: users })
      }

      case 'search_user': {
        // Flexible lookup: accept email (exact or fragment), a user id, or a
        // display/name fragment. Returns all matches so the assistant can list
        // candidates instead of demanding an exact email.
        const q = String(params.query ?? params.email ?? '').trim().toLowerCase()
        if (!q) {
          return NextResponse.json(
            { ok: false, error: 'query required' },
            { status: 400 },
          )
        }
        const { data, error } = await service.auth.admin.listUsers({ perPage: 1000 })
        if (error) throw error
        const users = data?.users || []
        const matches = users
          .map((u) => ({
            id: u.id,
            email: u.email ?? '',
            name:
              (u.user_metadata as any)?.full_name ??
              (u.user_metadata as any)?.name ??
              '',
            created_at: u.created_at,
          }))
          .filter((u) => {
            if (u.id.toLowerCase() === q) return true
            if (u.email.toLowerCase() === q) return true
            if (u.email.toLowerCase().includes(q)) return true
            if (u.name.toLowerCase().includes(q)) return true
            return false
          })
          .slice(0, 20)
        return NextResponse.json({ ok: true, result: matches })
      }

      case 'ban_user': {
        const userId2 = String(params.userId || '')
        if (!userId2) {
          return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 })
        }
        const ban = params.ban !== false
        const { error } = await service.auth.admin.updateUserById(userId2, {
          ban_duration: ban ? '876000h' : 'none',
        })
        if (error) throw error
        return NextResponse.json({ ok: true, result: ban ? 'banned' : 'unbanned' })
      }

      case 'delete_user': {
        const userId3 = String(params.userId || '')
        if (!userId3) {
          return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 })
        }
        const { error } = await service.auth.admin.deleteUser(userId3)
        if (error) throw error
        return NextResponse.json({ ok: true, result: 'deleted' })
      }

      case 'stats': {
        const [users, teachers, students, payments] = await Promise.all([
          service.auth.admin.listUsers({ perPage: 1 }),
          service.from('teachers').select('*', { count: 'exact', head: true }),
          service.from('students').select('*', { count: 'exact', head: true }),
          service.from('student_payments').select('*', { count: 'exact', head: true }),
        ])
        const totalUsers =
          (users.data as any)?.total ?? (users.data?.users?.length ?? 0)
        return NextResponse.json({
          ok: true,
          result: {
            users: totalUsers,
            teachers: teachers.count ?? 0,
            students: students.count ?? 0,
            payments: payments.count ?? 0,
          },
        })
      }

      default:
        return NextResponse.json(
          { ok: false, error: `unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'admin action failed' },
      { status: 500 },
    )
  }
}
