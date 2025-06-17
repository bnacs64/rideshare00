import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner } from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders loading spinner with default message', () => {
    render(<LoadingSpinner />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders loading spinner with custom message', () => {
    const customMessage = 'Please wait while we process your request'
    render(<LoadingSpinner message={customMessage} />)
    
    expect(screen.getByText(customMessage)).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveAttribute('aria-live', 'polite')
  })

  it('applies custom className when provided', () => {
    const customClass = 'custom-spinner-class'
    render(<LoadingSpinner className={customClass} />)
    
    const container = screen.getByRole('status').parentElement
    expect(container).toHaveClass(customClass)
  })
})
