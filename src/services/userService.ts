import { supabase } from './supabase'
import type { User, DriverDetails } from '../types'

export interface CreateUserProfileData {
  id: string
  email: string
  full_name: string
  default_role: 'DRIVER' | 'RIDER'
  home_location_coords: [number, number] // [longitude, latitude]
  driver_details?: DriverDetails | null
  telegram_user_id?: number | null
}

export interface UpdateUserProfileData {
  full_name?: string
  default_role?: 'DRIVER' | 'RIDER'
  home_location_coords?: [number, number]
  home_location_address?: string
  driver_details?: DriverDetails | null
  telegram_user_id?: number | null
}

export const userService = {
  // Create user profile after successful registration
  async createUserProfile(data: CreateUserProfileData) {
    console.log('🔍 createUserProfile called with data:', data)
    try {
      // Try to create the user directly - if it fails due to duplicate, we'll handle it
      console.log('🔍 Attempting to create user profile directly...')

      // User doesn't exist, create new profile
      console.log('📝 Creating new user profile...')
      const insertData = {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        default_role: data.default_role,
        home_location_coords: `POINT(${data.home_location_coords[0]} ${data.home_location_coords[1]})`,
        home_location_address: data.home_location_address,
        driver_details: data.driver_details,
        telegram_user_id: data.telegram_user_id
      }
      console.log('📋 Insert data:', insertData)

      const { data: user, error } = await supabase
        .from('users')
        .insert(insertData)
        .select()
        .single()

      console.log('📋 Insert result:', { user, error })

      if (error) {
        console.error('Error creating user profile:', error)

        // If it's a duplicate key error, try to update the existing user instead
        if (error.code === '23505' && error.message.includes('duplicate key')) {
          console.log('🔄 User already exists, attempting to update instead...')
          return this.updateUserProfile(data.id, {
            full_name: data.full_name,
            default_role: data.default_role,
            home_location_coords: data.home_location_coords,
            home_location_address: data.home_location_address,
            driver_details: data.driver_details,
            telegram_user_id: data.telegram_user_id
          })
        }

        return { user: null, error }
      }

      // Convert PostGIS point back to coordinates array
      const userWithCoords = {
        ...user,
        home_location_coords: this.parseLocationCoords(user.home_location_coords)
      }

      return { user: userWithCoords, error: null }
    } catch (error) {
      console.error('Error in createUserProfile:', error)
      return { user: null, error }
    }
  },

  // Get user profile by ID
  async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return { user: null, error }
      }

      // Convert PostGIS point to coordinates array
      const user: User = {
        ...data,
        home_location_coords: this.parseLocationCoords(data.home_location_coords)
      }

      return { user, error: null }
    } catch (error) {
      console.error('Error in getUserProfile:', error)
      return { user: null, error }
    }
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: UpdateUserProfileData) {
    console.log('🔄 updateUserProfile called for user:', userId)
    console.log('🔄 Updates to apply:', updates)
    try {
      const updateData: any = { ...updates }

      // Convert coordinates to PostGIS format if provided
      if (updates.home_location_coords) {
        console.log('Converting coordinates to PostGIS:', updates.home_location_coords)
        const [lng, lat] = updates.home_location_coords
        if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
          updateData.home_location_coords = `POINT(${lng} ${lat})`
          console.log('PostGIS format:', updateData.home_location_coords)
        } else {
          console.error('Invalid coordinates:', updates.home_location_coords)
          throw new Error('Invalid coordinates provided')
        }
      }

      console.log('🔄 Executing update with data:', updateData)
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      console.log('📋 Update result:', { data, error })

      if (error) {
        console.error('Error updating user profile:', error)
        return { user: null, error }
      }

      // Convert PostGIS point to coordinates array
      const user: User = {
        ...data,
        home_location_coords: this.parseLocationCoords(data.home_location_coords)
      }

      return { user, error: null }
    } catch (error) {
      console.error('Error in updateUserProfile:', error)
      return { user: null, error }
    }
  },

  // Check if user profile exists
  async checkUserProfileExists(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking user profile:', error)
        return { exists: false, error }
      }

      return { exists: !!data, error: null }
    } catch (error) {
      console.error('Error in checkUserProfileExists:', error)
      return { exists: false, error }
    }
  },

  // Validate NSU email domain
  validateNSUEmail(email: string): boolean {
    // Check if email validation bypass is enabled for development/testing
    const bypassValidation = import.meta.env.VITE_BYPASS_EMAIL_VALIDATION === 'true'

    if (bypassValidation) {
      console.log('🔓 Email domain validation bypassed for development/testing')
      return true
    }

    const nsuDomain = import.meta.env.VITE_NSU_EMAIL_DOMAIN || '@northsouth.edu'
    const isValid = email.toLowerCase().endsWith(nsuDomain.toLowerCase())

    if (!isValid) {
      console.log(`❌ Email validation failed: ${email} does not end with ${nsuDomain}`)
    } else {
      console.log(`✅ Email validation passed: ${email}`)
    }

    return isValid
  },

  // Parse PostGIS point to coordinates array
  parseLocationCoords(postgisPoint: any): [number, number] {
    if (typeof postgisPoint === 'string') {
      // Parse "POINT(lng lat)" format
      const match = postgisPoint.match(/POINT\(([^)]+)\)/)
      if (match) {
        const [lng, lat] = match[1].split(' ').map(Number)
        return [lng, lat]
      }
    }
    
    // Fallback for other formats or if parsing fails
    return [90.4125, 23.8103] // Default to Dhaka coordinates
  },

  // Validate driver details
  validateDriverDetails(details: DriverDetails): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!details.car_model || details.car_model.trim().length === 0) {
      errors.push('Car model is required')
    }

    if (!details.capacity || details.capacity < 1 || details.capacity > 8) {
      errors.push('Capacity must be between 1 and 8 passengers')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}
