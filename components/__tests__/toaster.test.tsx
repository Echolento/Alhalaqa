import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Toaster } from '@/components/ui/toaster'

describe('Toaster', () => {
  it('renders without crashing with no toasts', () => {
    const { container } = render(<Toaster />)
    expect(container).toBeInTheDocument()
  })
})
