import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    VITE_GEMINI_API_KEY: 'test-gemini-key',
    VITE_GOOGLE_MAPS_API_KEY: 'test-maps-key',
    VITE_TELEGRAM_BOT_TOKEN: 'test-telegram-token',
    VITE_APP_URL: 'http://localhost:3000',
    VITE_NSU_EMAIL_DOMAIN: '@test.edu',
    VITE_BYPASS_EMAIL_VALIDATION: 'true'
  }
}))

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signUp: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      then: vi.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }
  }))
}))

// Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useParams: () => ({}),
    BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
    Link: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children)
  }
})

// Mock Leaflet
vi.mock('leaflet', () => ({
  map: vi.fn(() => ({
    setView: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn()
  })),
  tileLayer: vi.fn(() => ({
    addTo: vi.fn()
  })),
  marker: vi.fn(() => ({
    addTo: vi.fn(),
    bindPopup: vi.fn(),
    on: vi.fn(),
    setLatLng: vi.fn()
  })),
  icon: vi.fn(() => ({})),
  divIcon: vi.fn(() => ({}))
}))

// Mock React Leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'map-container' }, children),
  TileLayer: () => React.createElement('div', { 'data-testid': 'tile-layer' }),
  Marker: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'marker' }, children),
  Popup: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'popup' }, children),
  useMap: () => ({
    setView: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn()
  }),
  useMapEvents: () => ({})
}))

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn(() => Promise.resolve({
        response: {
          text: () => Promise.resolve('{"matches": [], "confidence": 0.5}')
        }
      }))
    }))
  }))
}))

// Mock Telegraf
vi.mock('telegraf', () => ({
  Telegraf: vi.fn(() => ({
    start: vi.fn(),
    help: vi.fn(),
    on: vi.fn(),
    launch: vi.fn(() => Promise.resolve()),
    stop: vi.fn(() => Promise.resolve())
  }))
}))

// Global test utilities
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  } as Response)
)
