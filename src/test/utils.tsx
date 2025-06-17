import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { LocationProvider } from '../contexts/LocationContext'
import type { User } from '../types'

// Mock user data for testing
export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@test.edu',
  full_name: 'Test User',
  default_role: 'RIDER',
  home_location_coords: [90.4125, 23.8103],
  driver_details: null,
  telegram_user_id: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
}

export const mockDriver: User = {
  ...mockUser,
  id: 'test-driver-id',
  email: 'driver@test.edu',
  full_name: 'Test Driver',
  default_role: 'DRIVER',
  driver_details: {
    license_number: 'TEST123',
    vehicle_make: 'Toyota',
    vehicle_model: 'Corolla',
    vehicle_year: 2020,
    vehicle_color: 'White',
    vehicle_plate: 'TEST-123',
    max_passengers: 4
  }
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  user?: User | null
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    initialEntries = ['/'],
    user = null,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Mock AuthContext value
  const mockAuthContext = {
    user,
    loading: false,
    signIn: vi.fn(() => Promise.resolve({ error: null })),
    signUp: vi.fn(() => Promise.resolve({ error: null })),
    signOut: vi.fn(() => Promise.resolve()),
    updateProfile: vi.fn(() => Promise.resolve({ error: null })),
    refreshUser: vi.fn(() => Promise.resolve())
  }

  // Mock LocationContext value
  const mockLocationContext = {
    currentLocation: null,
    loading: false,
    error: null,
    getCurrentLocation: vi.fn(),
    searchLocations: vi.fn(() => Promise.resolve({ results: [], error: null })),
    geocodeLocation: vi.fn(() => Promise.resolve({ result: null, error: null }))
  }

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <AuthProvider value={mockAuthContext}>
          <LocationProvider value={mockLocationContext}>
            {children}
          </LocationProvider>
        </AuthProvider>
      </BrowserRouter>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Test data factories
export const createMockOptIn = (overrides = {}) => ({
  id: 'test-opt-in-id',
  user_id: 'test-user-id',
  commute_date: '2025-06-18',
  time_window_start: '08:00',
  time_window_end: '09:00',
  pickup_location_id: 'test-location-id',
  status: 'PENDING_MATCH',
  created_at: '2025-06-17T00:00:00Z',
  updated_at: '2025-06-17T00:00:00Z',
  ...overrides
})

export const createMockPickupLocation = (overrides = {}) => ({
  id: 'test-location-id',
  user_id: 'test-user-id',
  name: 'Test Location',
  address: 'Test Address, Dhaka',
  coordinates: [90.4125, 23.8103],
  is_default: false,
  created_at: '2025-06-17T00:00:00Z',
  updated_at: '2025-06-17T00:00:00Z',
  ...overrides
})

export const createMockMatchedRide = (overrides = {}) => ({
  id: 'test-ride-id',
  driver_user_id: 'test-driver-id',
  commute_date: '2025-06-18',
  pickup_time: '08:30',
  status: 'PENDING_CONFIRMATION',
  estimated_total_distance: 15000,
  estimated_total_time: 1800,
  estimated_cost_per_person: 150,
  ai_confidence_score: 0.85,
  created_at: '2025-06-17T00:00:00Z',
  updated_at: '2025-06-17T00:00:00Z',
  ...overrides
})

// Mock API responses
export const mockApiResponse = (data: any, error: any = null) => ({
  data,
  error
})

export const mockSupabaseQuery = (data: any, error: any = null) => ({
  data,
  error,
  count: data?.length || 0,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK'
})

// Test helpers
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

export const mockGeolocation = (coords = { latitude: 23.8103, longitude: 90.4125 }) => {
  const mockGeolocation = {
    getCurrentPosition: vi.fn((success) => {
      success({
        coords: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: 10
        }
      })
    }),
    watchPosition: vi.fn(),
    clearWatch: vi.fn()
  }

  Object.defineProperty(global.navigator, 'geolocation', {
    value: mockGeolocation,
    writable: true
  })

  return mockGeolocation
}

// Re-export testing library utilities
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
