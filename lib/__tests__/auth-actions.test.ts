import { describe, it, expect, vi, beforeEach } from 'vitest'

function createBuilder() {
  const builder: Record<string, any> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder),
    single: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
  }
  return builder
}

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  },
  from: vi.fn(() => createBuilder()),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

function createFormData(values: Record<string, string>): FormData {
  const fd = new FormData()
  Object.entries(values).forEach(([k, v]) => fd.append(k, v))
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
  })
})

describe('signUp', () => {
  it('signs up a new user successfully', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-1' }, session: null },
      error: null,
    })

    const { signUp } = await import('@/lib/auth-actions')
    const result = await signUp(
      createFormData({ email: 'test@example.com', password: 'Password123!', fullName: 'Test User' })
    )
    expect(result.success).toBe(true)
  })

  it('returns error on signup failure', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'Email already registered' },
    })

    const { signUp } = await import('@/lib/auth-actions')
    const result = await signUp(
      createFormData({ email: 'exists@example.com', password: 'Password123!', fullName: 'Test' })
    )
    expect(result.error).toBe('هذا البريد مسجل بالفعل')
  })

  it('redirects to dashboard if session returned', async () => {
    const { redirect } = await import('next/navigation')
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-1' }, session: { access_token: 'xxx' } },
      error: null,
    })

    const { signUp } = await import('@/lib/auth-actions')
    await signUp(
      createFormData({ email: 'test@example.com', password: 'Password123!', fullName: 'Test' })
    )

    expect(redirect).toHaveBeenCalledWith('/dashboard')
  })
})

describe('signIn', () => {
  it('signs in and redirects to dashboard', async () => {
    const { redirect } = await import('next/navigation')

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.eq = vi.fn().mockReturnValue({
        ...b,
        maybeSingle: vi.fn().mockResolvedValue({ data: { default_monthly_price: 200 } }),
        single: vi.fn().mockResolvedValue({ data: null }),
      })
      b.insert = vi.fn().mockReturnValue({
        ...b,
        select: vi.fn().mockReturnValue({
          ...b,
          single: vi.fn().mockResolvedValue({ data: null }),
        }),
      })
      return b
    })

    const { signIn } = await import('@/lib/auth-actions')
    const result = await signIn(
      createFormData({ email: 'test@example.com', password: 'Password123!' })
    )

    expect(redirect).toHaveBeenCalled()
  })

  it('returns error on bad credentials', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    })

    const { signIn } = await import('@/lib/auth-actions')
    const result = await signIn(
      createFormData({ email: 'wrong@example.com', password: 'bad' })
    )

    expect(result.error).toBe('بيانات الدخول غير صحيحة')
  })

  it('redirects to settings on first login when no price set', async () => {
    const { redirect } = await import('next/navigation')

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.eq = vi.fn().mockReturnValue({
        ...b,
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        single: vi.fn().mockResolvedValue({ data: null }),
      })
      b.insert = vi.fn().mockReturnValue({
        ...b,
        select: vi.fn().mockReturnValue({
          ...b,
          single: vi.fn().mockResolvedValue({ data: { default_monthly_price: 0 } }),
        }),
      })
      return b
    })

    const { signIn } = await import('@/lib/auth-actions')
    await signIn(
      createFormData({ email: 'new@example.com', password: 'Password123!' })
    )

    expect(redirect).toHaveBeenCalledWith('/dashboard/settings?first_login=true')
  })
})

describe('signOut', () => {
  it('signs out and redirects home', async () => {
    const { redirect } = await import('next/navigation')
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })

    const { signOut } = await import('@/lib/auth-actions')
    await signOut()
    expect(redirect).toHaveBeenCalledWith('/')
  })
})

describe('getUser', () => {
  it('returns the current user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
    })

    const { getUser } = await import('@/lib/auth-actions')
    expect((await getUser())?.id).toBe('user-1')
  })
})

