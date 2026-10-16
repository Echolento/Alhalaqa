import { describe, it, expect, vi, beforeEach } from 'vitest'

function createBuilder() {
  const builder: Record<string, any> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder),
    single: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
  }
  return builder
}

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => createBuilder()),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

// Service-role writes (#25) resolve through table-routed fixtures: the
// caller always owns teacher-1, so ownership checks pass by default.
// Restored in beforeEach because per-test overrides would otherwise leak.
function serviceRouter(table: string) {
  const b = createBuilder()
  if (table === 'teachers') {
    const row = { data: { id: teacherId, default_monthly_price: 150 } }
    b.eq = vi.fn().mockReturnValue({ ...b, maybeSingle: vi.fn().mockResolvedValue(row), single: vi.fn().mockResolvedValue(row) })
    b.insert = vi.fn().mockReturnValue({
      ...b,
      select: vi.fn().mockReturnValue({
        ...b,
        single: vi.fn().mockResolvedValue({ data: { id: teacherId, default_monthly_price: 150 } }),
      }),
    })
  } else if (table === 'students') {
    const owned = { teacher_id: teacherId, name: 'S', monthly_price: 100, payment_day: 1 }
    b.eq = vi.fn().mockReturnValue({
      ...b,
      maybeSingle: vi.fn().mockResolvedValue({ data: owned }),
      single: vi.fn().mockResolvedValue({ data: owned }),
    })
    b.insert = vi.fn().mockImplementation((data: any) => ({
      ...b,
      select: vi.fn().mockReturnValue({
        ...b,
        single: vi.fn().mockResolvedValue({
          data: { ...(Array.isArray(data) ? data[0] : data), id: studentId },
          error: null,
        }),
      }),
    }))
    b.update = vi.fn().mockReturnValue({ ...b, eq: vi.fn().mockResolvedValue({ error: null }) })
    b.delete = vi.fn().mockReturnValue({ ...b, eq: vi.fn().mockResolvedValue({ error: null }) })
  } else {
    b.update = vi.fn().mockReturnValue({ ...b, eq: vi.fn().mockResolvedValue({ error: null }) })
    b.upsert = vi.fn().mockResolvedValue({ error: null })
    b.insert = vi.fn().mockResolvedValue({ error: null })
    b.delete = vi.fn().mockReturnValue({ ...b, eq: vi.fn().mockResolvedValue({ error: null }) })
    b.eq = vi.fn().mockReturnValue({
      ...b,
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      single: vi.fn().mockResolvedValue({ data: null }),
    })
  }
  return b
}

const rpcCalls: Array<[string, any]> = []
const mockService = {
  from: vi.fn((table: string) => serviceRouter(table)),
  rpc: vi.fn((name: string, args: any) => {
    rpcCalls.push([name, args])
    return Promise.resolve({ data: null, error: null })
  }),
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => mockService),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const teacherId = 'teacher-1'
const studentId = 'student-1'

beforeEach(() => {
  vi.clearAllMocks()
  rpcCalls.length = 0
  mockService.from.mockImplementation((table: string) => serviceRouter(table))
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
  })
})

describe('getTeacherStudents', () => {
  it('returns students for authenticated teacher', async () => {
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.eq = vi.fn().mockImplementation((col, _val) => {
        if (col === 'profile_id') {
          return { ...b, maybeSingle: vi.fn().mockResolvedValue({ data: { id: teacherId } }) }
        }
        return {
          ...b,
          order: vi.fn().mockResolvedValue({
            data: [
              { id: studentId, name: 'Ahmed', phone: '+201011111111', monthly_price: 100, payment_day: 5, created_at: '2024-01-01', updated_at: '2024-01-01', teacher_id: teacherId },
            ],
          }),
        }
      })
      return b
    })

    const { getTeacherStudents } = await import('@/lib/data-actions')
    const result = await getTeacherStudents()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Ahmed')
  })

  it('returns empty array when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const { getTeacherStudents } = await import('@/lib/data-actions')
    expect(await getTeacherStudents()).toEqual([])
  })

  it('returns empty when no teacher record', async () => {
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.eq = vi.fn().mockReturnValue({
        ...b,
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      })
      return b
    })
    const { getTeacherStudents } = await import('@/lib/data-actions')
    expect(await getTeacherStudents()).toEqual([])
  })
})

