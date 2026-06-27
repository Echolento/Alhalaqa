import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'

const mockProfile = {
  id: 'user-1',
  email: 'test@example.com',
  full_name: 'أحمد',
  role: 'teacher' as const,
  avatar_url: null,
  phone: '+201111111111',
  organization_id: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
}

describe('DashboardSidebar', () => {
  it('renders profile name', () => {
    render(<DashboardSidebar profile={mockProfile} />)
    expect(screen.getByText('أحمد')).toBeInTheDocument()
  })

  it('renders all nav links', () => {
    render(<DashboardSidebar profile={mockProfile} />)
    expect(screen.getByText('المدفوعات')).toBeInTheDocument()
    expect(screen.getByText('الطلاب')).toBeInTheDocument()
    expect(screen.getByText('الإعدادات')).toBeInTheDocument()
  })

  it('renders profile initial', () => {
    render(<DashboardSidebar profile={mockProfile} />)
    expect(screen.getByText('أ')).toBeInTheDocument()
  })

  it('renders WhatsApp link', () => {
    render(<DashboardSidebar profile={mockProfile} />)
    expect(screen.getByText(/تواصل معي عبر واتساب/)).toBeInTheDocument()
  })
})

describe('DashboardHeader', () => {
  it('renders profile name in dropdown', () => {
    render(<DashboardHeader profile={mockProfile} />)
    expect(screen.getByText('أحمد')).toBeInTheDocument()
  })

  it('renders menu button', () => {
    render(<DashboardHeader profile={mockProfile} />)
    expect(screen.getByRole('button', { name: '' })).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })
})


