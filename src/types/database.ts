export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          driver_id: string
          ride_date: string
          uber_api_route_data: Json
          cost_per_rider: number
          status: 'PROPOSED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          driver_id: string
          ride_date: string
          uber_api_route_data: Json
          cost_per_rider: number
          status?: 'PROPOSED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          driver_id?: string
          ride_date?: string
          uber_api_route_data?: Json
          cost_per_rider?: number
          status?: 'PROPOSED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
          created_at?: string
          updated_at?: string
        }
      }
      ride_participants: {
        Row: {
          id: string
          ride_id: string
          user_id: string
          status: 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'DECLINED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ride_id: string
          user_id: string
          status?: 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'DECLINED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ride_id?: string
          user_id?: string
          status?: 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'DECLINED'
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