describe('addStudent', () => {
  it('adds a student successfully', async () => {
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.eq = vi.fn().mockReturnValue({
        ...b,
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: teacherId, default_monthly_price: 200 } }),
      })
      b.insert = vi.fn().mockReturnValue({
        ...b,
        select: vi.fn().mockReturnValue({
          ...b,
          single: vi.fn().mockResolvedValue({ data: { id: studentId, name: 'Ali', payment_day: 1, teacher_id: teacherId } }),
        }),
      })
      return b
    })

    const { addStudent } = await import('@/lib/data-actions')
    const result = await addStudent('Ali', '+201022222222')
    expect(result.success).toBe(true)
    expect(result.student.name).toBe('Ali')
  })

  it('inherits teacher defaults (frequency + frequency-aware first bill) and stops writing payment_day', async () => {
    let capturedInsert: any
    const { firstBillDate } = await import('@/lib/billing-next')
    mockService.from.mockImplementation((_tableName?: string) => {
      const b = createBuilder()
      b.eq = vi.fn().mockReturnValue({
        ...b,
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: teacherId, default_monthly_price: 200, default_frequency: 'weekly' },
        }),
      })
      b.insert = vi.fn().mockImplementation((data: any) => {
        if (_tableName === 'students') capturedInsert = data
        return {
          ...b,
          select: vi.fn().mockReturnValue({
            ...b,
            single: vi.fn().mockResolvedValue({ data: { ...data, id: studentId }, error: null }),
          }),
        }
      })
      return b
    })

    const { addStudent } = await import('@/lib/data-actions')
    const result = await addStudent('Ali', '+201022222222')
    expect(result.success).toBe(true)
    expect(capturedInsert.frequency).toBe('weekly')
    expect(capturedInsert.next_due_date).toBe(firstBillDate('weekly', new Date()))
    expect(capturedInsert.monthly_price).toBe(200)
    expect('payment_day' in capturedInsert).toBe(false)
  })

  it('accepts explicit price + frequency + next date', async () => {
    let capturedInsert: any
    mockService.from.mockImplementation((_tableName?: string) => {
      const b = createBuilder()
      b.eq = vi.fn().mockReturnValue({
        ...b,
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: teacherId, default_monthly_price: 200, default_frequency: 'monthly' },
        }),
      })
      b.insert = vi.fn().mockImplementation((data: any) => {
        if (_tableName === 'students') capturedInsert = data
        return {
          ...b,
          select: vi.fn().mockReturnValue({
            ...b,
            single: vi.fn().mockResolvedValue({ data: { ...data, id: studentId }, error: null }),
          }),
        }
      })
      return b
    })

    const { addStudent } = await import('@/lib/data-actions')
    const result = await addStudent('Ali', {
      phone: '+201022222222',
      price: 150,
      frequency: 'biweekly',
      nextDueDate: '2026-11-03',
    })
    expect(result.success).toBe(true)
    expect(capturedInsert).toMatchObject({
      monthly_price: 150,
      frequency: 'biweekly',
      next_due_date: '2026-11-03',
    })
  })

  it('falls back to first-of-next-month on a garbage next date (never writes it)', async () => {
    let capturedInsert: any
    const { firstOfNextMonth } = await import('@/lib/billing-next')
    mockService.from.mockImplementation((_tableName?: string) => {
      const b = createBuilder()
      b.eq = vi.fn().mockReturnValue({
        ...b,
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: teacherId, default_monthly_price: 200, default_frequency: 'monthly' },
        }),
      })
      b.insert = vi.fn().mockImplementation((data: any) => {
        if (_tableName === 'students') capturedInsert = data
        return {
          ...b,
          select: vi.fn().mockReturnValue({
            ...b,
            single: vi.fn().mockResolvedValue({ data: { ...data, id: studentId }, error: null }),
          }),
        }
      })
      return b
    })

    const { addStudent } = await import('@/lib/data-actions')
    const result = await addStudent('Ali', { nextDueDate: 'not-a-date' })
    expect(result.success).toBe(true)
    expect(capturedInsert.next_due_date).toBe(firstOfNextMonth(new Date()))
  })

  it('returns error when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const { addStudent } = await import('@/lib/data-actions')
    const result = await addStudent('Ali')
    expect(result.error).toBe('Unauthorized')
  })
})

