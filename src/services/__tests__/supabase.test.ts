import { describe, it, expect, vi } from 'vitest'
import { supabase } from '../supabase'

// Mock the createClient function
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      then: vi.fn()
    })),
    functions: {
      invoke: vi.fn()
    }
  }))
}))

describe('Supabase Client', () => {
  it('should be properly initialized', () => {
    expect(supabase).toBeDefined()
    expect(supabase.auth).toBeDefined()
    expect(supabase.from).toBeDefined()
    expect(supabase.functions).toBeDefined()
  })

  it('should have auth methods', () => {
    expect(typeof supabase.auth.getSession).toBe('function')
    expect(typeof supabase.auth.signInWithPassword).toBe('function')
    expect(typeof supabase.auth.signUp).toBe('function')
    expect(typeof supabase.auth.signOut).toBe('function')
    expect(typeof supabase.auth.onAuthStateChange).toBe('function')
  })

  it('should have database query methods', () => {
    const query = supabase.from('test_table')
    expect(typeof query.select).toBe('function')
    expect(typeof query.insert).toBe('function')
    expect(typeof query.update).toBe('function')
    expect(typeof query.delete).toBe('function')
  })

  it('should have functions invoke method', () => {
    expect(typeof supabase.functions.invoke).toBe('function')
  })
})
