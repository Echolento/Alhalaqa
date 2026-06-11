import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhoneInput } from '@/components/auth/phone-input'

describe('PhoneInput', () => {
  function getInput(): HTMLInputElement {
    return screen.getByRole('textbox') as HTMLInputElement
  }

  it('renders with label', () => {
    render(<PhoneInput />)
    expect(screen.getByText('رقم الهاتف')).toBeInTheDocument()
  })

  it('renders +20 prefix', () => {
    render(<PhoneInput />)
    expect(screen.getByText('+20')).toBeInTheDocument()
  })

  it('allows digit input only', () => {
    render(<PhoneInput />)
    const input = getInput()
    fireEvent.change(input, { target: { value: 'abc123def' } })
    expect(input.value).toBe('123')
  })

  it('strips leading 0', () => {
    render(<PhoneInput />)
    const input = getInput()
    fireEvent.change(input, { target: { value: '01012345678' } })
    expect(input.value).toBe('1012345678')
  })

  it('limits input to 10 digits', () => {
    render(<PhoneInput />)
    const input = getInput()
    fireEvent.change(input, { target: { value: '123456789012345' } })
    expect(input.value.length).toBe(10)
    expect(input.value).toBe('1234567890')
  })

  it('shows error for short number on blur', () => {
    render(<PhoneInput />)
    const input = getInput()
    fireEvent.change(input, { target: { value: '123' } })
    fireEvent.blur(input)
    expect(screen.getByText('الرقم قصير جداً')).toBeInTheDocument()
  })

  it('shows success icon when 10 valid digits entered', () => {
    render(<PhoneInput />)
    const input = getInput()
    fireEvent.change(input, { target: { value: '1234567890' } })
    expect(document.querySelector('.text-success')).toBeInTheDocument()
  })

  it('calls onChange with raw digits', () => {
    const onChange = vi.fn()
    render(<PhoneInput onChange={onChange} />)
    const input = getInput()
    fireEvent.change(input, { target: { value: '1234567890' } })
    expect(onChange).toHaveBeenCalledWith('1234567890')
  })

  it('strips +20 from initial value', () => {
    render(<PhoneInput defaultValue="+201234567890" />)
    const input = getInput()
    expect(input.value).toBe('1234567890')
  })

  it('calls onBlur callback', () => {
    const onBlur = vi.fn()
    render(<PhoneInput onBlur={onBlur} />)
    const input = getInput()
    fireEvent.blur(input)
    expect(onBlur).toHaveBeenCalled()
  })
})