describe('updateStudentNextDue', () => {
  function nextDueService(studentRow: any) {
    const updates: any[] = []
    mockService.from.mockImplementation((table: string) => {
      const b = createBuilder()
      if (table === 'teachers') {
        b.maybeSingle = vi.fn().mockResolvedValue({ data: { id: teacherId } })
        return b
      }
      if (table === 'students') {
        b.maybeSingle = vi.fn().mockResolvedValue({ data: studentRow })
        b.update = vi.fn((payload: any) => {
          updates.push(payload)
          return { ...b, eq: vi.fn().mockResolvedValue({ error: null }) }
        })
        return b
      }
      return b
    })
    return updates
  }

  it('stores a valid date for the owner', async () => {
    const updates = nextDueService({ id: studentId, teacher_id: teacherId, name: 'S' })
    const { updateStudentNextDue } = await import('@/lib/data-actions')
    expect((await updateStudentNextDue(studentId, '2026-11-03')).success).toBe(true)
    expect(updates).toContainEqual({ next_due_date: '2026-11-03' })
  })

  it('rejects garbage without writing', async () => {
    const updates = nextDueService({ id: studentId, teacher_id: teacherId, name: 'S' })
    const { updateStudentNextDue } = await import('@/lib/data-actions')
    expect((await updateStudentNextDue(studentId, 'tomorrow-ish')).error).toBeTruthy()
    expect(updates).toHaveLength(0)
  })

  it('denies a student owned by another teacher', async () => {
    nextDueService({ id: studentId, teacher_id: 'other-teacher', name: 'S' })
    const { updateStudentNextDue } = await import('@/lib/data-actions')
    expect((await updateStudentNextDue(studentId, '2026-11-03')).error).toBe('الطالب غير موجود')
  })
})

describe('getBillingDefaults', () => {
  it('returns teacher frequency + price + frequency-aware first bill for the form', async () => {
    const { firstBillDate } = await import('@/lib/billing-next')
    mockService.from.mockImplementation((table: string) => {
      const b = createBuilder()
      if (table === 'teachers') {
        b.maybeSingle = vi.fn().mockResolvedValue({
          data: { id: teacherId, default_monthly_price: 250, default_frequency: 'weekly' },
        })
        return b
      }
      return b
    })

    const { getBillingDefaults } = await import('@/lib/data-actions')
    const result = await getBillingDefaults()

    expect(result).toMatchObject({
      frequency: 'weekly',
      price: 250,
      nextDueDate: firstBillDate('weekly', new Date()),
    })
  })

  it('falls back to monthly + 0 when the teacher row is missing pieces', async () => {
    mockService.from.mockImplementation(() => {
      const b = createBuilder()
      b.maybeSingle = vi.fn().mockResolvedValue({ data: null })
      return b
    })

    const { getBillingDefaults } = await import('@/lib/data-actions')
    const result = await getBillingDefaults()

    expect(result.frequency).toBe('monthly')
  })
})

describe('updateStudent', () => {
  it('updates student name and phone', async () => {
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.update = vi.fn().mockReturnValue({
        ...b,
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      return b
    })

    const { updateStudent } = await import('@/lib/data-actions')
    expect((await updateStudent(studentId, 'New Name', '+201033333333')).success).toBe(true)
  })

  it('returns error when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const { updateStudent } = await import('@/lib/data-actions')
    expect((await updateStudent(studentId, 'Name')).error).toBe('Unauthorized')
  })
})

describe('cross-teacher protection', () => {
  function foreignStudentService() {
    mockService.from.mockImplementation((table: string) => {
      const b = serviceRouter(table)
      if (table === 'students') {
        b.eq = vi.fn().mockReturnValue({
          ...b,
          maybeSingle: vi.fn().mockResolvedValue({ data: { teacher_id: 'other-teacher' } }),
          single: vi.fn().mockResolvedValue({ data: { teacher_id: 'other-teacher' } }),
        })
      }
      return b
    })
  }

  it('updateStudent denies a student owned by another teacher', async () => {
    foreignStudentService()
    const { updateStudent } = await import('@/lib/data-actions')
    expect((await updateStudent(studentId, 'X')).error).toBe('الطالب غير موجود')
  })

  it('deleteStudent denies a student owned by another teacher', async () => {
    foreignStudentService()
    const { deleteStudent } = await import('@/lib/data-actions')
    expect((await deleteStudent(studentId)).error).toBe('الطالب غير موجود')
  })

  it('toggleStudentPayment denies a student owned by another teacher', async () => {
    foreignStudentService()
    const { toggleStudentPayment } = await import('@/lib/data-actions')
    expect((await toggleStudentPayment(studentId, '2024-06-01')).error).toBe('الطالب غير موجود')
  })

  it('updateStudentMonthlyPrice denies a student owned by another teacher', async () => {
    foreignStudentService()
    const { updateStudentMonthlyPrice } = await import('@/lib/data-actions')
    expect((await updateStudentMonthlyPrice(studentId, 250)).error).toBe('الطالب غير موجود')
  })
})

