import { describe, it, expect, vi, beforeEach } from 'vitest'

function createBuilder() {
  const builder: Record<string, any> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const teacherId = 'teacher-1'
const studentId = 'student-1'

beforeEach(() => {
  vi.clearAllMocks()
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

  it('defaults payment_day to 1', async () => {
    let capturedInsert: any
    mockSupabase.from.mockImplementation((_tableName?: string) => {
      const b = createBuilder()
      b.eq = vi.fn().mockReturnValue({
        ...b,
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: teacherId, default_monthly_price: 200 } }),
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
    expect(capturedInsert.payment_day).toBe(1)
  })

  it('returns error when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const { addStudent } = await import('@/lib/data-actions')
    const result = await addStudent('Ali')
    expect(result.error).toBe('Unauthorized')
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

describe('deleteStudent', () => {
  it('deletes student and their payments', async () => {
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.in = vi.fn().mockReturnValue({
        ...b,
        in: vi.fn().mockResolvedValue({ error: null }),
      })
      b.eq = vi.fn().mockResolvedValue({ error: null })
      b.delete = vi.fn().mockReturnValue({
        ...b,
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      return b
    })

    const { deleteStudent } = await import('@/lib/data-actions')
    expect((await deleteStudent(studentId)).success).toBe(true)
  })

  it('returns error when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const { deleteStudent } = await import('@/lib/data-actions')
    expect((await deleteStudent(studentId)).error).toBe('Unauthorized')
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
          { id: studentId, name: 'Sami', monthly_price: 100, payment_day: 1 },
          { id: studentId2, name: 'Noor', monthly_price: 200, payment_day: 15 },
        ],
      })
        b.in = vi.fn().mockReturnValue({
        ...b,
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 'p1', student_id: studentId, month: '2024-06-01', paid: true, amount_paid: 100 },
            { id: 'p2', student_id: studentId2, month: '2024-06-01', paid: false, amount_paid: 0 },
          ],
        }),
      })
      return b
    })

    const { getTeacherPayments } = await import('@/lib/data-actions')
    const result = await getTeacherPayments('2024-06-01')
    expect(result.currency).toBe('SAR')
    expect(result.students).toHaveLength(2)
    expect(result.payments).toHaveLength(2)
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

  it('defaults payment_day to 1 for all students', async () => {
    let capturedPayload: any
    mockSupabase.from.mockImplementation((_tableName?: string) => {
      const b = createBuilder()
      b.eq = vi.fn().mockReturnValue({
        ...b,
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: teacherId, default_monthly_price: 150 },
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
    expect(capturedPayload[0].payment_day).toBe(1)
    expect(capturedPayload[1].payment_day).toBe(1)
  })

  it('returns error when unauthorized', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    const { addMultipleStudents } = await import('@/lib/student-actions')
    const result = await addMultipleStudents([{ name: 'أحمد' }])
    expect(result.error).toBe('Unauthorized')
  })
})
