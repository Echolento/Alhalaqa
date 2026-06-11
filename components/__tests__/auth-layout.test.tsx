import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthLayout } from '@/components/auth/auth-layout'

describe('AuthLayout', () => {
  it('renders title and description', () => {
    render(
      <AuthLayout title="مرحباً" description="وصف بسيط">
        <div>child</div>
      </AuthLayout>
    )
    expect(screen.getByText('مرحباً')).toBeInTheDocument()
    expect(screen.getByText('وصف بسيط')).toBeInTheDocument()
    expect(screen.getByText('child')).toBeInTheDocument()
  })

  it('renders the hadith quote', () => {
    render(
      <AuthLayout title="T" description="D">
        <div />
      </AuthLayout>
    )
    expect(screen.getByText(/خيركم من تعلم القرآن/)).toBeInTheDocument()
  })

  it('renders logo image', () => {
    render(
      <AuthLayout title="T" description="D">
        <div />
      </AuthLayout>
    )
    const logos = screen.getAllByAltText('Logo')
    expect(logos.length).toBeGreaterThanOrEqual(1)
  })

  it('renders Quran image', () => {
    render(
      <AuthLayout title="T" description="D">
        <div />
      </AuthLayout>
    )
    expect(screen.getByAltText('Quran')).toBeInTheDocument()
  })
})