describe('deleteStudent', () => {
  it('soft-deletes: stamps deleted_at, keeps every row', async () => {
    const seen: { updates: any[]; deletes: string[] } = { updates: [], deletes: [] }
    mockService.from.mockImplementation((table: string) => {
      const b = serviceRouter(table)
      const origUpdate = b.update
      b.update = vi.fn((payload: any) => {
        if (table === 'students') seen.updates.push(payload)
        return (origUpdate as any)(payload)
      })
      const origDelete = b.delete
      b.delete = vi.fn((...args: any[]) => {
        seen.deletes.push(table)
        return (origDelete as any)(...args)
      })
      return b
    })

    const { deleteStudent } = await import('@/lib/data-actions')
    expect((await deleteStudent(studentId)).success).toBe(true)
    expect(seen.updates).toHaveLength(1)
    expect(typeof seen.updates[0].deleted_at).toBe('string')
    // No hard deletes anywhere: students, payments, and proofs survive.
    expect(seen.deletes).toEqual([])
  })

  it('returns error when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const { deleteStudent } = await import('@/lib/data-actions')
    expect((await deleteStudent(studentId)).error).toBe('Unauthorized')
  })
})

describe('restoreStudent', () => {
  it('clears deleted_at for an owned row', async () => {
    const seen: { updates: any[] } = { updates: [] }
    mockService.from.mockImplementation((table: string) => {
      const b = serviceRouter(table)
      const origUpdate = b.update
      b.update = vi.fn((payload: any) => {
        if (table === 'students') seen.updates.push(payload)
        return (origUpdate as any)(payload)
      })
      return b
    })

    const { restoreStudent } = await import('@/lib/data-actions')
    expect((await restoreStudent(studentId)).success).toBe(true)
    expect(seen.updates).toEqual([{ deleted_at: null }])
  })

  it('denies a student owned by another teacher', async () => {
    mockService.from.mockImplementation((table: string) => {
      const b = serviceRouter(table)
      if (table === 'students') {
        b.eq = vi.fn().mockReturnValue({
          ...b,
          maybeSingle: vi.fn().mockResolvedValue({ data: { teacher_id: 'other-teacher' } }),
          single: vi.fn().mockResolvedValue({ data: { teacher_id: 'other-teacher' } }),
        })
      }
      return b
    })
    const { restoreStudent } = await import('@/lib/data-actions')
    expect((await restoreStudent(studentId)).error).toBe('الطالب غير موجود')
  })

  it('returns error when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const { restoreStudent } = await import('@/lib/data-actions')
    expect((await restoreStudent(studentId)).error).toBe('Unauthorized')
  })
})

