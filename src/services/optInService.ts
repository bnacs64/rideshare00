import { supabase } from './supabase'
import type { DailyOptIn, ScheduledOptIn, DayOfWeek } from '../types'

export interface CreateDailyOptInData {
  user_id: string
  commute_date: string // YYYY-MM-DD format
  time_window_start: string // HH:MM format
  time_window_end: string // HH:MM format
  pickup_location_id: string
  is_automatic?: boolean
}

export interface UpdateDailyOptInData {
  time_window_start?: string
  time_window_end?: string
  pickup_location_id?: string
  status?: 'PENDING_MATCH' | 'MATCHED' | 'CANCELLED'
}

export interface CreateScheduledOptInData {
  user_id: string
  day_of_week: DayOfWeek
  start_time: string // HH:MM format
  pickup_location_id: string
  is_active?: boolean
}

export interface UpdateScheduledOptInData {
  start_time?: string
  pickup_location_id?: string
  is_active?: boolean
}

export const optInService = {
  // Daily Opt-ins
  
  /**
   * Create a new daily opt-in
   */
  async createDailyOptIn(data: CreateDailyOptInData) {
    try {
      const { data: optIn, error } = await supabase
        .from('daily_opt_ins')
        .insert({
          user_id: data.user_id,
          commute_date: data.commute_date,
          time_window_start: data.time_window_start,
          time_window_end: data.time_window_end,
          pickup_location_id: data.pickup_location_id,
          is_automatic: data.is_automatic || false,
          status: 'PENDING_MATCH'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating daily opt-in:', error)
        return { optIn: null, error }
      }

      return { optIn, error: null }
    } catch (error) {
      console.error('Error in createDailyOptIn:', error)
      return { optIn: null, error }
    }
  },

  /**
   * Get daily opt-ins for a user
   */
  async getDailyOptIns(userId: string, options?: {
    startDate?: string
    endDate?: string
    status?: 'PENDING_MATCH' | 'MATCHED' | 'CANCELLED'
  }) {
    try {
      let query = supabase
        .from('daily_opt_ins')
        .select(`
          *,
          pickup_locations (
            id,
            name,
            description,
            coords
          )
        `)
        .eq('user_id', userId)
        .order('commute_date', { ascending: true })

      if (options?.startDate) {
        query = query.gte('commute_date', options.startDate)
      }

      if (options?.endDate) {
        query = query.lte('commute_date', options.endDate)
      }

      if (options?.status) {
        query = query.eq('status', options.status)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching daily opt-ins:', error)
        return { optIns: [], error }
      }

      return { optIns: data || [], error: null }
    } catch (error) {
      console.error('Error in getDailyOptIns:', error)
      return { optIns: [], error }
    }
  },

  /**
   * Get a specific daily opt-in by ID
   */
  async getDailyOptIn(optInId: string) {
    try {
      const { data, error } = await supabase
        .from('daily_opt_ins')
        .select(`
          *,
          pickup_locations (
            id,
            name,
            description,
            coords
          )
        `)
        .eq('id', optInId)
        .single()

      if (error) {
        console.error('Error fetching daily opt-in:', error)
        return { optIn: null, error }
      }

      return { optIn: data, error: null }
    } catch (error) {
      console.error('Error in getDailyOptIn:', error)
      return { optIn: null, error }
    }
  },

  /**
   * Update a daily opt-in
   */
  async updateDailyOptIn(optInId: string, updates: UpdateDailyOptInData) {
    try {
      const { data, error } = await supabase
        .from('daily_opt_ins')
        .update(updates)
        .eq('id', optInId)
        .select(`
          *,
          pickup_locations (
            id,
            name,
            description,
            coords
          )
        `)
        .single()

      if (error) {
        console.error('Error updating daily opt-in:', error)
        return { optIn: null, error }
      }

      return { optIn: data, error: null }
    } catch (error) {
      console.error('Error in updateDailyOptIn:', error)
      return { optIn: null, error }
    }
  },

  /**
   * Cancel a daily opt-in
   */
  async cancelDailyOptIn(optInId: string) {
    return this.updateDailyOptIn(optInId, { status: 'CANCELLED' })
  },

  /**
   * Delete a daily opt-in
   */
  async deleteDailyOptIn(optInId: string) {
    try {
      const { error } = await supabase
        .from('daily_opt_ins')
        .delete()
        .eq('id', optInId)

      if (error) {
        console.error('Error deleting daily opt-in:', error)
        return { success: false, error }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in deleteDailyOptIn:', error)
      return { success: false, error }
    }
  },

  /**
   * Check if user has already opted in for a specific date
   */
  async checkExistingOptIn(userId: string, commuteDate: string) {
    try {
      const { data, error } = await supabase
        .from('daily_opt_ins')
        .select('id, status')
        .eq('user_id', userId)
        .eq('commute_date', commuteDate)
        .neq('status', 'CANCELLED')
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking existing opt-in:', error)
        return { exists: false, optIn: null, error }
      }

      return { exists: !!data, optIn: data, error: null }
    } catch (error) {
      console.error('Error in checkExistingOptIn:', error)
      return { exists: false, optIn: null, error }
    }
  },

  /**
   * Get today's opt-ins for a user
   */
  async getTodayOptIns(userId: string) {
    const today = new Date().toISOString().split('T')[0]
    return this.getDailyOptIns(userId, { 
      startDate: today, 
      endDate: today 
    })
  },

  /**
   * Get upcoming opt-ins for a user
   */
  async getUpcomingOptIns(userId: string, days: number = 7) {
    const today = new Date().toISOString().split('T')[0]
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)
    const endDate = futureDate.toISOString().split('T')[0]

    return this.getDailyOptIns(userId, { 
      startDate: today, 
      endDate: endDate,
      status: 'PENDING_MATCH'
    })
  },

  // Scheduled Opt-ins

  /**
   * Create a new scheduled opt-in
   */
  async createScheduledOptIn(data: CreateScheduledOptInData) {
    try {
      const { data: optIn, error } = await supabase
        .from('scheduled_opt_ins')
        .insert({
          user_id: data.user_id,
          day_of_week: data.day_of_week,
          start_time: data.start_time,
          pickup_location_id: data.pickup_location_id,
          is_active: data.is_active !== false // Default to true
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating scheduled opt-in:', error)
        return { optIn: null, error }
      }

      return { optIn, error: null }
    } catch (error) {
      console.error('Error in createScheduledOptIn:', error)
      return { optIn: null, error }
    }
  },

  /**
   * Get scheduled opt-ins for a user
   */
  async getScheduledOptIns(userId: string, activeOnly: boolean = false) {
    try {
      let query = supabase
        .from('scheduled_opt_ins')
        .select(`
          *,
          pickup_locations (
            id,
            name,
            description,
            coords
          )
        `)
        .eq('user_id', userId)
        .order('day_of_week', { ascending: true })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching scheduled opt-ins:', error)
        return { optIns: [], error }
      }

      return { optIns: data || [], error: null }
    } catch (error) {
      console.error('Error in getScheduledOptIns:', error)
      return { optIns: [], error }
    }
  },

  /**
   * Get a specific scheduled opt-in by ID
   */
  async getScheduledOptIn(optInId: string) {
    try {
      const { data, error } = await supabase
        .from('scheduled_opt_ins')
        .select(`
          *,
          pickup_locations (
            id,
            name,
            description,
            coords
          )
        `)
        .eq('id', optInId)
        .single()

      if (error) {
        console.error('Error fetching scheduled opt-in:', error)
        return { optIn: null, error }
      }

      return { optIn: data, error: null }
    } catch (error) {
      console.error('Error in getScheduledOptIn:', error)
      return { optIn: null, error }
    }
  },

  /**
   * Update a scheduled opt-in
   */
  async updateScheduledOptIn(optInId: string, updates: UpdateScheduledOptInData) {
    try {
      const { data, error } = await supabase
        .from('scheduled_opt_ins')
        .update(updates)
        .eq('id', optInId)
        .select(`
          *,
          pickup_locations (
            id,
            name,
            description,
            coords
          )
        `)
        .single()

      if (error) {
        console.error('Error updating scheduled opt-in:', error)
        return { optIn: null, error }
      }

      return { optIn: data, error: null }
    } catch (error) {
      console.error('Error in updateScheduledOptIn:', error)
      return { optIn: null, error }
    }
  },

  /**
   * Toggle scheduled opt-in active status
   */
  async toggleScheduledOptIn(optInId: string, isActive: boolean) {
    return this.updateScheduledOptIn(optInId, { is_active: isActive })
  },

  /**
   * Delete a scheduled opt-in
   */
  async deleteScheduledOptIn(optInId: string) {
    try {
      const { error } = await supabase
        .from('scheduled_opt_ins')
        .delete()
        .eq('id', optInId)

      if (error) {
        console.error('Error deleting scheduled opt-in:', error)
        return { success: false, error }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error in deleteScheduledOptIn:', error)
      return { success: false, error }
    }
  },

  /**
   * Check if user has a scheduled opt-in for a specific day
   */
  async checkScheduledOptInForDay(userId: string, dayOfWeek: DayOfWeek) {
    try {
      const { data, error } = await supabase
        .from('scheduled_opt_ins')
        .select('id, is_active')
        .eq('user_id', userId)
        .eq('day_of_week', dayOfWeek)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking scheduled opt-in:', error)
        return { exists: false, optIn: null, error }
      }

      return { exists: !!data, optIn: data, error: null }
    } catch (error) {
      console.error('Error in checkScheduledOptInForDay:', error)
      return { exists: false, optIn: null, error }
    }
  },

  // Utility functions

  /**
   * Validate time window (start time should be before end time)
   */
  validateTimeWindow(startTime: string, endTime: string): { valid: boolean; error?: string } {
    const start = new Date(`2000-01-01T${startTime}:00`)
    const end = new Date(`2000-01-01T${endTime}:00`)

    if (start >= end) {
      return { valid: false, error: 'Start time must be before end time' }
    }

    const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
    if (diffMinutes < 15) {
      return { valid: false, error: 'Time window must be at least 15 minutes' }
    }

    if (diffMinutes > 180) {
      return { valid: false, error: 'Time window cannot exceed 3 hours' }
    }

    return { valid: true }
  },

  /**
   * Validate commute date (should be today or future)
   */
  validateCommuteDate(commuteDate: string): { valid: boolean; error?: string } {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const targetDate = new Date(commuteDate)
    targetDate.setHours(0, 0, 0, 0)

    if (targetDate < today) {
      return { valid: false, error: 'Cannot opt-in for past dates' }
    }

    const maxFutureDate = new Date()
    maxFutureDate.setDate(maxFutureDate.getDate() + 30) // 30 days in advance
    maxFutureDate.setHours(0, 0, 0, 0)

    if (targetDate > maxFutureDate) {
      return { valid: false, error: 'Cannot opt-in more than 30 days in advance' }
    }

    return { valid: true }
  },

  /**
   * Get day of week from date string
   */
  getDayOfWeekFromDate(dateString: string): DayOfWeek {
    const date = new Date(dateString)
    const days: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
    return days[date.getDay()]
  },

  /**
   * Format time for display (24h to 12h format)
   */
  formatTimeForDisplay(time24: string): string {
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  },

  /**
   * Get statistics for user's opt-ins
   */
  async getOptInStats(userId: string) {
    try {
      const [dailyResult, scheduledResult] = await Promise.all([
        this.getDailyOptIns(userId),
        this.getScheduledOptIns(userId)
      ])

      if (dailyResult.error || scheduledResult.error) {
        return {
          stats: null,
          error: dailyResult.error || scheduledResult.error
        }
      }

      const dailyOptIns = dailyResult.optIns
      const scheduledOptIns = scheduledResult.optIns

      const stats = {
        totalDailyOptIns: dailyOptIns.length,
        pendingMatches: dailyOptIns.filter((opt: any) => opt.status === 'PENDING_MATCH').length,
        matchedRides: dailyOptIns.filter((opt: any) => opt.status === 'MATCHED').length,
        cancelledOptIns: dailyOptIns.filter((opt: any) => opt.status === 'CANCELLED').length,
        totalScheduledOptIns: scheduledOptIns.length,
        activeScheduledOptIns: scheduledOptIns.filter((opt: any) => opt.is_active).length
      }

      return { stats, error: null }
    } catch (error) {
      console.error('Error in getOptInStats:', error)
      return { stats: null, error }
    }
  }
}
