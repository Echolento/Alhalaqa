import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UnderConstruction } from '@/components/ui/under-construction'

describe('UnderConstruction', () => {
  it('renders default title and description', () => {
    render(<UnderConstruction />)
    expect(screen.getByText('قيد الإنشاء')).toBeInTheDocument()
    expect(screen.getByText('هذه الصفحة قيد التطوير وستكون متاحة قريباً')).toBeInTheDocument()
  })

  it('renders custom title and description', () => {
    render(<UnderConstruction title="قريباً" description="قيد التطوير" />)
    expect(screen.getByText('قريباً')).toBeInTheDocument()
    expect(screen.getByText('قيد التطوير')).toBeInTheDocument()
  })

  it('renders back to dashboard link', () => {
    render(<UnderConstruction />)
    expect(screen.getByText('العودة للمدفوعات')).toBeInTheDocument()
  })
})