describe('toggleStudentPayment', () => {
  it('toggles payment to paid', async () => {
    let maybeCall = 0
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.maybeSingle = vi.fn().mockImplementation(() => {
        maybeCall++
        if (maybeCall === 1) return Promise.resolve({ data: { payment_day: 15 } })
        if (maybeCall === 2) return Promise.resolve({ data: { monthly_price: 100, teacher: { default_monthly_price: 150 } } })
        return Promise.resolve({ data: null })
      })
      b.single = vi.fn().mockResolvedValue({ data: null })
      b.insert = vi.fn().mockReturnValue({
        ...b,
        select: vi.fn().mockReturnValue({
          ...b,
          single: vi.fn().mockResolvedValue({ data: { id: 'payment-1' } }),
        }),
      })
      b.update = vi.fn().mockReturnValue({
        ...b,
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      return b
    })

    const { toggleStudentPayment } = await import('@/lib/data-actions')
    expect((await toggleStudentPayment(studentId)).success).toBe(true)
  })

  it('settles the outstanding next-due cycle via the atomic settle_cycle RPC', async () => {
    mockService.from.mockImplementation((table: string) => {
      const b = createBuilder()
      if (table === 'teachers') {
        b.maybeSingle = vi.fn().mockResolvedValue({ data: { id: teacherId } })
        return b
      }
      if (table === 'students') {
        b.maybeSingle = vi.fn().mockResolvedValue({
          data: { id: studentId, teacher_id: teacherId, name: 'S', monthly_price: 200, frequency: 'monthly', next_due_date: '2026-10-01' },
        })
        return b
      }
      if (table === 'student_payments') {
        b.single = vi.fn().mockResolvedValue({ data: null })
        return b
      }
      return b
    })

    const { toggleStudentPayment } = await import('@/lib/data-actions')
    expect((await toggleStudentPayment(studentId)).success).toBe(true)
    expect(rpcCalls[0]).toEqual([
      'settle_cycle',
      {
        p_student_id: studentId,
        p_cycle_key: '2026-10-01',
        p_amount: 200,
        p_next_due: '2026-11-01',
        p_proof_id: null,
        p_teacher_note: null,
      },
    ])
  })

  it('undo to unpaid never moves the next-due date', async () => {
    mockService.from.mockImplementation((table: string) => {
      const b = createBuilder()
      if (table === 'teachers') {
        b.maybeSingle = vi.fn().mockResolvedValue({ data: { id: teacherId } })
        return b
      }
      if (table === 'students') {
        b.maybeSingle = vi.fn().mockResolvedValue({
          data: { id: studentId, teacher_id: teacherId, name: 'S', monthly_price: 200, frequency: 'monthly', next_due_date: '2026-11-01' },
        })
        return b
      }
      if (table === 'student_payments') {
        b.single = vi.fn().mockResolvedValue({ data: { id: 'p1', paid: true } })
        return b
      }
      return b
    })

    const { toggleStudentPayment } = await import('@/lib/data-actions')
    expect((await toggleStudentPayment(studentId)).success).toBe(true)
    expect(rpcCalls[0][0]).toBe('reopen_cycle')
    expect(rpcCalls[0][1].p_next_due).toBeNull()
  })

  it('undo of the settled cycle retreats the next-due date (payer re-sync)', async () => {
    mockService.from.mockImplementation((table: string) => {
      const b = createBuilder()
      if (table === 'teachers') {
        b.maybeSingle = vi.fn().mockResolvedValue({ data: { id: teacherId } })
        return b
      }
      if (table === 'students') {
        b.maybeSingle = vi.fn().mockResolvedValue({
          data: { id: studentId, teacher_id: teacherId, name: 'S', monthly_price: 200, frequency: 'monthly', next_due_date: '2026-11-01' },
        })
        return b
      }
      if (table === 'student_payments') {
        b.single = vi.fn().mockResolvedValue({ data: { id: 'p1', paid: true } })
        return b
      }
      return b
    })

    const { toggleStudentPayment } = await import('@/lib/data-actions')
    expect((await toggleStudentPayment(studentId, '2026-10-01')).success).toBe(true)
    expect(rpcCalls[0][0]).toBe('reopen_cycle')
    expect(rpcCalls[0][1].p_next_due).toBe('2026-10-01')
  })

  it('undo routes through reopen_cycle (which revokes the verified receipt)', async () => {
    mockService.from.mockImplementation((table: string) => {
      const b = createBuilder()
      if (table === 'teachers') {
        b.maybeSingle = vi.fn().mockResolvedValue({ data: { id: teacherId } })
        return b
      }
      if (table === 'students') {
        b.maybeSingle = vi.fn().mockResolvedValue({
          data: { id: studentId, teacher_id: teacherId, name: 'S', monthly_price: 200, frequency: 'monthly', next_due_date: '2026-11-01', payment_day: 1 },
        })
        return b
      }
      if (table === 'student_payments') {
        b.single = vi.fn().mockResolvedValue({ data: { id: 'p1', paid: true } })
        return b
      }
      return b
    })

    const { toggleStudentPayment } = await import('@/lib/data-actions')
    expect((await toggleStudentPayment(studentId, '2026-10-01')).success).toBe(true)
    expect(rpcCalls[0][0]).toBe('reopen_cycle')
    expect(rpcCalls[0][1]).toMatchObject({ p_student_id: studentId, p_cycle_key: '2026-10-01' })
  })
})

