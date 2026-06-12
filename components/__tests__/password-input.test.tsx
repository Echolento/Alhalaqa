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

  it('shows strength 0 for very short password', () => {
    render(<PasswordInput showStrength value="initial" />)
    const input = getInput()
    fireEvent.change(input, { target: { value: 'ab' } })
    const filledBars = [...document.querySelectorAll('.rounded-full')].filter(
      b => !b.classList.contains('bg-muted')
    )
    expect(filledBars.length).toBe(0)
  })

  it('shows red bars for low strength (< 3)', () => {
    render(<PasswordInput showStrength value="initial" />)
    const input = getInput()
    fireEvent.change(input, { target: { value: 'abcdef' } })
    const filledBars = [...document.querySelectorAll('.rounded-full')].filter(
      b => !b.classList.contains('bg-muted')
    )
    expect(filledBars.length).toBe(1)
    expect(filledBars[0]).toHaveClass('bg-red-500')
  })

  it('shows yellow bars for medium strength (3-4)', () => {
    render(<PasswordInput showStrength value="initial" />)
    const input = getInput()
    fireEvent.change(input, { target: { value: 'Abcdef1' } })
    const filledBars = [...document.querySelectorAll('.rounded-full')].filter(
      b => !b.classList.contains('bg-muted')
    )
    expect(filledBars.length).toBe(3)
    expect(filledBars[0]).toHaveClass('bg-yellow-500')
  })

  it('shows green bars for high strength (5)', () => {
    render(<PasswordInput showStrength value="initial" />)
    const input = getInput()
    fireEvent.change(input, { target: { value: 'Abcd1234!@' } })
    const filledBars = [...document.querySelectorAll('.rounded-full')].filter(
      b => !b.classList.contains('bg-muted')
    )
    expect(filledBars.length).toBe(5)
    expect(filledBars[0]).toHaveClass('bg-green-500')
  })

  it('hides strength bars when showStrength is false even with value', () => {
    render(<PasswordInput showStrength={false} value="initial" />)
    const input = getInput()
    fireEvent.change(input, { target: { value: 'StrongPass1!' } })
    expect(document.querySelectorAll('.rounded-full').length).toBe(0)
  })

  it('forwards disabled prop to input', () => {
    render(<PasswordInput disabled />)
    expect(getInput()).toBeDisabled()
  })
})
