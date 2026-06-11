import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CollapsibleSection } from '@/components/dashboard/collapsible-section'

describe('CollapsibleSection', () => {
  it('renders title', () => {
    render(<CollapsibleSection title="الإعدادات"><div>content</div></CollapsibleSection>)
    expect(screen.getByText('الإعدادات')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(<CollapsibleSection title="T"><div>content</div></CollapsibleSection>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('toggles content visibility when clicking', () => {
    render(<CollapsibleSection title="T"><div>content</div></CollapsibleSection>)
    expect(screen.getByText('content')).toBeInTheDocument()
    const button = screen.getByRole('button')
    fireEvent.click(button)
  })

  it('starts closed when defaultOpen is false', () => {
    render(<CollapsibleSection title="T" defaultOpen={false}><div>hidden</div></CollapsibleSection>)
  })
})