describe('getTeacherPayments', () => {
  it('returns students and payments for a month', async () => {
    const studentId2 = 'student-2'
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: teacherId, currency: 'SAR', default_monthly_price: 100 },
      })
      b.order = vi.fn().mockResolvedValue({
        data: [
          { id: studentId, name: 'Sami', monthly_price: 100, payment_day: 1, next_due_date: '2024-06-01' },
          { id: studentId2, name: 'Noor', monthly_price: 200, payment_day: 15, next_due_date: '2024-06-01' },
        ],
      })
        b.in = vi.fn().mockResolvedValue({
        data: [
          { id: 'p1', student_id: studentId, month: '2024-06-01', paid: true, amount_paid: 100 },
          { id: 'p2', student_id: studentId2, month: '2024-06-01', paid: false, amount_paid: 0 },
        ],
      })
      return b
    })

    const { getTeacherPayments } = await import('@/lib/data-actions')
    const result = await getTeacherPayments('2024-06-01')
    expect(result.currency).toBe('SAR')
    expect(result.students).toHaveLength(2)
    expect(result.payments).toHaveLength(2)
  })

  it('every student keeps their outstanding cycle even when the dashboard passes a month', async () => {
    const studentId2 = 'student-2'
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: teacherId, currency: 'SAR', default_monthly_price: 100 },
      })
      b.order = vi.fn().mockResolvedValue({
        data: [
          { id: studentId, name: 'Sami', monthly_price: 100, payment_day: 1, frequency: 'monthly', next_due_date: '2024-07-01' },
          { id: studentId2, name: 'Noor', monthly_price: 200, payment_day: 1, frequency: 'weekly', next_due_date: '2024-06-10' },
        ],
      })
      b.in = vi.fn().mockResolvedValue({ data: [] })
      return b
    })

    const { getTeacherPayments } = await import('@/lib/data-actions')
    const result = await getTeacherPayments('2024-06-01')
    const monthly = result.students.find((s: any) => s.id === studentId) as any
    const weekly = result.students.find((s: any) => s.id === studentId2) as any
    // Both tie to their OUTSTANDING cycle, not the passed month.
    expect(monthly?.currentMonthKey).toBe('2024-07-01')
    expect(weekly?.currentMonthKey).toBe('2024-06-10')
    expect(monthly?.currentMonthKey).not.toBe('2024-06-01')
  })

  it('reads a student as paid when the settled cycle is not the displayed month (prepay)', async () => {
    // Prepay settles a cycle (e.g. 2026-11-01) that isn't the wall-clock month
    // (2026-10-01) → the row for the displayed month is absent, so the status
    // must fall back to the latest row, exactly like the profile page.
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: teacherId, currency: 'SAR', default_monthly_price: 100 },
      })
      b.order = vi.fn().mockResolvedValue({
        data: [{ id: studentId, name: 'Sami', monthly_price: 100, payment_day: 1, frequency: 'weekly' }],
      })
      b.in = vi.fn().mockResolvedValue({
        data: [
          { id: 'p1', student_id: studentId, month: '2026-10-05', paid: false, amount_paid: 0 },
          { id: 'p2', student_id: studentId, month: '2026-11-01', paid: true, amount_paid: 100 },
        ],
      })
      return b
    })

    const { getTeacherPayments } = await import('@/lib/data-actions')
    const result = await getTeacherPayments('2026-10-01')
    const paid = result.payments.find((p: any) => p.student_id === studentId) as any
    expect(paid?.paid).toBe(true)
    expect(paid?.month).toBe('2026-11-01')
  })

  it('interval student with no row for the outstanding cycle reads unpaid (no latest-row fallback)', async () => {
    // Weekly student owes 2026-10-05 (next_due) but only has an older paid row.
    // The shown cycle IS the outstanding cycle, so it must NOT inherit that row.
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: teacherId, currency: 'SAR', default_monthly_price: 100 },
      })
      b.order = vi.fn().mockResolvedValue({
        data: [{ id: studentId, name: 'Sami', monthly_price: 100, payment_day: 1, frequency: 'weekly', next_due_date: '2026-10-05' }],
      })
      b.in = vi.fn().mockResolvedValue({
        data: [{ id: 'p1', student_id: studentId, month: '2026-09-28', paid: true, amount_paid: 100 }],
      })
      return b
    })

    const { getTeacherPayments } = await import('@/lib/data-actions')
    const result = await getTeacherPayments('2026-10-01')

    expect(result.payments.find((p: any) => p.student_id === studentId)).toBeUndefined()
  })

  it('lapsed monthly student reads unpaid even when an older cycle was paid (no latest-row fallback)', async () => {
    // next_due 2026-11-01 is unpaid; only 2026-09-01 was ever paid. The old
    // "latest row" fallback read this as PAID while the payer saw unpaid.
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: teacherId, currency: 'SAR', default_monthly_price: 100 },
      })
      b.order = vi.fn().mockResolvedValue({
        data: [{ id: studentId, name: 'Sami', monthly_price: 100, payment_day: 1, frequency: 'monthly', next_due_date: '2026-11-01' }],
      })
      b.in = vi.fn().mockResolvedValue({
        data: [{ id: 'p1', student_id: studentId, month: '2026-09-01', paid: true, amount_paid: 100 }],
      })
      return b
    })

    const { getTeacherPayments } = await import('@/lib/data-actions')
    const result = await getTeacherPayments('2026-12-01')

    expect(result.payments.find((p: any) => p.student_id === studentId)).toBeUndefined()
  })

  it('monthly student reads the settled row for their OUTSTANDING cycle', async () => {
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: teacherId, currency: 'SAR', default_monthly_price: 100 },
      })
      b.order = vi.fn().mockResolvedValue({
        data: [{ id: studentId, name: 'Sami', monthly_price: 100, payment_day: 1, frequency: 'monthly', next_due_date: '2026-11-01' }],
      })
      b.in = vi.fn().mockResolvedValue({
        data: [{ id: 'p1', student_id: studentId, month: '2026-11-01', paid: true, amount_paid: 100 }],
      })
      return b
    })

    const { getTeacherPayments } = await import('@/lib/data-actions')
    const result = await getTeacherPayments('2026-10-01')

    const paid = result.payments.find((p: any) => p.student_id === studentId) as any
    expect(paid?.paid).toBe(true)
    expect(paid?.month).toBe('2026-11-01')
  })

  it('flags paidLastPeriod when the outstanding cycle is unpaid but the previous was settled', async () => {
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: teacherId, currency: 'SAR', default_monthly_price: 100 },
      })
      b.order = vi.fn().mockResolvedValue({
        data: [{ id: studentId, name: 'Sami', monthly_price: 100, payment_day: 1, frequency: 'monthly', next_due_date: '2026-10-01' }],
      })
      b.in = vi.fn().mockResolvedValue({
        data: [{ id: 'p1', student_id: studentId, month: '2026-09-01', paid: true, amount_paid: 100 }],
      })
      return b
    })

    const { getTeacherPayments } = await import('@/lib/data-actions')
    const result = await getTeacherPayments('2026-10-01')

    const s = result.students.find((x: any) => x.id === studentId) as any
    expect(s?.paidLastPeriod).toBe(true)
    expect(result.payments.find((p: any) => p.student_id === studentId)).toBeUndefined()
  })

  it('reads a future-due student as settled — due on the 18th is not unpaid on the 14th', async () => {
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: teacherId, currency: 'SAR', default_monthly_price: 100 },
      })
      b.order = vi.fn().mockResolvedValue({
        data: [{ id: studentId, name: 'Sami', monthly_price: 100, payment_day: 1, frequency: 'monthly', next_due_date: '2999-01-01' }],
      })
      b.in = vi.fn().mockResolvedValue({ data: [] })
      return b
    })

    const { getTeacherPayments } = await import('@/lib/data-actions')
    const result = await getTeacherPayments('2026-10-01')

    const s = result.students.find((x: any) => x.id === studentId) as any
    expect(s?.settled).toBe(true)
    expect(s?.paidLastPeriod).toBe(false)
  })

  it('month expected scales with frequency (weekly pays several cycles, not one)', async () => {
    const weeklyId = 'student-w'
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: teacherId, currency: 'SAR', default_monthly_price: 100 },
      })
      b.order = vi.fn().mockResolvedValue({
        data: [
          { id: studentId, name: 'Monthly', monthly_price: 100, payment_day: 1, frequency: 'monthly' },
          { id: weeklyId, name: 'Weekly', monthly_price: 200, payment_day: 1, frequency: 'weekly', next_due_date: '2026-09-07' },
        ],
      })
      b.in = vi.fn().mockResolvedValue({ data: [] })
      return b
    })

    const { getTeacherPayments } = await import('@/lib/data-actions')
    const { cycleStartsInMonth } = await import('@/lib/billing-period')
    const result = await getTeacherPayments('2026-09-01')
    const weeklyCycles = cycleStartsInMonth('weekly', '2026-09-01', 1).length
    expect(weeklyCycles).toBeGreaterThanOrEqual(4)
    expect(result.expected).toBe(100 + 200 * weeklyCycles)
  })

  it('collected counts only paid cycles inside the selected month', async () => {
    const weeklyId = 'student-w'
    const { cycleStartsInMonth } = await import('@/lib/billing-period')
    const starts = cycleStartsInMonth('weekly', '2026-09-01', 1)
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: teacherId, currency: 'SAR', default_monthly_price: 100 },
      })
      b.order = vi.fn().mockResolvedValue({
        data: [{ id: weeklyId, name: 'Weekly', monthly_price: 200, payment_day: 1, frequency: 'weekly', next_due_date: starts[0] }],
      })
      b.in = vi.fn().mockResolvedValue({
        data: [
          { id: 'a', student_id: weeklyId, month: starts[0], paid: true, amount_paid: 200 },
          { id: 'b', student_id: weeklyId, month: starts[1], paid: true, amount_paid: 200 },
          { id: 'c', student_id: weeklyId, month: '2026-08-25', paid: true, amount_paid: 200 },
        ],
      })
      return b
    })

    const { getTeacherPayments } = await import('@/lib/data-actions')
    const result = await getTeacherPayments('2026-09-01')
    expect(result.collected).toBe(400)
  })
})

