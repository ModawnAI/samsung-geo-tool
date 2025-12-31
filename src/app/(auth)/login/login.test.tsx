import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from './page'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock Supabase client
const mockSignInWithPassword = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form with email and password fields', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders Samsung GEO Tool title', () => {
    render(<LoginPage />)

    expect(screen.getByText('Samsung GEO Tool')).toBeInTheDocument()
  })

  it('allows user to type in email and password fields', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    await user.type(emailInput, 'test@samsung.com')
    await user.type(passwordInput, 'password123')

    expect(emailInput).toHaveValue('test@samsung.com')
    expect(passwordInput).toHaveValue('password123')
  })

  it('calls signInWithPassword on form submit', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockResolvedValue({ error: null })

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@samsung.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@samsung.com',
        password: 'password123',
      })
    })
  })

  it('redirects to dashboard on successful login', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockResolvedValue({ error: null })

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@samsung.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('displays error message on failed login', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@samsung.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
    })
  })

  it('disables form inputs while loading', async () => {
    const user = userEvent.setup()
    // Create a promise that we can control
    let resolveSignIn: (value: { error: null }) => void
    mockSignInWithPassword.mockImplementation(
      () => new Promise((resolve) => { resolveSignIn = resolve })
    )

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@samsung.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    })

    // Resolve the promise
    resolveSignIn!({ error: null })
  })
})
