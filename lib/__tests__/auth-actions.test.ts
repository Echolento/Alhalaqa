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
    signInWithOAuth: vi.fn(),
  },
  from: vi.fn(() => createBuilder()),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

// Service-role writes (#25) resolve successfully by default.
const mockService = {
  from: vi.fn(() => {
    const b = createBuilder()
    b.update = vi.fn().mockReturnValue({
      ...b,
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    b.upsert = vi.fn().mockResolvedValue({ error: null })
    b.insert = vi.fn().mockReturnValue({
      ...b,
      select: vi.fn().mockReturnValue({
        ...b,
        single: vi.fn().mockResolvedValue({ data: { default_monthly_price: 0 } }),
      }),
    })
    return b
  }),
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => mockService),
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
    expect((result as { error?: string }).error).toBe('هذا البريد مسجل بالفعل')
  })

  it('redirects to welcome if session returned', async () => {
    const { redirect } = await import('next/navigation')
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-1' }, session: { access_token: 'xxx' } },
      error: null,
    })

    const { signUp } = await import('@/lib/auth-actions')
    await signUp(
      createFormData({ email: 'test@example.com', password: 'Password123!', fullName: 'Test' })
    )

    expect(redirect).toHaveBeenCalledWith('/welcome')
  })

  it('rejects short passwords', async () => {
    const { signUp } = await import('@/lib/auth-actions')
    const result = await signUp(
      createFormData({ email: 'test@example.com', password: 'Ab1!', fullName: 'Test' })
    )
    expect((result as { error?: string }).error).toContain('8 أحرف')
    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('rejects common weak passwords', async () => {
    const { signUp } = await import('@/lib/auth-actions')
    const result = await signUp(
      createFormData({ email: 'test@example.com', password: 'password', fullName: 'Test' })
    )
    expect((result as { error?: string }).error).toContain('ضعيفة جداً')
    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('rejects passwords without uppercase', async () => {
    const { signUp } = await import('@/lib/auth-actions')
    const result = await signUp(
      createFormData({ email: 'test@example.com', password: 'lowercase1!', fullName: 'Test' })
    )
    expect((result as { error?: string }).error).toContain('حرف كبير')
    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('rejects passwords without lowercase', async () => {
    const { signUp } = await import('@/lib/auth-actions')
    const result = await signUp(
      createFormData({ email: 'test@example.com', password: 'UPPERCASE1!', fullName: 'Test' })
    )
    expect((result as { error?: string }).error).toContain('حرف صغير')
    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('rejects passwords without digit', async () => {
    const { signUp } = await import('@/lib/auth-actions')
    const result = await signUp(
      createFormData({ email: 'test@example.com', password: 'NoDigitsHere!', fullName: 'Test' })
    )
    expect((result as { error?: string }).error).toContain('رقم')
    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
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

    expect((result as { error?: string }).error).toBe('البريد الإلكتروني أو كلمة المرور غير صحيحة')
  })

  it('redirects to welcome on first login when no price set', async () => {
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

    expect(redirect).toHaveBeenCalledWith('/welcome')
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
    expect((result as { error?: string }).error).toContain('يرجى إدخال رقم هاتف')
  })

  it('returns error when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    const { updateUserProfile } = await import('@/lib/auth-actions')
    const result = await updateUserProfile(
      createFormData({ full_name: 'Test', phone: '' })
    )
    expect((result as { error?: string }).error).toBe('Unauthorized')
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
    expect((result as { error?: string }).error).toBe('Unauthorized')
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
    expect((result as { error?: string }).error).toBe('المستخدم غير موجود')
  })
})

describe('signInWithGoogle', () => {
  it('redirects to the provider url', async () => {
    const { redirect } = await import('next/navigation')
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/o/oauth2/auth?x=1' },
      error: null,
    })

    const { signInWithGoogle } = await import('@/lib/auth-actions')
    await signInWithGoogle()

    expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.stringContaining('/auth/callback?next=/welcome'),
      },
    })
    expect(redirect).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/auth?x=1')
  })

  it('returns error when OAuth cannot start', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: 'Provider not enabled' },
    })

    const { signInWithGoogle } = await import('@/lib/auth-actions')
    const result = await signInWithGoogle()
    expect((result as { error?: string }).error).toBe('Provider not enabled')
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
    expect((result as { error?: string }).error).toBe('كلمات المرور غير متطابقة')
  })

  it('returns error on supabase failure', async () => {
    mockSupabase.auth.updateUser.mockResolvedValue({
      error: { message: 'Password too short' },
    })

    const { updateUserPassword } = await import('@/lib/auth-actions')
    const result = await updateUserPassword(
      createFormData({ password: 'Valid1234!', confirmPassword: 'Valid1234!' })
    )
    expect((result as { error?: string }).error).toBe('Password too short')
  })

  it('returns expiry error when no session exists', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    const { updateUserPassword } = await import('@/lib/auth-actions')
    const result = await updateUserPassword(
      createFormData({ password: 'NewPass123!', confirmPassword: 'NewPass123!' })
    )
    expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled()
    expect((result as { error?: string }).error).toContain('انتهت صلاحية رابط التعيين')
  })

  it('rejects weak password on update', async () => {
    const { updateUserPassword } = await import('@/lib/auth-actions')
    const result = await updateUserPassword(
      createFormData({ password: 'password', confirmPassword: 'password' })
    )
    expect((result as { error?: string }).error).toContain('ضعيفة جداً')
    expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('rejects short password on update', async () => {
    const { updateUserPassword } = await import('@/lib/auth-actions')
    const result = await updateUserPassword(
      createFormData({ password: 'Ab1!', confirmPassword: 'Ab1!' })
    )
    expect((result as { error?: string }).error).toContain('8 أحرف')
    expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled()
  })
})