describe('updateStudentMonthlyPrice', () => {
  it('updates student price', async () => {
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.update = vi.fn().mockReturnValue({
        ...b,
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      b.eq = vi.fn().mockReturnValue({
        ...b,
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      })
      return b
    })

    const { updateStudentMonthlyPrice } = await import('@/lib/data-actions')
    expect((await updateStudentMonthlyPrice(studentId, 250)).success).toBe(true)
  })
})

describe('updateStudentPaymentDay', () => {
  it('updates payment day', async () => {
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.update = vi.fn().mockReturnValue({
        ...b,
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      return b
    })

    const { updateStudentPaymentDay } = await import('@/lib/data-actions')
    expect((await updateStudentPaymentDay(studentId, 10)).success).toBe(true)
  })
})

describe('updateStudentFrequency (next-cycle-only)', () => {
  it('updates frequency without touching current-period payments', async () => {
    const touchedTables: string[] = []
    let capturedFrequency: any
    mockService.from.mockImplementation((table: string) => {
      const b = serviceRouter(table)
      if (table === 'students') {
        b.update = vi.fn().mockImplementation((payload: any) => {
          capturedFrequency = payload
          return { ...b, eq: vi.fn().mockResolvedValue({ error: null }) }
        })
      }
      if (table === 'student_payments') {
        b.update = vi.fn().mockImplementation(() => {
          touchedTables.push('student_payments:update')
          return { ...b, eq: vi.fn().mockResolvedValue({ error: null }) }
        })
        b.insert = vi.fn().mockImplementation(() => {
          touchedTables.push('student_payments:insert')
          return { error: null }
        })
      }
      return b
    })

    const { updateStudentFrequency } = await import('@/lib/data-actions')
    const result = await updateStudentFrequency(studentId, 'weekly')
    expect(result.success).toBe(true)
    expect(capturedFrequency).toMatchObject({ frequency: 'weekly' })
    expect(touchedTables).toEqual([])
  })
})

