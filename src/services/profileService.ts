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
   * Create a complete user profile using direct database operations
   * This handles all validation, coordinate conversion, and automatic pickup location creation
   */
  async createCompleteProfile(profileData: CreateProfileData): Promise<ProfileServiceResponse<{
    user: User
    pickup_location_id: string | null
  }>> {
    try {
      console.log('🔍 Creating complete profile via direct database operations:', profileData)

      // Use the new clean API function
      const { data, error } = await supabase.rpc('api_create_user_profile', {
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
        console.error('❌ Backend API error:', error)
        return { success: false, error: error.message }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'No data returned from backend' }
      }

      const result = data[0]

      if (!result.success) {
        console.error('❌ Profile creation failed:', result.error_message)
        return { success: false, error: result.error_message }
      }

      console.log('✅ Profile created successfully via backend API')

      return {
        success: true,
        data: result.data
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
   * Update user profile using clean API function
   * TODO: Implement api_update_user_profile function call
   */
  async updateProfile(userId: string, updates: UpdateProfileData): Promise<ProfileServiceResponse<User>> {
    try {
      console.log('🔍 Updating profile via backend API:', { userId, updates })

      // For now, use direct database update until api_update_user_profile is implemented
      const updateData: any = {}

      if (updates.full_name !== undefined) updateData.full_name = updates.full_name
      if (updates.default_role !== undefined) updateData.default_role = updates.default_role
      if (updates.home_location_address !== undefined) updateData.home_location_address = updates.home_location_address
      if (updates.driver_details !== undefined) updateData.driver_details = updates.driver_details
      if (updates.telegram_user_id !== undefined) updateData.telegram_user_id = updates.telegram_user_id

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
        console.error('❌ Profile update failed:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ Profile updated successfully')

      return {
        success: true,
        data: data as User
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
      console.log('🔍 Getting complete profile:', userId)

      // Use the new clean API function
      const { data, error } = await supabase.rpc('api_get_user_profile', {
        p_user_id: userId
      })

      if (error) {
        console.error('❌ Backend API error:', error)
        return { success: false, error: error.message }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'User not found' }
      }

      const result = data[0]

      if (!result.success) {
        console.error('❌ Profile retrieval failed:', result.error_message)
        return { success: false, error: result.error_message }
      }

      console.log('✅ Profile retrieved successfully via backend API')

      return {
        success: true,
        data: result.data
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
   * Add pickup location using direct database access
   * TODO: Implement api_add_pickup_location function call
   */
  async addPickupLocation(userId: string, locationData: PickupLocationData): Promise<ProfileServiceResponse<any>> {
    try {
      console.log('🔍 Adding pickup location via direct database:', { userId, locationData })

      const { data, error } = await supabase
        .from('pickup_locations')
        .insert({
          user_id: userId,
          name: locationData.name,
          description: locationData.description,
          coords: `POINT(${locationData.coords[1]} ${locationData.coords[0]})`, // Convert [lat, lng] to POINT(lng lat)
          is_default: locationData.is_default || false
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Pickup location creation failed:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ Pickup location created successfully')

      return {
        success: true,
        data: data
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
   * Update pickup location using direct database access
   * TODO: Implement api_update_pickup_location function call
   */
  async updatePickupLocation(
    locationId: string,
    userId: string,
    updates: Partial<PickupLocationData>
  ): Promise<ProfileServiceResponse<any>> {
    try {
      console.log('🔍 Updating pickup location via direct database:', { locationId, userId, updates })

      const updateData: any = {}

      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.is_default !== undefined) updateData.is_default = updates.is_default

      if (updates.coords) {
        updateData.coords = `POINT(${updates.coords[1]} ${updates.coords[0]})` // Convert [lat, lng] to POINT(lng lat)
      }

      const { data, error } = await supabase
        .from('pickup_locations')
        .update(updateData)
        .eq('id', locationId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('❌ Pickup location update failed:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ Pickup location updated successfully')

      return {
        success: true,
        data: data
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

      const { data, error } = await supabase.rpc('api_get_profile_status', {
        p_user_id: userId
      })

      if (error) {
        console.error('❌ Database function error:', error)
        return { success: false, error: error.message }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'No data returned from backend' }
      }

      const result = data[0]

      if (!result.success) {
        console.error('❌ Profile status check failed:', result.error_message)
        return { success: false, error: result.error_message }
      }

      console.log('✅ Profile status retrieved successfully via backend API')

      return {
        success: true,
        data: result.data
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
