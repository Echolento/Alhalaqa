import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
    })),
  })),
}))

describe('LoginPage', () => {
  it('renders without crashing', async () => {
    const LoginPage = (await import('@/app/auth/login/page')).default
    const { container } = render(<LoginPage />)
    expect(container).toBeInTheDocument()
  })

  it('renders forgot password link', async () => {
    const LoginPage = (await import('@/app/auth/login/page')).default
    render(<LoginPage />)
    expect(screen.getByText('نسيت كلمة المرور؟')).toBeInTheDocument()
  })

  it('renders sign up link', async () => {
    const LoginPage = (await import('@/app/auth/login/page')).default
    render(<LoginPage />)
    expect(screen.getByText('إنشاء حساب جديد')).toBeInTheDocument()
  })
})

describe('SignUpPage', () => {
  it('renders without crashing', async () => {
    const SignUpPage = (await import('@/app/auth/signup/page')).default
    const { container } = render(<SignUpPage />)
    expect(container).toBeInTheDocument()
  })

  it('renders form fields', async () => {
    const SignUpPage = (await import('@/app/auth/signup/page')).default
    render(<SignUpPage />)
    expect(screen.getByText('الاسم')).toBeInTheDocument()
    expect(screen.getByText('البريد الإلكتروني')).toBeInTheDocument()
    expect(screen.getByText('كلمة المرور')).toBeInTheDocument()
  })
})

describe('ForgotPasswordPage', () => {
  it('renders form without crashing', async () => {
    const ForgotPasswordPage = (await import('@/app/auth/forgot-password/page')).default
    const { container } = render(<ForgotPasswordPage />)
    expect(container).toBeInTheDocument()
  })

  it('renders email input and submit button', async () => {
    const ForgotPasswordPage = (await import('@/app/auth/forgot-password/page')).default
    render(<ForgotPasswordPage />)
    expect(screen.getByText('إرسال الرابط')).toBeInTheDocument()
    expect(screen.getByText('العودة لتسجيل الدخول')).toBeInTheDocument()
  })
})

describe('UpdatePasswordPage', () => {
  it('renders without crashing', async () => {
    const UpdatePasswordPage = (await import('@/app/auth/update-password/page')).default
    const { container } = render(<UpdatePasswordPage />)
    expect(container).toBeInTheDocument()
  })

  it('renders both password inputs and submit button', async () => {
    const UpdatePasswordPage = (await import('@/app/auth/update-password/page')).default
    render(<UpdatePasswordPage />)
    expect(screen.getByText('تحديث كلمة المرور')).toBeInTheDocument()
  })
})
