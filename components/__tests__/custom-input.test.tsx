import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="أدخل النص" />)
    expect(screen.getByPlaceholderText('أدخل النص')).toBeInTheDocument()
  })

  it('hides placeholder on focus', () => {
    render(<Input placeholder="نص" />)
    const input = screen.getByPlaceholderText('نص')
    fireEvent.focus(input)
    expect(screen.queryByPlaceholderText('نص')).toBeNull()
  })

  it('forwards ref', () => {
    const ref = { current: null }
    render(<Input ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('forwards onChange', () => {
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(onChange).toHaveBeenCalled()
  })
})
