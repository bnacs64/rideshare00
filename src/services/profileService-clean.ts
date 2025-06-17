/**
 * CLEAN PROFILE SERVICE
 * Backend-first approach with proper UI/backend separation
 * Uses standardized API functions for all profile operations
 */

import { supabase } from './supabase'
import type { 
  User, 
  DriverDetails, 
  PickupLocation,
  ApiResponse,
  ProfileApiResponse,
  CompleteProfileApiResponse,
  ProfileStatusApiResponse,
  CreateProfileRequest,
  UpdateProfileRequest,
  CreatePickupLocationRequest
} from '../types/database-clean'

// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================

export const profileService = {
  /**
   * Create complete user profile using backend API
   * All validation and business logic handled in database
   */
  async createProfile(profileData: CreateProfileRequest): Promise<ApiResponse<ProfileApiResponse>> {
    try {
      console.log('🔍 Creating profile via backend API:', profileData)

      const { data, error } = await supabase.rpc('api_create_user_profile', {
        p_user_id: profileData.user_id,
        p_email: profileData.email,
        p_full_name: profileData.full_name,
        p_default_role: profileData.default_role,
        p_home_location_lng: profileData.home_location_lng,
        p_home_location_lat: profileData.home_location_lat,
        p_home_location_address: profileData.home_location_address || null,
        p_driver_details: profileData.driver_details || null,
        p_telegram_user_id: profileData.telegram_user_id || null
      })

      if (error) {
        console.error('❌ Backend API error:', error)
        return { success: false, error_message: error.message }
      }

      if (!data || data.length === 0) {
        return { success: false, error_message: 'No data returned from backend' }
      }

      const result = data[0]
      
      if (!result.success) {
        console.error('❌ Profile creation failed:', result.error_message)
        return { success: false, error_message: result.error_message }
      }

      console.log('✅ Profile created successfully via backend API')
      
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error('💥 Error in createProfile:', error)
      return { 
        success: false, 
        error_message: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  },

  /**
   * Get complete user profile with pickup locations
   */
  async getProfile(userId: string): Promise<ApiResponse<CompleteProfileApiResponse>> {
    try {
      console.log('🔍 Getting profile via backend API:', userId)

      const { data, error } = await supabase.rpc('api_get_user_profile', {
        p_user_id: userId
      })

      if (error) {
        console.error('❌ Backend API error:', error)
        return { success: false, error_message: error.message }
      }

      if (!data || data.length === 0) {
        return { success: false, error_message: 'User not found' }
      }

      const result = data[0]
      
      if (!result.success) {
        console.error('❌ Profile retrieval failed:', result.error_message)
        return { success: false, error_message: result.error_message }
      }

      console.log('✅ Profile retrieved successfully via backend API')
      
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error('💥 Error in getProfile:', error)
      return { 
        success: false, 
        error_message: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(updateData: UpdateProfileRequest): Promise<ApiResponse<User>> {
    try {
      console.log('🔍 Updating profile via backend API:', updateData)

      const { data, error } = await supabase.rpc('api_update_user_profile', {
        p_user_id: updateData.user_id,
        p_full_name: updateData.full_name || null,
        p_default_role: updateData.default_role || null,
        p_home_location_lng: updateData.home_location_lng || null,
        p_home_location_lat: updateData.home_location_lat || null,
        p_home_location_address: updateData.home_location_address || null,
        p_driver_details: updateData.driver_details || null,
        p_telegram_user_id: updateData.telegram_user_id || null
      })

      if (error) {
        console.error('❌ Backend API error:', error)
        return { success: false, error_message: error.message }
      }

      if (!data || data.length === 0) {
        return { success: false, error_message: 'No data returned from backend' }
      }

      const result = data[0]
      
      if (!result.success) {
        console.error('❌ Profile update failed:', result.error_message)
        return { success: false, error_message: result.error_message }
      }

      console.log('✅ Profile updated successfully via backend API')
      
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error('💥 Error in updateProfile:', error)
      return { 
        success: false, 
        error_message: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  },

  /**
   * Get profile completion status
   */
  async getProfileStatus(userId: string): Promise<ApiResponse<ProfileStatusApiResponse>> {
    try {
      console.log('🔍 Getting profile status via backend API:', userId)

      const { data, error } = await supabase.rpc('api_get_profile_status', {
        p_user_id: userId
      })

      if (error) {
        console.error('❌ Backend API error:', error)
        return { success: false, error_message: error.message }
      }

      if (!data || data.length === 0) {
        return { success: false, error_message: 'No data returned from backend' }
      }

      const result = data[0]
      
      if (!result.success) {
        console.error('❌ Profile status check failed:', result.error_message)
        return { success: false, error_message: result.error_message }
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
        error_message: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  },

  // ============================================================================
  // PICKUP LOCATION MANAGEMENT
  // ============================================================================

  /**
   * Add pickup location
   */
  async addPickupLocation(locationData: CreatePickupLocationRequest): Promise<ApiResponse<PickupLocation>> {
    try {
      console.log('🔍 Adding pickup location via backend API:', locationData)

      const { data, error } = await supabase.rpc('api_add_pickup_location', {
        p_user_id: locationData.user_id,
        p_name: locationData.name,
        p_description: locationData.description,
        p_location_lng: locationData.location_lng,
        p_location_lat: locationData.location_lat,
        p_is_default: locationData.is_default || false
      })

      if (error) {
        console.error('❌ Backend API error:', error)
        return { success: false, error_message: error.message }
      }

      if (!data || data.length === 0) {
        return { success: false, error_message: 'No data returned from backend' }
      }

      const result = data[0]
      
      if (!result.success) {
        console.error('❌ Pickup location creation failed:', result.error_message)
        return { success: false, error_message: result.error_message }
      }

      console.log('✅ Pickup location created successfully via backend API')
      
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error('💥 Error in addPickupLocation:', error)
      return { 
        success: false, 
        error_message: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  },

  /**
   * Get pickup locations for user
   */
  async getPickupLocations(userId: string): Promise<ApiResponse<PickupLocation[]>> {
    try {
      console.log('🔍 Getting pickup locations for user:', userId)

      const { data, error } = await supabase
        .from('pickup_locations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Database error:', error)
        return { success: false, error_message: error.message }
      }

      // Transform coordinates from PostGIS to frontend format
      const locations = data.map(location => ({
        ...location,
        coords: [
          location.coords.coordinates[1], // lat
          location.coords.coordinates[0]  // lng
        ] as [number, number]
      }))

      console.log('✅ Pickup locations retrieved successfully')
      
      return {
        success: true,
        data: locations
      }
    } catch (error) {
      console.error('💥 Error in getPickupLocations:', error)
      return { 
        success: false, 
        error_message: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  },

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Validate NSU email domain
   */
  validateNSUEmail(email: string): boolean {
    const nsuDomain = import.meta.env.VITE_NSU_EMAIL_DOMAIN || '@northsouth.edu'
    return email.toLowerCase().endsWith(nsuDomain.toLowerCase())
  },

  /**
   * Validate driver details
   */
  validateDriverDetails(details: DriverDetails): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!details.car_model || details.car_model.trim() === '') {
      errors.push('Car model is required')
    }

    if (!details.capacity || details.capacity < 1 || details.capacity > 8) {
      errors.push('Vehicle capacity must be between 1 and 8 passengers')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate coordinates
   */
  validateCoordinates(lng: number, lat: number): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (lat < -90 || lat > 90) {
      errors.push(`Invalid latitude: ${lat} (must be between -90 and 90)`)
    }

    if (lng < -180 || lng > 180) {
      errors.push(`Invalid longitude: ${lng} (must be between -180 and 180)`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}
