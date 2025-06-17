/**
 * Profile Service - Database-First Approach
 * 
 * This service uses database functions to handle profile operations,
 * separating UI logic from backend logic and ensuring data consistency.
 * All complex validation and business logic is handled in the database.
 */

import { supabase } from './supabase'
import type { User, DriverDetails } from '../types'

export interface CreateProfileData {
  id: string
  email: string
  full_name: string
  default_role: 'DRIVER' | 'RIDER'
  home_location_coords: [number, number] // [lng, lat] for PostGIS
  home_location_address?: string
  driver_details?: DriverDetails | null
  telegram_user_id?: number | null
}

export interface UpdateProfileData {
  full_name?: string
  default_role?: 'DRIVER' | 'RIDER'
  home_location_coords?: [number, number] // [lng, lat] for PostGIS
  home_location_address?: string
  driver_details?: DriverDetails | null
  telegram_user_id?: number | null
}

export interface PickupLocationData {
  name: string
  description: string
  coords: [number, number] // [lat, lng] for display
  is_default?: boolean
}

export interface ProfileServiceResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export const profileService = {
  /**
   * Create a complete user profile using database function
   * This handles all validation, coordinate conversion, and automatic pickup location creation
   */
  async createCompleteProfile(profileData: CreateProfileData): Promise<ProfileServiceResponse<{
    user: User
    pickup_location_id: string | null
  }>> {
    try {
      console.log('🔍 Creating complete profile via database function:', profileData)

      const { data, error } = await supabase.rpc('create_complete_user_profile', {
        p_user_id: profileData.id,
        p_email: profileData.email,
        p_full_name: profileData.full_name,
        p_default_role: profileData.default_role,
        p_home_location_lng: profileData.home_location_coords[0], // lng
        p_home_location_lat: profileData.home_location_coords[1],  // lat
        p_home_location_address: profileData.home_location_address || null,
        p_driver_details: profileData.driver_details || null,
        p_telegram_user_id: profileData.telegram_user_id || null
      })

      if (error) {
        console.error('❌ Database function error:', error)
        return { success: false, error: error.message }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'No data returned from database function' }
      }

      const result = data[0]
      
      if (!result.success) {
        console.error('❌ Profile creation failed:', result.error_message)
        return { success: false, error: result.error_message }
      }

      console.log('✅ Profile created successfully via database function')
      
      return {
        success: true,
        data: {
          user: result.user_data as User,
          pickup_location_id: result.pickup_location_id
        }
      }
    } catch (error) {
      console.error('💥 Error in createCompleteProfile:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  },

  /**
   * Update user profile using database function
   * Only updates provided fields, handles validation in database
   */
  async updateProfile(userId: string, updates: UpdateProfileData): Promise<ProfileServiceResponse<User>> {
    try {
      console.log('🔍 Updating profile via database function:', { userId, updates })

      const { data, error } = await supabase.rpc('update_user_profile', {
        p_user_id: userId,
        p_full_name: updates.full_name || null,
        p_default_role: updates.default_role || null,
        p_home_location_lng: updates.home_location_coords?.[0] || null, // lng
        p_home_location_lat: updates.home_location_coords?.[1] || null,  // lat
        p_home_location_address: updates.home_location_address || null,
        p_driver_details: updates.driver_details || null,
        p_telegram_user_id: updates.telegram_user_id || null
      })

      if (error) {
        console.error('❌ Database function error:', error)
        return { success: false, error: error.message }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'No data returned from database function' }
      }

      const result = data[0]
      
      if (!result.success) {
        console.error('❌ Profile update failed:', result.error_message)
        return { success: false, error: result.error_message }
      }

      console.log('✅ Profile updated successfully via database function')
      
      return {
        success: true,
        data: result.user_data as User
      }
    } catch (error) {
      console.error('💥 Error in updateProfile:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  },

  /**
   * Get complete user profile with pickup locations
   */
  async getCompleteProfile(userId: string): Promise<ProfileServiceResponse<{
    profile: User
    pickup_locations: any[]
  }>> {
    try {
      console.log('🔍 Getting complete profile via database function:', userId)

      const { data, error } = await supabase.rpc('get_complete_user_profile', {
        p_user_id: userId
      })

      if (error) {
        console.error('❌ Database function error:', error)
        return { success: false, error: error.message }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'No data returned from database function' }
      }

      const result = data[0]
      
      if (!result.success) {
        console.error('❌ Profile retrieval failed:', result.error_message)
        return { success: false, error: result.error_message }
      }

      console.log('✅ Profile retrieved successfully via database function')
      
      return {
        success: true,
        data: {
          profile: result.profile_data as User,
          pickup_locations: result.pickup_locations || []
        }
      }
    } catch (error) {
      console.error('💥 Error in getCompleteProfile:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  },

  /**
   * Add pickup location using database function
   */
  async addPickupLocation(userId: string, locationData: PickupLocationData): Promise<ProfileServiceResponse<any>> {
    try {
      console.log('🔍 Adding pickup location via database function:', { userId, locationData })

      const { data, error } = await supabase.rpc('add_pickup_location', {
        p_user_id: userId,
        p_name: locationData.name,
        p_description: locationData.description,
        p_location_lng: locationData.coords[1], // Convert [lat, lng] to lng
        p_location_lat: locationData.coords[0],  // Convert [lat, lng] to lat
        p_is_default: locationData.is_default || false
      })

      if (error) {
        console.error('❌ Database function error:', error)
        return { success: false, error: error.message }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'No data returned from database function' }
      }

      const result = data[0]
      
      if (!result.success) {
        console.error('❌ Pickup location creation failed:', result.error_message)
        return { success: false, error: result.error_message }
      }

      console.log('✅ Pickup location created successfully via database function')
      
      return {
        success: true,
        data: result.pickup_location_data
      }
    } catch (error) {
      console.error('💥 Error in addPickupLocation:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  },

  /**
   * Update pickup location using database function
   */
  async updatePickupLocation(
    locationId: string, 
    userId: string, 
    updates: Partial<PickupLocationData>
  ): Promise<ProfileServiceResponse<any>> {
    try {
      console.log('🔍 Updating pickup location via database function:', { locationId, userId, updates })

      const { data, error } = await supabase.rpc('update_pickup_location', {
        p_location_id: locationId,
        p_user_id: userId,
        p_name: updates.name || null,
        p_description: updates.description || null,
        p_location_lng: updates.coords?.[1] || null, // Convert [lat, lng] to lng
        p_location_lat: updates.coords?.[0] || null,  // Convert [lat, lng] to lat
        p_is_default: updates.is_default !== undefined ? updates.is_default : null
      })

      if (error) {
        console.error('❌ Database function error:', error)
        return { success: false, error: error.message }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'No data returned from database function' }
      }

      const result = data[0]
      
      if (!result.success) {
        console.error('❌ Pickup location update failed:', result.error_message)
        return { success: false, error: result.error_message }
      }

      console.log('✅ Pickup location updated successfully via database function')
      
      return {
        success: true,
        data: result.pickup_location_data
      }
    } catch (error) {
      console.error('💥 Error in updatePickupLocation:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  },

  /**
   * Get profile completion status
   */
  async getProfileStatus(userId: string): Promise<ProfileServiceResponse<{
    is_complete: boolean
    missing_fields: string[]
    pickup_location_count: number
    has_default_pickup: boolean
  }>> {
    try {
      console.log('🔍 Getting profile status via database function:', userId)

      const { data, error } = await supabase.rpc('get_profile_status', {
        user_id: userId
      })

      if (error) {
        console.error('❌ Database function error:', error)
        return { success: false, error: error.message }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'No data returned from database function' }
      }

      console.log('✅ Profile status retrieved successfully via database function')
      
      return {
        success: true,
        data: data[0]
      }
    } catch (error) {
      console.error('💥 Error in getProfileStatus:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
}
