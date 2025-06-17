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

  useEffect(() => {
    // Run comprehensive diagnostics on app start
    runDiagnostics()

    // Get initial session with timeout
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...')

        // Add timeout to prevent infinite loading
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session fetch timeout')), 10000)
        )

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any

        if (session?.user) {
          console.log('Session found, fetching user profile...')
          await fetchUserProfile(session.user)
        } else {
          console.log('No session found, setting user to null')
          setUser(null)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
        setUser(null)
      } finally {
        console.log('Setting loading to false')
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)

        try {
          if (session?.user) {
            console.log('Auth state change: user found, fetching profile...')
            // Only fetch profile if not already fetching
            if (!fetchingProfile) {
              // Add timeout for profile fetching
              const profilePromise = fetchUserProfile(session.user)
              const timeoutPromise = new Promise((resolve) =>
                setTimeout(() => {
                  console.log('Profile fetch timeout, setting user to minimal state')
                  if (!user) { // Only set minimal state if no user is already set
                    setUser({
                      id: session.user.id,
                      email: session.user.email || '',
                      full_name: '',
                      default_role: 'RIDER',
                      home_location_coords: [90.4125, 23.8103],
                      driver_details: null,
                      telegram_user_id: null,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    })
                  }
                  resolve(null)
                }, 8000)
              )

              await Promise.race([profilePromise, timeoutPromise])
            }
          } else {
            console.log('Auth state change: no user, setting to null')
            setUser(null)
          }
        } catch (error) {
          console.error('Error in auth state change handler:', error)
          setUser(null)
        } finally {
          console.log('Auth state change: setting loading to false')
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    // Prevent multiple simultaneous profile fetches
    if (fetchingProfile) {
      console.log('Profile fetch already in progress, skipping...')
      return
    }

    setFetchingProfile(true)
    try {
      console.log('Fetching user profile for:', supabaseUser.email)
      const { user, error } = await userService.getUserProfile(supabaseUser.id)

      if (error) {
        console.error('Error fetching user profile:', error)
        // If user profile doesn't exist, this might be a new user
        if ((error as any)?.code === 'PGRST116') {
          console.log('User profile not found - new user needs to complete profile setup')
          // Create a minimal user object for authenticated users without profiles
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            full_name: '',
            default_role: 'RIDER',
            home_location_coords: [90.4125, 23.8103], // Default Dhaka coordinates
            driver_details: null,
            telegram_user_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
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
      } else {
        console.log('No user data returned, setting user to null')
        setUser(null)
      }
    } catch (error) {
      console.error('Exception in fetchUserProfile:', error)
      // On any exception, set user to null
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
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const refreshUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        await fetchUserProfile(authUser)
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
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
