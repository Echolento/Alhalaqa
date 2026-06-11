import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StarRating } from '@/components/ui/star-rating'

describe('StarRating', () => {
  it('renders label', () => {
    render(<StarRating name="rating" label="التقييم" />)
    expect(screen.getByText('التقييم')).toBeInTheDocument()
  })

  it('renders 5 star options', () => {
    render(<StarRating name="rating" label="R" />)
    const radioInputs = document.querySelectorAll('input[type="radio"]')
    expect(radioInputs.length).toBe(5)
  })

  it('selects default value', () => {
    render(<StarRating name="rating" label="R" defaultValue={3} />)
    const radioInputs = document.querySelectorAll<HTMLInputElement>('input[type="radio"]')
    expect(radioInputs[2].checked).toBe(true)
  })

  it('associates radio inputs with the given name', () => {
    render(<StarRating name="feedback" label="R" />)
    const radioInputs = document.querySelectorAll<HTMLInputElement>('input[type="radio"]')
    radioInputs.forEach((input) => {
      expect(input.name).toBe('feedback')
    })
  })
})
