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
  driver_details?: DriverDetails | null
  telegram_user_id?: number | null
}

export const userService = {
  // Create user profile after successful registration
  async createUserProfile(data: CreateUserProfileData) {
    try {
      // First check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.id)
        .single()

      if (existingUser) {
        console.log('User profile already exists, updating instead of creating')
        // User exists, update their profile instead
        return this.updateUserProfile(data.id, {
          full_name: data.full_name,
          default_role: data.default_role,
          home_location_coords: `POINT(${data.home_location_coords[0]} ${data.home_location_coords[1]})`,
          driver_details: data.driver_details,
          telegram_user_id: data.telegram_user_id
        })
      }

      // User doesn't exist, create new profile
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          default_role: data.default_role,
          home_location_coords: data.home_location_coords,
          home_location_address: data.home_location_address,
          driver_details: data.driver_details,
          telegram_user_id: data.telegram_user_id
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating user profile:', error)
        return { user: null, error }
      }

      return { user, error: null }
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
    try {
      const updateData: any = { ...updates }
      
      // Convert coordinates to PostGIS format if provided
      if (updates.home_location_coords) {
        updateData.home_location_coords = `POINT(${updates.home_location_coords[0]} ${updates.home_location_coords[1]})`
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

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
