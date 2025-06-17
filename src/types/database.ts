/**
 * CLEAN DATABASE TYPES
 * Updated types that match the clean backend schema
 * This replaces the old database.ts with consistent naming
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'DRIVER' | 'RIDER'
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
export type OptInStatus = 'PENDING_MATCH' | 'MATCHED' | 'CANCELLED'
export type RideStatus = 'PROPOSED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PENDING_CONFIRMATION'
export type ParticipantStatus = 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'DECLINED' | 'PENDING'

// ============================================================================
// FRONTEND TYPES (UI-FRIENDLY)
// ============================================================================

export interface User {
  id: string
  email: string
  full_name: string
  default_role: UserRole
  home_location_coords: [number, number] // [lng, lat]
  home_location_address?: string | null
  driver_details?: DriverDetails | null
  telegram_user_id?: number | null
  created_at: string
  updated_at: string
}

export interface DriverDetails {
  car_model: string
  capacity: number
  license_number?: string
  car_color?: string
  car_plate?: string
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          default_role: 'DRIVER' | 'RIDER'
          home_location_coords: unknown // PostGIS Point
          driver_details: Json | null
          telegram_user_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          default_role: 'DRIVER' | 'RIDER'
          home_location_coords: unknown
          driver_details?: Json | null
          telegram_user_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          default_role?: 'DRIVER' | 'RIDER'
          home_location_coords?: unknown
          driver_details?: Json | null
          telegram_user_id?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      pickup_locations: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          coords: unknown // PostGIS Point
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description: string
          coords: unknown
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          coords?: unknown
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      daily_opt_ins: {
        Row: {
          id: string
          user_id: string
          commute_date: string
          time_window_start: string
          time_window_end: string
          pickup_location_id: string
          status: 'PENDING_MATCH' | 'MATCHED' | 'CANCELLED'
          is_automatic: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          commute_date: string
          time_window_start: string
          time_window_end: string
          pickup_location_id: string
          status?: 'PENDING_MATCH' | 'MATCHED' | 'CANCELLED'
          is_automatic?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          commute_date?: string
          time_window_start?: string
          time_window_end?: string
          pickup_location_id?: string
          status?: 'PENDING_MATCH' | 'MATCHED' | 'CANCELLED'
          is_automatic?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      scheduled_opt_ins: {
        Row: {
          id: string
          user_id: string
          day_of_week: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
          start_time: string
          pickup_location_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          day_of_week: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
          start_time: string
          pickup_location_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          day_of_week?: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
          start_time?: string
          pickup_location_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      matched_rides: {
        Row: {
          id: string
          driver_user_id: string // CLEAN: renamed from driver_id
          commute_date: string // CLEAN: renamed from ride_date
          route_optimization_data: Json | null // CLEAN: renamed from uber_api_route_data
          estimated_cost_per_person: number | null // CLEAN: renamed from cost_per_rider
          estimated_total_time: number | null
          pickup_order: Json | null
          ai_confidence_score: number | null
          ai_reasoning: string | null
          status: 'PROPOSED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PENDING_CONFIRMATION'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          driver_user_id: string
          commute_date: string
          route_optimization_data?: Json | null
          estimated_cost_per_person?: number | null
          estimated_total_time?: number | null
          pickup_order?: Json | null
          ai_confidence_score?: number | null
          ai_reasoning?: string | null
          status?: 'PROPOSED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PENDING_CONFIRMATION'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          driver_user_id?: string
          commute_date?: string
          route_optimization_data?: Json | null
          estimated_cost_per_person?: number | null
          estimated_total_time?: number | null
          pickup_order?: Json | null
          ai_confidence_score?: number | null
          ai_reasoning?: string | null
          status?: 'PROPOSED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PENDING_CONFIRMATION'
          created_at?: string
          updated_at?: string
        }
      }
      ride_participants: {
        Row: {
          id: string
          matched_ride_id: string // CLEAN: renamed from ride_id
          user_id: string
          daily_opt_in_id: string | null
          pickup_location_id: string | null
          confirmation_deadline: string | null
          status: 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'DECLINED' | 'PENDING'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          matched_ride_id: string
          user_id: string
          daily_opt_in_id?: string | null
          pickup_location_id?: string | null
          confirmation_deadline?: string | null
          status?: 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'DECLINED' | 'PENDING'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          matched_ride_id?: string
          user_id?: string
          daily_opt_in_id?: string | null
          pickup_location_id?: string | null
          confirmation_deadline?: string | null
          status?: 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'DECLINED' | 'PENDING'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ============================================================================
// CLEAN FRONTEND TYPES (UI-FRIENDLY)
// ============================================================================

export interface PickupLocation {
  id: string
  user_id: string
  name: string
  description: string
  coords: [number, number] // [lat, lng] for frontend
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface DailyOptIn {
  id: string
  user_id: string
  commute_date: string
  time_window_start: string
  time_window_end: string
  pickup_location_id: string
  status: OptInStatus
  is_automatic: boolean
  created_at: string
  updated_at: string
}

export interface ScheduledOptIn {
  id: string
  user_id: string
  day_of_week: DayOfWeek
  start_time: string
  pickup_location_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MatchedRide {
  id: string
  driver_user_id: string
  commute_date: string
  route_optimization_data?: Json | null
  estimated_cost_per_person?: number | null
  estimated_total_time?: number | null
  pickup_order?: Json | null
  ai_confidence_score?: number | null
  ai_reasoning?: string | null
  status: RideStatus
  created_at: string
  updated_at: string
}

export interface RideParticipant {
  id: string
  matched_ride_id: string
  user_id: string
  daily_opt_in_id?: string | null
  pickup_location_id?: string | null
  confirmation_deadline?: string | null
  status: ParticipantStatus
  created_at: string
  updated_at: string
}

// ============================================================================
// API RESPONSE TYPES (STANDARDIZED)
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error_message?: string
}

export interface ProfileApiResponse {
  user: User
  pickup_location_id?: string | null
}

export interface CompleteProfileApiResponse {
  profile: User
  pickup_locations: PickupLocation[]
}

export interface ProfileStatusApiResponse {
  is_complete: boolean
  missing_fields: string[]
  pickup_location_count: number
  has_default_pickup: boolean
}
