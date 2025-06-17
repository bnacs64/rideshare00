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
// CORE DATABASE TABLES (CLEAN SCHEMA)
// ============================================================================

export interface DatabaseUser {
  id: string
  email: string
  full_name: string
  default_role: UserRole
  home_location_coords: [number, number] // [lng, lat] for PostGIS
  home_location_address: string | null
  driver_details: Json | null
  telegram_user_id: number | null
  created_at: string
  updated_at: string
}

export interface DatabasePickupLocation {
  id: string
  user_id: string
  name: string
  description: string
  coords: [number, number] // [lat, lng] for frontend display
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface DatabaseDailyOptIn {
  id: string
  user_id: string
  commute_date: string // YYYY-MM-DD
  time_window_start: string // HH:MM
  time_window_end: string // HH:MM
  pickup_location_id: string
  status: OptInStatus
  is_automatic: boolean
  created_at: string
  updated_at: string
}

export interface DatabaseScheduledOptIn {
  id: string
  user_id: string
  day_of_week: DayOfWeek
  start_time: string // HH:MM
  pickup_location_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DatabaseMatchedRide {
  id: string
  driver_user_id: string // CLEAN: renamed from driver_id
  commute_date: string // CLEAN: renamed from ride_date
  route_optimization_data: Json | null // CLEAN: renamed from uber_api_route_data
  estimated_cost_per_person: number | null // CLEAN: renamed from cost_per_rider
  estimated_total_time: number | null
  pickup_order: Json | null
  ai_confidence_score: number | null
  ai_reasoning: string | null
  status: RideStatus
  created_at: string
  updated_at: string
}

export interface DatabaseRideParticipant {
  id: string
  matched_ride_id: string // CLEAN: renamed from ride_id
  user_id: string
  daily_opt_in_id: string | null
  pickup_location_id: string | null
  confirmation_deadline: string | null
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
  user: DatabaseUser
  pickup_location_id?: string | null
}

export interface CompleteProfileApiResponse {
  profile: DatabaseUser
  pickup_locations: DatabasePickupLocation[]
}

export interface ProfileStatusApiResponse {
  is_complete: boolean
  missing_fields: string[]
  pickup_location_count: number
  has_default_pickup: boolean
}

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
// SERVICE INTERFACES (CLEAN API CONTRACTS)
// ============================================================================

export interface CreateProfileRequest {
  user_id: string
  email: string
  full_name: string
  default_role: UserRole
  home_location_lng: number
  home_location_lat: number
  home_location_address?: string | null
  driver_details?: DriverDetails | null
  telegram_user_id?: number | null
}

export interface UpdateProfileRequest {
  user_id: string
  full_name?: string
  default_role?: UserRole
  home_location_lng?: number
  home_location_lat?: number
  home_location_address?: string | null
  driver_details?: DriverDetails | null
  telegram_user_id?: number | null
}

export interface CreatePickupLocationRequest {
  user_id: string
  name: string
  description: string
  location_lng: number
  location_lat: number
  is_default?: boolean
}

// ============================================================================
// MATCHING SYSTEM TYPES
// ============================================================================

export interface MatchingResult {
  success: boolean
  matches: MatchCandidate[]
  error?: string
}

export interface MatchCandidate {
  confidence: number
  reasoning: string
  participants: MatchParticipant[]
  route_optimization: RouteOptimization
}

export interface MatchParticipant {
  user_id: string
  opt_in_id: string
  pickup_location_id: string
  role: UserRole
}

export interface RouteOptimization {
  estimated_total_distance: number
  estimated_total_time: number
  estimated_cost_per_person: number
  pickup_order: string[]
  route_coordinates?: [number, number][]
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface NotificationData {
  type: 'ride_matched' | 'ride_confirmed' | 'ride_cancelled' | 'ride_reminder'
  ride_id: string
  message: string
  data?: Json
}

// ============================================================================
// SYSTEM TYPES
// ============================================================================

export interface SystemHealth {
  component: string
  total_count: number
  pending_count: number
  matched_count: number
  failed_count: number
  retried_count: number
}

export interface CronJob {
  jobname: string
  schedule: string
  command: string
  active: boolean
  jobid: number
}

// ============================================================================
// AUTH CONTEXT TYPES
// ============================================================================

export interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}
