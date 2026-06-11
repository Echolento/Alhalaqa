import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Empty, EmptyTitle, EmptyDescription, EmptyHeader, EmptyContent, EmptyMedia } from '@/components/ui/empty'

describe('Empty', () => {
  it('renders children', () => {
    render(<Empty><EmptyTitle>No data</EmptyTitle></Empty>)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('applies base classes', () => {
    const { container } = render(<Empty />)
    expect(container.firstChild).toHaveClass('flex')
    expect(container.firstChild).toHaveClass('rounded-lg')
  })
})

describe('EmptyTitle', () => {
  it('renders title text', () => {
    render(<EmptyTitle>Nothing here</EmptyTitle>)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })
})

describe('EmptyDescription', () => {
  it('renders description', () => {
    render(<EmptyDescription>Add something</EmptyDescription>)
    expect(screen.getByText('Add something')).toBeInTheDocument()
  })
})

describe('EmptyHeader', () => {
  it('renders children', () => {
    render(<EmptyHeader><EmptyTitle>Header</EmptyTitle></EmptyHeader>)
    expect(screen.getByText('Header')).toBeInTheDocument()
  })
})

describe('EmptyContent', () => {
  it('renders children', () => {
    render(<EmptyContent><button>Action</button></EmptyContent>)
    expect(screen.getByText('Action')).toBeInTheDocument()
  })
})

describe('EmptyMedia', () => {
  it('renders with variant data attribute', () => {
    const { container } = render(<EmptyMedia><svg /></EmptyMedia>)
    expect(container.firstChild).toHaveAttribute('data-variant', 'default')
  })

  it('renders with icon variant', () => {
    const { container } = render(<EmptyMedia variant="icon"><svg /></EmptyMedia>)
    expect(container.firstChild).toHaveAttribute('data-variant', 'icon')
  })
})
