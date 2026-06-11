import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SettingsForm } from '@/components/dashboard/settings-form'

vi.mock('@/lib/auth-actions', () => ({
  updateTeacherSettings: vi.fn(),
  updateUserProfile: vi.fn(),
  signOut: vi.fn(),
}))

const mockProfile = {
  id: 'user-1',
  email: 'test@example.com',
  full_name: 'أحمد علي',
  role: 'teacher' as const,
  phone: '+201234567890',
  avatar_url: null,
  organization_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockTeacherData = {
  id: 'teacher-1',
  currency: 'EGP',
  default_monthly_price: 150,
}

describe('SettingsForm', () => {
  it('renders profile name and role', () => {
    render(<SettingsForm profile={mockProfile} teacherData={mockTeacherData} email="test@example.com" />)
    expect(screen.getByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getByText('معلم')).toBeInTheDocument()
  })

  it('renders teacher settings card', () => {
    render(<SettingsForm profile={mockProfile} teacherData={mockTeacherData} email="test@example.com" />)
    expect(screen.getByText('إعدادات المعلم')).toBeInTheDocument()
  })

  it('renders currency select', () => {
    render(<SettingsForm profile={mockProfile} teacherData={mockTeacherData} email="test@example.com" />)
    expect(screen.getByText('الجنية المصري (EGP)')).toBeInTheDocument()
    expect(screen.getByText('الريال السعودي (SAR)')).toBeInTheDocument()
  })

  it('renders save buttons', () => {
    render(<SettingsForm profile={mockProfile} teacherData={mockTeacherData} email="test@example.com" />)
    const saves = screen.getAllByText('حفظ التحديثات')
    expect(saves.length).toBeGreaterThanOrEqual(1)
  })

  it('renders logout card', () => {
    render(<SettingsForm profile={mockProfile} teacherData={mockTeacherData} email="test@example.com" />)
    expect(screen.getAllByText('تسجيل الخروج').length).toBeGreaterThanOrEqual(1)
  })

  it('renders email as disabled input', () => {
    render(<SettingsForm profile={mockProfile} teacherData={mockTeacherData} email="test@example.com" />)
    const emailInput = screen.getByDisplayValue('test@example.com')
    expect(emailInput).toBeDisabled()
  })
})