describe('getUserProfile', () => {
  it('returns profile for authenticated user', async () => {
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.eq = vi.fn().mockReturnValue({
        ...b,
        single: vi.fn().mockResolvedValue({ data: { id: 'user-1', full_name: 'Test User', role: 'teacher' } }),
      })
      return b
    })

    const { getUserProfile } = await import('@/lib/auth-actions')
    const profile = await getUserProfile()
    expect(profile?.full_name).toBe('Test User')
    expect(profile?.role).toBe('teacher')
  })

  it('returns null when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    const { getUserProfile } = await import('@/lib/auth-actions')
    expect(await getUserProfile()).toBeNull()
  })
})

describe('updateUserProfile', () => {
  it('updates profile successfully', async () => {
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.update = vi.fn().mockReturnValue({
        ...b,
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      return b
    })

    const { updateUserProfile } = await import('@/lib/auth-actions')
    const result = await updateUserProfile(
      createFormData({ full_name: 'Updated Name', phone: '01012345678' })
    )
    expect(result.success).toBe(true)
  })

  it('returns error for invalid phone', async () => {
    const { updateUserProfile } = await import('@/lib/auth-actions')
    const result = await updateUserProfile(
      createFormData({ full_name: 'Test', phone: '123' })
    )
    expect(result.error).toContain('يرجى إدخال رقم هاتف')
  })

  it('returns error when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    const { updateUserProfile } = await import('@/lib/auth-actions')
    const result = await updateUserProfile(
      createFormData({ full_name: 'Test', phone: '' })
    )
    expect(result.error).toBe('Unauthorized')
  })
})

describe('updateTeacherSettings', () => {
  it('upserts teacher settings', async () => {
    mockSupabase.from.mockImplementation(() => {
      const b = createBuilder()
      b.upsert = vi.fn().mockReturnValue({
        ...b,
        eq: vi.fn().mockReturnValue(Promise.resolve({ error: null })),
      })
      return b
    })

    const { updateTeacherSettings } = await import('@/lib/auth-actions')
    const result = await updateTeacherSettings(
      createFormData({ currency: 'SAR', default_monthly_price: '300' })
    )
    expect(result.success).toBe(true)
  })

  it('returns error when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    const { updateTeacherSettings } = await import('@/lib/auth-actions')
    const result = await updateTeacherSettings(
      createFormData({ currency: 'SAR', default_monthly_price: '300' })
    )
    expect(result.error).toBe('Unauthorized')
  })
})

describe('resetPasswordForEmail', () => {
  it('sends reset email', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })

    const { resetPasswordForEmail } = await import('@/lib/auth-actions')
    const result = await resetPasswordForEmail(
      createFormData({ email: 'test@example.com' })
    )
    expect(result.success).toBe(true)
  })

  it('returns error on failure', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      error: { message: 'User not found' },
    })

    const { resetPasswordForEmail } = await import('@/lib/auth-actions')
    const result = await resetPasswordForEmail(
      createFormData({ email: 'nonexistent@example.com' })
    )
    expect(result.error).toBe('المستخدم غير موجود')
  })
})

describe('updateUserPassword', () => {
  it('updates password successfully and redirects', async () => {
    const { redirect } = await import('next/navigation')
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null })

    const { updateUserPassword } = await import('@/lib/auth-actions')
    await updateUserPassword(
      createFormData({ password: 'NewPass123!', confirmPassword: 'NewPass123!' })
    )

    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'NewPass123!' })
    expect(redirect).toHaveBeenCalledWith('/dashboard')
  })

  it('returns error when passwords do not match', async () => {
    const { updateUserPassword } = await import('@/lib/auth-actions')
    const result = await updateUserPassword(
      createFormData({ password: 'NewPass123!', confirmPassword: 'DifferentPass!' })
    )
    expect(result.error).toBe('كلمات المرور غير متطابقة')
  })

  it('returns error on supabase failure', async () => {
    mockSupabase.auth.updateUser.mockResolvedValue({
      error: { message: 'Weak password' },
    })

    const { updateUserPassword } = await import('@/lib/auth-actions')
    const result = await updateUserPassword(
      createFormData({ password: 'short', confirmPassword: 'short' })
    )
    expect(result.error).toBe('كلمة المرور ضعيفة جداً')
  })
})
