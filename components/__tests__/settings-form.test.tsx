import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsForm } from '@/components/dashboard/settings-form'
import { updateUserProfile, updateTeacherSettings } from '@/lib/auth-actions'

const { mockUseSearchParams } = vi.hoisted(() => ({
  mockUseSearchParams: vi.fn(() => new URLSearchParams()),
}))

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
  useSearchParams: mockUseSearchParams,
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() })),
  redirect: vi.fn(),
}))

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

beforeEach(() => {
  mockUseSearchParams.mockReturnValue(new URLSearchParams())
  vi.clearAllMocks()
})

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

  it('shows welcome card on first login and hides profile card', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('first_login=true'))
    render(<SettingsForm profile={mockProfile} teacherData={mockTeacherData} email="test@example.com" />)
    expect(screen.getByText('أهلاً بك يا أحمد!')).toBeInTheDocument()
    expect(screen.queryByText('معلومات الحساب')).not.toBeInTheDocument()
  })

  it('shows "حفظ والمتابعة" button text on first login for teachers', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('first_login=true'))
    render(<SettingsForm profile={mockProfile} teacherData={mockTeacherData} email="test@example.com" />)
    expect(screen.getByText('حفظ والمتابعة للمدفوعات')).toBeInTheDocument()
  })

  it('hides teacher settings for non-teacher role', () => {
    const studentProfile = { ...mockProfile, role: 'student' as const }
    render(<SettingsForm profile={studentProfile} teacherData={mockTeacherData} email="test@example.com" />)
    expect(screen.queryByText('إعدادات المعلم')).not.toBeInTheDocument()
  })

  it('defaults to EGP currency when teacherData is null', () => {
    render(<SettingsForm profile={mockProfile} teacherData={null} email="test@example.com" />)
    expect(screen.getByLabelText('العملة')).toHaveValue('EGP')
  })

  it('defaults to 0 price when teacherData is null', () => {
    render(<SettingsForm profile={mockProfile} teacherData={null} email="test@example.com" />)
    expect(screen.getByLabelText('السعر الافتراضي للطلاب الجدد')).toHaveValue(0)
  })

  it('shows fallback text when full_name is null', () => {
    const nullNameProfile = { ...mockProfile, full_name: null }
    render(<SettingsForm profile={nullNameProfile} teacherData={mockTeacherData} email="test@example.com" />)
    expect(screen.getByText('مستخدم')).toBeInTheDocument()
    expect(screen.getByText('؟')).toBeInTheDocument()
  })

  it('shows success banner after profile save', async () => {
    render(<SettingsForm profile={mockProfile} teacherData={mockTeacherData} email="test@example.com" />)
    const submitBtn = screen.getByRole('button', { name: 'حفظ التحديثات' })
    fireEvent.click(submitBtn)
    expect(await screen.findByText('تم تحديث معلومات الحساب بنجاح')).toBeInTheDocument()
  })

  it('shows error banner when profile save fails', async () => {
    vi.mocked(updateUserProfile).mockResolvedValueOnce({ error: 'خطأ في حفظ الملف الشخصي' })
    render(<SettingsForm profile={mockProfile} teacherData={mockTeacherData} email="test@example.com" />)
    const submitBtn = screen.getByRole('button', { name: 'حفظ التحديثات' })
    fireEvent.click(submitBtn)
    expect(await screen.findByText('خطأ في حفظ الملف الشخصي')).toBeInTheDocument()
  })

  it('shows success banner after teacher settings save', async () => {
    render(<SettingsForm profile={mockProfile} teacherData={mockTeacherData} email="test@example.com" />)
    const saveBtns = screen.getAllByText('حفظ الإعدادات')
    fireEvent.click(saveBtns[0])
    expect(await screen.findByText('تم حفظ الإعدادات بنجاح')).toBeInTheDocument()
  })

  it('shows error banner when teacher settings save fails', async () => {
    vi.mocked(updateTeacherSettings).mockResolvedValueOnce({ error: 'فشل حفظ الإعدادات' })
    render(<SettingsForm profile={mockProfile} teacherData={mockTeacherData} email="test@example.com" />)
    const saveBtns = screen.getAllByText('حفظ الإعدادات')
    fireEvent.click(saveBtns[0])
    expect(await screen.findByText('فشل حفظ الإعدادات')).toBeInTheDocument()
  })
})
