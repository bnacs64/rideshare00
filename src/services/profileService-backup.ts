/**
 * Profile Service - Database-First Approach (BACKUP)
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

// This is the backup of the old service - see profileService.ts for the current implementation
