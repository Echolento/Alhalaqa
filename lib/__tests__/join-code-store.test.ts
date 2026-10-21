// lib/__tests__/join-code-store.test.ts
// Service-role store for teacher join codes.
//
// CRITICAL GUARANTEE (user requirement): rotating a teacher's code must NOT
// touch students or claim_tokens. Existing claimed parents keep access and
// existing invite links keep working — rotation only replaces the code value.

import { describe, it, expect, vi } from 'vitest'
import { ensureJoinCode, readJoinCode, rotateJoinCode } from '@/lib/join-code-store'
import { isValidJoinCodeFormat } from '@/lib/join-codes'

const TABLE = 'teacher_join_codes'

function makeService(seed?: Record<string, unknown>) {
  const calls: Array<{ table: string; op: string; payload?: any }> = []
  const store: Record<string, any> = { ...(seed ?? {}) }
  let insertError: any = null

  const service = {
    from(table: string) {
      const b: any = {}
      const chain = () => b
      b.select = vi.fn(chain)
      b.eq = vi.fn(chain)
      b.maybeSingle = vi.fn(async () => ({ data: store[table] ?? null, error: null }))
      b.insert = vi.fn(async (payload: any) => {
        calls.push({ table, op: 'insert', payload })
        if (insertError) return { error: insertError }
        store[table] = { ...payload }
        return { error: null }
      })
      b.update = vi.fn((payload: any) => {
        calls.push({ table, op: 'update', payload })
        // Real Postgres: UPDATE ... WHERE teacher_id = X touches 0 rows when
        // the row is missing, and the subsequent maybeSingle() returns null.
        if (store[table]) store[table] = { ...store[table], ...payload }
        return b
      })
      b.delete = vi.fn(() => b)
      return b
    },
  }

  return {
    service: service as any,
    calls,
    store,
    setInsertError: (e: any) => {
      insertError = e
    },
  }
}

describe('readJoinCode', () => {
  it('returns the stored code for a teacher', async () => {
    const { service } = makeService({ [TABLE]: { teacher_id: 't1', code: 'ABCDEFGH' } })
    await expect(readJoinCode(service, 't1')).resolves.toBe('ABCDEFGH')
  })

  it('returns null when the teacher has no row', async () => {
    const { service } = makeService()
    await expect(readJoinCode(service, 't1')).resolves.toBeNull()
  })
})

describe('ensureJoinCode', () => {
  it('returns the existing code without inserting', async () => {
    const { service, calls } = makeService({ [TABLE]: { teacher_id: 't1', code: 'ABCDEFGH' } })
    const code = await ensureJoinCode(service, 't1')
    expect(code).toBe('ABCDEFGH')
    expect(calls.filter((c) => c.op === 'insert')).toHaveLength(0)
  })

  it('creates a valid 8-char code when missing', async () => {
    const { service, calls, store } = makeService()
    const code = await ensureJoinCode(service, 't1')
    expect(isValidJoinCodeFormat(code)).toBe(true)
    expect(store[TABLE]).toMatchObject({ teacher_id: 't1', code })
    expect(calls.filter((c) => c.op === 'insert')).toHaveLength(1)
  })
})

describe('rotateJoinCode', () => {
  it('replaces the code and stamps rotated_at', async () => {
    const { service, calls } = makeService({ [TABLE]: { teacher_id: 't1', code: 'ABCDEFGH' } })
    const next = await rotateJoinCode(service, 't1')
    expect(next).not.toBe('ABCDEFGH')
    expect(isValidJoinCodeFormat(next)).toBe(true)
    const update = calls.find((c) => c.op === 'update')
    expect(update?.payload?.code).toBe(next)
    expect(typeof update?.payload?.rotated_at).toBe('string')
  })

  it('NEVER touches students or claim_tokens (existing people keep working)', async () => {
    const { service, calls } = makeService({ [TABLE]: { teacher_id: 't1', code: 'ABCDEFGH' } })
    await rotateJoinCode(service, 't1')
    const tables = new Set(calls.map((c) => c.table))
    expect(tables.has('students')).toBe(false)
    expect(tables.has('claim_tokens')).toBe(false)
    const writes = calls.filter((c) => c.op !== 'from')
    expect(writes.every((c) => c.table === TABLE)).toBe(true)
  })

  it('creates a code when the teacher has none yet', async () => {
    const { service, store } = makeService()
    const code = await rotateJoinCode(service, 't1')
    expect(isValidJoinCodeFormat(code)).toBe(true)
    expect(store[TABLE]).toMatchObject({ teacher_id: 't1', code })
  })

  it('surfaces write failures instead of pretending rotation worked', async () => {
    const { service } = makeService({ [TABLE]: { teacher_id: 't1', code: 'ABCDEFGH' } })
    // Break the update path.
    ;(service as any).from = (table: string) => {
      const b: any = {}
      b.update = () => b
      b.eq = () => b
      b.select = () => b
      b.maybeSingle = async () => ({ data: null, error: { code: 'XX000', message: 'boom' } })
      b.insert = async () => ({ error: { code: 'XX000', message: 'boom' } })
      b.select = () => b
      return b
    }
    await expect(rotateJoinCode(service, 't1')).rejects.toThrow()
  })
})
