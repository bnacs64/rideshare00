import { supabase } from '../services/supabase'
import { userService } from '../services/userService'
import type { User, DriverDetails } from '../types'

export interface TestUser {
  email: string
  password: string
  fullName: string
  defaultRole: 'DRIVER' | 'RIDER'
  homeLocationCoords: [number, number]
  homeLocationAddress: string
  driverDetails?: DriverDetails | null
}

export interface TestResult {
  success: boolean
  error?: string
  data?: any
  duration?: number
}

// Predefined test users for consistent testing
export const TEST_USERS: TestUser[] = [
  {
    email: 'test1@akshathe.xyz',
    password: 'TestPassword123!',
    fullName: 'Test User One',
    defaultRole: 'RIDER',
    homeLocationCoords: [90.4125, 23.8103], // Dhaka coordinates
    homeLocationAddress: 'Dhaka, Bangladesh'
  },
  {
    email: 'test2@akshathe.xyz',
    password: 'TestPassword123!',
    fullName: 'Test User Two',
    defaultRole: 'DRIVER',
    homeLocationCoords: [90.4125, 23.8103],
    homeLocationAddress: 'Dhaka, Bangladesh',
    driverDetails: {
      license_number: 'DL123456789',
      vehicle_make: 'Toyota',
      vehicle_model: 'Corolla',
      vehicle_year: 2020,
      vehicle_color: 'White',
      vehicle_plate: 'DHK-1234',
      max_passengers: 4
    }
  },
  {
    email: 'test3@akshathe.xyz',
    password: 'TestPassword123!',
    fullName: 'Test User Three',
    defaultRole: 'RIDER',
    homeLocationCoords: [90.4125, 23.8103],
    homeLocationAddress: 'Dhaka, Bangladesh'
  }
]

/**
 * Create a test user programmatically with timeout handling
 */
export const createTestUser = async (testUser: TestUser, timeoutMs: number = 10000): Promise<TestResult> => {
  const startTime = Date.now()
  
  try {
    console.log(`🚀 Creating test user: ${testUser.email}`)
    
    // Step 1: Sign up the user
    console.log('📝 Step 1: Creating auth user...')
    const signUpPromise = supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
    })
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Signup timeout')), timeoutMs)
    )
    
    const { data: authData, error: authError } = await Promise.race([signUpPromise, timeoutPromise]) as any
    
    if (authError) {
      console.error('❌ Auth signup failed:', authError)
      return {
        success: false,
        error: `Auth signup failed: ${authError.message}`,
        duration: Date.now() - startTime
      }
    }
    
    if (!authData.user) {
      return {
        success: false,
        error: 'No user returned from signup',
        duration: Date.now() - startTime
      }
    }
    
    console.log('✅ Auth user created:', authData.user.email)
    
    // Step 2: Create user profile
    console.log('📝 Step 2: Creating user profile...')
    const profileData = {
      id: authData.user.id,
      email: authData.user.email!,
      full_name: testUser.fullName,
      default_role: testUser.defaultRole,
      home_location_coords: testUser.homeLocationCoords,
      home_location_address: testUser.homeLocationAddress,
      driver_details: testUser.driverDetails || null
    }
    
    const profilePromise = userService.createUserProfile(profileData)
    const profileTimeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Profile creation timeout')), timeoutMs)
    )
    
    const { user: createdUser, error: profileError } = await Promise.race([profilePromise, profileTimeoutPromise]) as any
    
    if (profileError) {
      console.error('❌ Profile creation failed:', profileError)
      return {
        success: false,
        error: `Profile creation failed: ${profileError.message}`,
        duration: Date.now() - startTime
      }
    }
    
    console.log('✅ User profile created successfully')
    
    return {
      success: true,
      data: {
        authUser: authData.user,
        profile: createdUser
      },
      duration: Date.now() - startTime
    }
    
  } catch (error) {
    console.error('💥 Test user creation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    }
  }
}

/**
 * Test user signin with timeout handling
 */
export const testUserSignIn = async (email: string, password: string, timeoutMs: number = 5000): Promise<TestResult> => {
  const startTime = Date.now()
  
  try {
    console.log(`🔐 Testing signin for: ${email}`)
    
    const signInPromise = supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Signin timeout')), timeoutMs)
    )
    
    const { data, error } = await Promise.race([signInPromise, timeoutPromise]) as any
    
    if (error) {
      console.error('❌ Signin failed:', error)
      return {
        success: false,
        error: `Signin failed: ${error.message}`,
        duration: Date.now() - startTime
      }
    }
    
    console.log('✅ Signin successful:', data.user?.email)
    
    return {
      success: true,
      data: data.user,
      duration: Date.now() - startTime
    }
    
  } catch (error) {
    console.error('💥 Signin test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    }
  }
}

/**
 * Test fetching user profile with timeout handling
 */
export const testFetchUserProfile = async (userId: string, timeoutMs: number = 5000): Promise<TestResult> => {
  const startTime = Date.now()
  
  try {
    console.log(`👤 Testing profile fetch for user: ${userId}`)
    
    const profilePromise = userService.getUserProfile(userId)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Profile fetch timeout')), timeoutMs)
    )
    
    const { user, error } = await Promise.race([profilePromise, timeoutPromise]) as any
    
    if (error) {
      console.error('❌ Profile fetch failed:', error)
      return {
        success: false,
        error: `Profile fetch failed: ${error.message}`,
        duration: Date.now() - startTime
      }
    }
    
    console.log('✅ Profile fetch successful:', user?.email)
    
    return {
      success: true,
      data: user,
      duration: Date.now() - startTime
    }
    
  } catch (error) {
    console.error('💥 Profile fetch test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    }
  }
}

/**
 * Clean up test users (delete from auth and database)
 */
export const cleanupTestUsers = async (emails: string[]): Promise<TestResult> => {
  const startTime = Date.now()
  
  try {
    console.log('🧹 Cleaning up test users...')
    
    for (const email of emails) {
      try {
        // First, try to sign in to get the user ID
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email,
          password: 'TestPassword123!' // Using default test password
        })
        
        if (signInData.user) {
          // Delete from users table
          await supabase
            .from('users')
            .delete()
            .eq('id', signInData.user.id)
          
          console.log(`🗑️ Deleted user profile: ${email}`)
        }
        
        // Sign out
        await supabase.auth.signOut()
        
      } catch (error) {
        console.warn(`⚠️ Could not cleanup user ${email}:`, error)
      }
    }
    
    return {
      success: true,
      duration: Date.now() - startTime
    }
    
  } catch (error) {
    console.error('💥 Cleanup failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    }
  }
}
