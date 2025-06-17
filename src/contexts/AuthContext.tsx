import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { userService } from '../services/userService'
import type { User, AuthContextType } from '../types'
import { runDiagnostics } from '../utils/testConnection'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchingProfile, setFetchingProfile] = useState(false)
  const [profileFetched, setProfileFetched] = useState(false)

  useEffect(() => {
    // Run comprehensive diagnostics on app start
    runDiagnostics()

    // Get initial session with improved timeout handling
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...')

        // Try to get session with a shorter timeout
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session fetch timeout')), 3000)
        )

        try {
          const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any

          if (session?.user) {
            console.log('Session found, fetching user profile...')
            await fetchUserProfile(session.user)
          } else {
            console.log('No session found, setting user to null')
            setUser(null)
          }
        } catch (timeoutError) {
          console.log('Session fetch timed out, auth state change will handle authentication')
          // Don't set user to null here, let auth state change handle it
          // This prevents conflicts between initial session and auth state change
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
        setUser(null)
      } finally {
        // Always set loading to false after initial session attempt
        console.log('Setting loading to false after initial session')
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)

        // Only handle certain events to avoid conflicts
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          try {
            if (session?.user) {
              console.log('Auth state change: user found, fetching profile...')
              setLoading(true) // Set loading when starting profile fetch
              await fetchUserProfile(session.user)
            } else {
              console.log('Auth state change: no user, setting to null')
              setUser(null)
              setProfileFetched(false)
            }
          } catch (error) {
            console.error('Error in auth state change handler:', error)
            setUser(null)
          } finally {
            console.log('Auth state change: setting loading to false')
            setLoading(false)
          }
        } else {
          console.log(`Auth state change: ignoring event ${event}`)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    // Prevent multiple simultaneous profile fetches for the same user
    if (fetchingProfile) {
      console.log('Profile fetch already in progress, skipping...')
      return
    }

    setFetchingProfile(true)
    setProfileFetched(false) // Reset profile fetched state

    try {
      console.log('Fetching user profile for:', supabaseUser.email)

      const { user, error } = await userService.getUserProfile(supabaseUser.id)

      if (error) {
        console.error('Error fetching user profile:', error)
        // If user profile doesn't exist, this might be a new user
        if ((error as any)?.code === 'PGRST116') {
          console.log('User profile not found - new user needs to complete profile setup')
          // Create a minimal user object for authenticated users without profiles
          const minimalUser = {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            full_name: '',
            default_role: 'RIDER' as const,
            home_location_coords: [90.4125, 23.8103] as [number, number], // Default Dhaka coordinates
            home_location_address: '',
            driver_details: null,
            telegram_user_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          setUser(minimalUser)
          setProfileFetched(true) // Mark as fetched to prevent re-fetching
        } else {
          // For other errors, set user to null
          console.error('Database error, setting user to null:', error)
          setUser(null)
        }
        return
      }

      if (user) {
        console.log('User profile loaded successfully:', user.email)
        setUser(user)
        setProfileFetched(true)
      } else {
        console.log('No user data returned, setting user to null')
        setUser(null)
      }
    } catch (error) {
      console.error('Exception in fetchUserProfile:', error)
      // On exceptions, set user to null
      setUser(null)
    } finally {
      setFetchingProfile(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      return { error }
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      // Check if email validation bypass is enabled
      const bypassValidation = import.meta.env.VITE_BYPASS_EMAIL_VALIDATION === 'true'

      // Validate NSU email domain (unless bypassed)
      if (!bypassValidation && !userService.validateNSUEmail(email)) {
        const emailDomain = import.meta.env.VITE_NSU_EMAIL_DOMAIN || '@northsouth.edu'
        return { error: { message: `Please use your NSU email address (${emailDomain})` } }
      }

      if (bypassValidation) {
        console.log('🔓 Email domain validation bypassed for development/testing')
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        console.error('Sign up error:', error)
        return { error }
      }

      console.log('Sign up successful:', data.user?.email)
      return { error: null }
    } catch (error) {
      console.error('Sign up exception:', error)
      return { error }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfileFetched(false)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const refreshUser = async () => {
    try {
      console.log('Refreshing user profile...')
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        // Reset profile fetched state to allow re-fetching
        setProfileFetched(false)
        await fetchUserProfile(authUser)
      } else {
        console.log('No authenticated user found during refresh')
        setUser(null)
        setProfileFetched(false)
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
      setUser(null)
      setProfileFetched(false)
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!user) {
        return { error: { message: 'No user logged in' } }
      }

      const { user: updatedUser, error } = await userService.updateUserProfile(user.id, updates)

      if (error) {
        console.error('Update profile error:', error)
        return { error }
      }

      if (updatedUser) {
        setUser(updatedUser)
      }

      return { error: null }
    } catch (error) {
      console.error('Update profile exception:', error)
      return { error }
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
