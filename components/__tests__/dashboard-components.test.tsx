import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { TeacherDashboard } from '@/components/dashboard/teacher-dashboard'

const mockProfile = {
  id: 'user-1',
  email: 'test@example.com',
  full_name: 'أحمد',
  role: 'teacher' as const,
  avatar_url: null,
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
    expect(screen.getByText('لوحة التحكم')).toBeInTheDocument()
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

describe('TeacherDashboard', () => {
  it('renders dashboard title', () => {
    render(
      <TeacherDashboard
        students={[{ id: '1', monthly_price: 100 }]}
        paymentData={{
          students: [{ id: '1', monthly_price: 100 }],
          payments: [{ student_id: '1', paid: true, amount_paid: 100 }],
          currency: 'SAR',
        }}
      />
    )
    expect(screen.getByText('لوحة التحكم')).toBeInTheDocument()
  })

  it('renders total students count', () => {
    render(
      <TeacherDashboard
        students={[{ id: '1', monthly_price: 100 }, { id: '2', monthly_price: 200 }]}
        paymentData={{
          students: [{ id: '1', monthly_price: 100 }, { id: '2', monthly_price: 200 }],
          payments: [{ student_id: '1', paid: true, amount_paid: 100 }],
          currency: 'SAR',
        }}
      />
    )
    const h2Elements = screen.getAllByRole('heading', { level: 2 })
    expect(h2Elements[0]).toHaveTextContent('2')
  })

  it('shows empty state when no students', () => {
    render(
      <TeacherDashboard
        students={[]}
        paymentData={{ students: [], payments: [], currency: 'SAR' }}
      />
    )
    expect(screen.getByText('لا يوجد طلاب بعد')).toBeInTheDocument()
  })
})
