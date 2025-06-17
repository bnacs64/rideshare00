export interface User {
  id: string
  email: string
  full_name: string
  default_role: 'DRIVER' | 'RIDER'
  home_location_coords: [number, number] // [longitude, latitude]
  driver_details?: DriverDetails | null
  telegram_user_id?: number | null
  created_at: string
  updated_at: string
}

export interface DriverDetails {
  car_model: string
  capacity: number
  license_plate?: string
  car_color?: string
}

export interface PickupLocation {
  id: string
  user_id: string
  name: string
  description: string
  coords: [number, number] // [longitude, latitude]
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
  status: 'PENDING_MATCH' | 'MATCHED' | 'CANCELLED'
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
  driver_id: string
  ride_date: string
  uber_api_route_data: UberRouteData
  cost_per_rider: number
  status: 'PROPOSED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  created_at: string
  updated_at: string
}

export interface RideParticipant {
  id: string
  ride_id: string
  user_id: string
  status: 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'DECLINED'
  created_at: string
  updated_at: string
}

export interface UberRouteData {
  distance: number // in meters
  duration: number // in seconds
  waypoints: Waypoint[]
  estimated_cost: number
  pickup_etas: { [user_id: string]: string }
}

export interface Waypoint {
  latitude: number
  longitude: number
  address?: string
  user_id?: string
}

export interface GeminiMatchRequest {
  drivers: DriverMatchData[]
  riders: RiderMatchData[]
  destination: {
    name: string
    latitude: number
    longitude: number
  }
}

export interface DriverMatchData {
  user_id: string
  pickup_location: {
    latitude: number
    longitude: number
    description: string
  }
  capacity: number
  time_window: {
    start: string
    end: string
  }
}

export interface RiderMatchData {
  user_id: string
  pickup_location: {
    latitude: number
    longitude: number
    description: string
  }
  time_window: {
    start: string
    end: string
  }
}

export interface GeminiMatchResponse {
  groups: MatchedGroup[]
  reasoning: string
}

export interface MatchedGroup {
  driver_id: string
  rider_ids: string[]
  estimated_route: {
    total_distance: number
    total_duration: number
    pickup_order: string[]
  }
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export type UserRole = 'DRIVER' | 'RIDER'

export interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<{ error: any }>
  refreshUser: () => Promise<void>
}

export interface LocationContextType {
  userLocation: [number, number] | null
  pickupLocations: PickupLocation[]
  defaultPickupLocation: PickupLocation | null
  loading: boolean
  addPickupLocation: (location: Omit<PickupLocation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ error: any }>
  updatePickupLocation: (id: string, updates: Partial<PickupLocation>) => Promise<{ error: any }>
  deletePickupLocation: (id: string) => Promise<{ error: any }>
  setDefaultPickupLocation: (id: string) => Promise<{ error: any }>
  getCurrentLocation: () => Promise<[number, number] | null>
}