describe('addMultipleStudents', () => {
  it('inserts multiple students in batch', async () => {
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.insert = vi.fn().mockResolvedValue({ error: null })
      b.eq = vi.fn().mockReturnValue({
        ...b,
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: teacherId, default_monthly_price: 150 },
        }),
      })
      return b
    })

    const { addMultipleStudents } = await import('@/lib/student-actions')
    const result = await addMultipleStudents([
      { name: 'أحمد', phone: '+201011111111' },
      { name: 'محمد' },
    ])
    expect(result.success).toBe(true)
  })

  it('defaults frequency + frequency-aware first bill for all students (no payment_day)', async () => {
    let capturedPayload: any
    const { firstBillDate } = await import('@/lib/billing-next')
    mockService.from.mockImplementation((_tableName?: string) => {
      const b = createBuilder()
      b.eq = vi.fn().mockReturnValue({
        ...b,
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: teacherId, default_monthly_price: 150, default_frequency: 'biweekly' },
        }),
      })
      b.insert = vi.fn().mockImplementation((data: any) => {
        if (_tableName === 'students') capturedPayload = data
        return { error: null }
      })
      return b
    })

    const { addMultipleStudents } = await import('@/lib/student-actions')
    const result = await addMultipleStudents([
      { name: 'أحمد', phone: '+201011111111' },
      { name: 'محمد' },
    ])
    expect(result.success).toBe(true)
    expect(capturedPayload).toHaveLength(2)
    expect(capturedPayload[0].frequency).toBe('biweekly')
    expect(capturedPayload[0].next_due_date).toBe(firstBillDate('biweekly', new Date()))
    expect('payment_day' in capturedPayload[0]).toBe(false)
  })

  it('returns error when unauthorized', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    const { addMultipleStudents } = await import('@/lib/student-actions')
    const result = await addMultipleStudents([{ name: 'أحمد' }])
    expect(result.error).toBe('Unauthorized')
  })
})
