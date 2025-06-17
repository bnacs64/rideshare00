import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, mockUser } from '../../test/utils'
import { HomePage } from '../HomePage'

// Mock the useAuth hook
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}))

describe('HomePage', () => {
  it('renders welcome message and main features', () => {
    renderWithProviders(<HomePage />)
    
    expect(screen.getByText(/Welcome to NSU Commute/i)).toBeInTheDocument()
    expect(screen.getByText(/AI-powered ride matching/i)).toBeInTheDocument()
  })

  it('shows registration and login buttons when user is not authenticated', () => {
    renderWithProviders(<HomePage />)
    
    expect(screen.getByRole('link', { name: /Join NSU Commute/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sign In/i })).toBeInTheDocument()
  })

  it('displays feature cards', () => {
    renderWithProviders(<HomePage />)
    
    expect(screen.getByText(/Smart Matching/i)).toBeInTheDocument()
    expect(screen.getByText(/Cost Effective/i)).toBeInTheDocument()
    expect(screen.getByText(/Safe & Secure/i)).toBeInTheDocument()
  })

  it('shows development notice when email validation is bypassed', () => {
    renderWithProviders(<HomePage />)
    
    // Check for development-related content
    expect(screen.getByText(/Development Mode/i)).toBeInTheDocument()
  })

  it('has proper navigation links', () => {
    renderWithProviders(<HomePage />)
    
    const joinLink = screen.getByRole('link', { name: /Join NSU Commute/i })
    const signInLink = screen.getByRole('link', { name: /Sign In/i })
    
    expect(joinLink).toHaveAttribute('href', '/register')
    expect(signInLink).toHaveAttribute('href', '/login')
  })
})
