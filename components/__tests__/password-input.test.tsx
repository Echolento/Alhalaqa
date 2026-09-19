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

  it('renders strength meter when showStrength is true and value is provided', () => {
    render(<PasswordInput showStrength value="StrongPass1!" />)
    expect(screen.getByTestId('password-strength-fill')).toBeInTheDocument()
    expect(screen.getByTestId('password-strength-label')).toHaveTextContent('قوية')
  })

  it('hides strength meter when value is empty', () => {
    render(<PasswordInput showStrength />)
    expect(screen.queryByTestId('password-strength-fill')).not.toBeInTheDocument()
    expect(screen.queryByTestId('password-strength-label')).not.toBeInTheDocument()
  })

  it('renders lock icon', () => {
    render(<PasswordInput />)
    expect(document.querySelector('.lucide-lock')).toBeInTheDocument()
  })

  it('shows weak red meter for very short lowercase-only password', () => {
    render(<PasswordInput showStrength value="initial" />)
    const input = getInput()
    fireEvent.change(input, { target: { value: 'ab' } })
    expect(screen.getByTestId('password-strength-fill')).toHaveClass('bg-red-500')
    expect(screen.getByTestId('password-strength-label')).toHaveTextContent('ضعيفة')
  })

  it('shows red meter for low strength (< 3)', () => {
    render(<PasswordInput showStrength value="initial" />)
    const input = getInput()
    fireEvent.change(input, { target: { value: 'abc' } })
    expect(screen.getByTestId('password-strength-fill')).toHaveClass('bg-red-500')
    expect(screen.getByTestId('password-strength-label')).toHaveTextContent('ضعيفة')
  })

  it('shows yellow meter for medium strength (3-4)', () => {
    render(<PasswordInput showStrength value="initial" />)
    const input = getInput()
    fireEvent.change(input, { target: { value: 'Ab1!' } })
    expect(screen.getByTestId('password-strength-fill')).toHaveClass('bg-yellow-500')
    expect(screen.getByTestId('password-strength-label')).toHaveTextContent('متوسطة')
  })

  it('shows green meter for high strength (5+)', () => {
    render(<PasswordInput showStrength value="initial" />)
    const input = getInput()
    fireEvent.change(input, { target: { value: 'Abcd1234!' } })
    expect(screen.getByTestId('password-strength-fill')).toHaveClass('bg-green-500')
    expect(screen.getByTestId('password-strength-label')).toHaveTextContent('قوية')
  })

  it('updates meter when parent passes onChange (controlled usage)', () => {
    // Regression: parent onChange must not overwrite the internal handler,
    // otherwise the meter never updates on signup/update-password pages.
    const onChange = vi.fn()
    render(<PasswordInput showStrength value="initial" onChange={onChange} />)
    fireEvent.change(getInput(), { target: { value: 'Abcd1234!' } })
    expect(onChange).toHaveBeenCalled()
    expect(screen.getByTestId('password-strength-fill')).toHaveClass('bg-green-500')
    expect(screen.getByTestId('password-strength-label')).toHaveTextContent('قوية')
  })

  it('marks each requirement individually (abc: only lowercase met)', () => {
    render(<PasswordInput showStrength value="initial" />)
    fireEvent.change(getInput(), { target: { value: 'abc' } })
    const rowClass = (label: string) => screen.getByText(label).closest('li')?.className ?? ''
    expect(rowClass('8 أحرف على الأقل')).toMatch('text-red-500')
    expect(rowClass('حرف كبير (A-Z)')).toMatch('text-red-500')
    expect(rowClass('حرف صغير (a-z)')).toMatch('text-green-600')
    expect(rowClass('رقم (0-9)')).toMatch('text-red-500')
  })

  it('flips each requirement green as it is met', () => {
    render(<PasswordInput showStrength value="initial" />)
    fireEvent.change(getInput(), { target: { value: 'Abcd1234' } })
    for (const label of ['8 أحرف على الأقل', 'حرف كبير (A-Z)', 'حرف صغير (a-z)', 'رقم (0-9)']) {
      const item = screen.getByText(label).closest('li')
      expect(item?.className).toMatch('text-green-600')
    }
  })

  it('label agrees with checklist: fully-valid password is strong even without symbol', () => {
    // Abcd1234 meets every server rule but earns no bonus points — the label
    // must still read strong whenever the whole checklist is green.
    render(<PasswordInput showStrength value="initial" />)
    fireEvent.change(getInput(), { target: { value: 'Abcd1234' } })
    expect(screen.getByTestId('password-strength-label')).toHaveTextContent('قوية')
    for (const label of ['8 أحرف على الأقل', 'حرف كبير (A-Z)', 'حرف صغير (a-z)', 'رقم (0-9)']) {
      const item = screen.getByText(label).closest('li')
      expect(item?.className).toMatch('text-green-600')
    }
  })

  it('hides requirements when showStrength is false', () => {
    render(<PasswordInput showStrength={false} value="Abcd1234" />)
    expect(screen.queryByText('8 أحرف على الأقل')).not.toBeInTheDocument()
  })

  it('hides strength meter when showStrength is false even with value', () => {
    render(<PasswordInput showStrength={false} value="initial" />)
    const input = getInput()
    fireEvent.change(input, { target: { value: 'StrongPass1!' } })
    expect(screen.queryByTestId('password-strength-fill')).not.toBeInTheDocument()
    expect(screen.queryByTestId('password-strength-label')).not.toBeInTheDocument()
  })

  it('forwards disabled prop to input', () => {
    render(<PasswordInput disabled />)
    expect(getInput()).toBeDisabled()
  })
})
