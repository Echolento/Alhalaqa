import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PrivacyPage from '@/app/privacy/page'
import TermsPage from '@/app/terms/page'

describe('Legal pages', () => {
  it('renders privacy policy with Google data disclosure', () => {
    render(<PrivacyPage />)
    expect(screen.getByText('سياسة الخصوصية')).toBeInTheDocument()
    expect(screen.getByText('تسجيل الدخول عبر Google')).toBeInTheDocument()
    expect(screen.getByText('حقوقك')).toBeInTheDocument()
  })

  it('renders terms of use', () => {
    render(<TermsPage />)
    expect(screen.getByText('شروط الاستخدام')).toBeInTheDocument()
    expect(screen.getByText('الحساب')).toBeInTheDocument()
  })

  it('links back home from both pages', () => {
    const { unmount } = render(<PrivacyPage />)
    expect(screen.getByText('العودة إلى الصفحة الرئيسية')).toBeInTheDocument()
    unmount()
    render(<TermsPage />)
    expect(screen.getByText('العودة إلى الصفحة الرئيسية')).toBeInTheDocument()
  })
})
