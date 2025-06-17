import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils'
import { LoginPage } from '../../pages/LoginPage'
import { RegisterPage } from '../../pages/RegisterPage'

// Mock the auth service
const mockSignIn = vi.fn()
const mockSignUp = vi.fn()

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    refreshUser: vi.fn()
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}))

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Login Flow', () => {
    it('allows user to sign in with valid credentials', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ error: null })

      renderWithProviders(<LoginPage />)

      // Fill in the login form
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@northsouth.edu')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Verify the sign in function was called with correct parameters
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@northsouth.edu', 'password123')
      })
    })

    it('displays error message for invalid credentials', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ 
        error: { message: 'Invalid login credentials' } 
      })

      renderWithProviders(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@northsouth.edu')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
      })
    })

    it('validates email format', async () => {
      const user = userEvent.setup()

      renderWithProviders(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
      })
    })

    it('requires password field', async () => {
      const user = userEvent.setup()

      renderWithProviders(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@northsouth.edu')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Registration Flow', () => {
    it('allows user to register with valid information', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({ error: null })

      renderWithProviders(<RegisterPage />)

      // Fill in the registration form
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const fullNameInput = screen.getByLabelText(/full name/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'newuser@northsouth.edu')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.type(fullNameInput, 'New User')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          'newuser@northsouth.edu',
          'password123'
        )
      })
    })

    it('validates password confirmation', async () => {
      const user = userEvent.setup()

      renderWithProviders(<RegisterPage />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'differentpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('validates NSU email domain', async () => {
      const user = userEvent.setup()

      renderWithProviders(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'user@gmail.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/must use.*northsouth\.edu.*email/i)).toBeInTheDocument()
      })
    })

    it('requires all mandatory fields', async () => {
      const user = userEvent.setup()

      renderWithProviders(<RegisterPage />)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
        expect(screen.getByText(/full name is required/i)).toBeInTheDocument()
      })
    })

    it('displays error message for registration failure', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({ 
        error: { message: 'User already registered' } 
      })

      renderWithProviders(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const fullNameInput = screen.getByLabelText(/full name/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'existing@northsouth.edu')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.type(fullNameInput, 'Existing User')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/user already registered/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    it('validates password strength', async () => {
      const user = userEvent.setup()

      renderWithProviders(<RegisterPage />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      await user.type(passwordInput, '123')

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

      renderWithProviders(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@northsouth.edu')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })
})
