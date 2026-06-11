import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PasswordInput } from '@/components/auth/password-input'

describe('PasswordInput', () => {
  function getInput(): HTMLInputElement {
    return document.querySelector('input') as HTMLInputElement
  }

  it('renders password input', () => {
    render(<PasswordInput />)
    expect(getInput()).toBeInTheDocument()
  })

  it('toggles visibility when eye icon is clicked', () => {
    render(<PasswordInput />)
    const input = getInput()
    expect(input.type).toBe('password')
    const toggleButton = screen.getByRole('button')
    fireEvent.click(toggleButton)
    expect(input.type).toBe('text')
    fireEvent.click(toggleButton)
    expect(input.type).toBe('password')
  })

  it('calls onChange when typing', () => {
    const onChange = vi.fn()
    render(<PasswordInput onChange={onChange} />)
    fireEvent.change(getInput(), { target: { value: 'hello' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('renders strength bars when showStrength is true and value is provided', () => {
    render(<PasswordInput showStrength value="StrongPass1!" />)
    const bars = document.querySelectorAll('.rounded-full')
    expect(bars.length).toBeGreaterThanOrEqual(5)
  })

  it('hides strength bars when value is empty', () => {
    render(<PasswordInput showStrength />)
    expect(document.querySelectorAll('.rounded-full').length).toBe(0)
  })

  it('renders lock icon', () => {
    render(<PasswordInput />)
    expect(document.querySelector('.lucide-lock')).toBeInTheDocument()
  })
})
