import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormattedDate, FormattedTime } from '@/components/ui/formatted-date'

describe('FormattedDate', () => {
  it('renders formatted date', () => {
    render(<FormattedDate date="2024-06-15" />)
    expect(screen.getByText(/السبت|الجمعة|الخميس|الأربعاء|الثلاثاء|الاثنين|الأحد/)).toBeInTheDocument()
  })
})

describe('FormattedTime', () => {
  it('renders formatted time', () => {
    render(<FormattedTime date="2024-06-15T14:30:00" />)
    expect(screen.getByText(/٠٢:٣٠|02:30/)).toBeInTheDocument()
  })
})
