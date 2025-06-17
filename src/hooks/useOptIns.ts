import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { optInService } from '../services/optInService'
import type { DailyOptIn, ScheduledOptIn } from '../types'

interface UseOptInsReturn {
  // Daily Opt-ins
  dailyOptIns: any[]
  todayOptIns: any[]
  upcomingOptIns: any[]
  
  // Scheduled Opt-ins
  scheduledOptIns: any[]
  activeScheduledOptIns: any[]
  
  // Loading states
  loading: boolean
  submitting: boolean
  
  // Error state
  error: string | null
  
  // Statistics
  stats: {
    totalDailyOptIns: number
    pendingMatches: number
    matchedRides: number
    cancelledOptIns: number
    totalScheduledOptIns: number
    activeScheduledOptIns: number
  } | null
  
  // Actions
  createDailyOptIn: (data: {
    commute_date: string
    time_window_start: string
    time_window_end: string
    pickup_location_id: string
  }) => Promise<{ success: boolean; error?: any }>
  
  updateDailyOptIn: (optInId: string, updates: {
    time_window_start?: string
    time_window_end?: string
    pickup_location_id?: string
    status?: 'PENDING_MATCH' | 'MATCHED' | 'CANCELLED'
  }) => Promise<{ success: boolean; error?: any }>
  
  cancelDailyOptIn: (optInId: string) => Promise<{ success: boolean; error?: any }>
  deleteDailyOptIn: (optInId: string) => Promise<{ success: boolean; error?: any }>
  
  createScheduledOptIn: (data: {
    day_of_week: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
    start_time: string
    pickup_location_id: string
  }) => Promise<{ success: boolean; error?: any }>
  
  updateScheduledOptIn: (optInId: string, updates: {
    start_time?: string
    pickup_location_id?: string
    is_active?: boolean
  }) => Promise<{ success: boolean; error?: any }>
  
  deleteScheduledOptIn: (optInId: string) => Promise<{ success: boolean; error?: any }>
  
  checkExistingOptIn: (commuteDate: string) => Promise<{ exists: boolean; optIn: any }>
  
  refreshOptIns: () => Promise<void>
}

export const useOptIns = (): UseOptInsReturn => {
  const { user } = useAuth()
  
  // State
  const [dailyOptIns, setDailyOptIns] = useState<any[]>([])
  const [todayOptIns, setTodayOptIns] = useState<any[]>([])
  const [upcomingOptIns, setUpcomingOptIns] = useState<any[]>([])
  const [scheduledOptIns, setScheduledOptIns] = useState<any[]>([])
  const [activeScheduledOptIns, setActiveScheduledOptIns] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all opt-ins data
  const fetchOptIns = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const [
        dailyResult,
        todayResult,
        upcomingResult,
        scheduledResult,
        statsResult
      ] = await Promise.all([
        optInService.getDailyOptIns(user.id),
        optInService.getTodayOptIns(user.id),
        optInService.getUpcomingOptIns(user.id),
        optInService.getScheduledOptIns(user.id),
        optInService.getOptInStats(user.id)
      ])

      if (dailyResult.error) throw new Error('Failed to fetch daily opt-ins')
      if (todayResult.error) throw new Error('Failed to fetch today opt-ins')
      if (upcomingResult.error) throw new Error('Failed to fetch upcoming opt-ins')
      if (scheduledResult.error) throw new Error('Failed to fetch scheduled opt-ins')
      if (statsResult.error) throw new Error('Failed to fetch opt-in stats')

      setDailyOptIns(dailyResult.optIns)
      setTodayOptIns(todayResult.optIns)
      setUpcomingOptIns(upcomingResult.optIns)
      setScheduledOptIns(scheduledResult.optIns)
      setActiveScheduledOptIns(scheduledResult.optIns.filter((opt: any) => opt.is_active))
      setStats(statsResult.stats)

    } catch (err) {
      console.error('Error fetching opt-ins:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch opt-ins')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Create daily opt-in
  const createDailyOptIn = useCallback(async (data: {
    commute_date: string
    time_window_start: string
    time_window_end: string
    pickup_location_id: string
  }) => {
    if (!user) return { success: false, error: 'User not authenticated' }

    setSubmitting(true)
    try {
      const { optIn, error } = await optInService.createDailyOptIn({
        user_id: user.id,
        ...data,
        is_automatic: false
      })

      if (error) {
        return { success: false, error }
      }

      // Refresh data
      await fetchOptIns()
      return { success: true }

    } catch (err) {
      console.error('Error creating daily opt-in:', err)
      return { success: false, error: err }
    } finally {
      setSubmitting(false)
    }
  }, [user, fetchOptIns])

  // Update daily opt-in
  const updateDailyOptIn = useCallback(async (optInId: string, updates: any) => {
    setSubmitting(true)
    try {
      const { optIn, error } = await optInService.updateDailyOptIn(optInId, updates)

      if (error) {
        return { success: false, error }
      }

      // Refresh data
      await fetchOptIns()
      return { success: true }

    } catch (err) {
      console.error('Error updating daily opt-in:', err)
      return { success: false, error: err }
    } finally {
      setSubmitting(false)
    }
  }, [fetchOptIns])

  // Cancel daily opt-in
  const cancelDailyOptIn = useCallback(async (optInId: string) => {
    return updateDailyOptIn(optInId, { status: 'CANCELLED' })
  }, [updateDailyOptIn])

  // Delete daily opt-in
  const deleteDailyOptIn = useCallback(async (optInId: string) => {
    setSubmitting(true)
    try {
      const { success, error } = await optInService.deleteDailyOptIn(optInId)

      if (!success) {
        return { success: false, error }
      }

      // Refresh data
      await fetchOptIns()
      return { success: true }

    } catch (err) {
      console.error('Error deleting daily opt-in:', err)
      return { success: false, error: err }
    } finally {
      setSubmitting(false)
    }
  }, [fetchOptIns])

  // Create scheduled opt-in
  const createScheduledOptIn = useCallback(async (data: {
    day_of_week: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
    start_time: string
    pickup_location_id: string
  }) => {
    if (!user) return { success: false, error: 'User not authenticated' }

    setSubmitting(true)
    try {
      const { optIn, error } = await optInService.createScheduledOptIn({
        user_id: user.id,
        ...data,
        is_active: true
      })

      if (error) {
        return { success: false, error }
      }

      // Refresh data
      await fetchOptIns()
      return { success: true }

    } catch (err) {
      console.error('Error creating scheduled opt-in:', err)
      return { success: false, error: err }
    } finally {
      setSubmitting(false)
    }
  }, [user, fetchOptIns])

  // Update scheduled opt-in
  const updateScheduledOptIn = useCallback(async (optInId: string, updates: any) => {
    setSubmitting(true)
    try {
      const { optIn, error } = await optInService.updateScheduledOptIn(optInId, updates)

      if (error) {
        return { success: false, error }
      }

      // Refresh data
      await fetchOptIns()
      return { success: true }

    } catch (err) {
      console.error('Error updating scheduled opt-in:', err)
      return { success: false, error: err }
    } finally {
      setSubmitting(false)
    }
  }, [fetchOptIns])

  // Delete scheduled opt-in
  const deleteScheduledOptIn = useCallback(async (optInId: string) => {
    setSubmitting(true)
    try {
      const { success, error } = await optInService.deleteScheduledOptIn(optInId)

      if (!success) {
        return { success: false, error }
      }

      // Refresh data
      await fetchOptIns()
      return { success: true }

    } catch (err) {
      console.error('Error deleting scheduled opt-in:', err)
      return { success: false, error: err }
    } finally {
      setSubmitting(false)
    }
  }, [fetchOptIns])

  // Check existing opt-in
  const checkExistingOptIn = useCallback(async (commuteDate: string) => {
    if (!user) return { exists: false, optIn: null }

    try {
      const { exists, optIn, error } = await optInService.checkExistingOptIn(user.id, commuteDate)
      
      if (error) {
        console.error('Error checking existing opt-in:', error)
        return { exists: false, optIn: null }
      }

      return { exists, optIn }
    } catch (err) {
      console.error('Error in checkExistingOptIn:', err)
      return { exists: false, optIn: null }
    }
  }, [user])

  // Refresh opt-ins
  const refreshOptIns = useCallback(async () => {
    await fetchOptIns()
  }, [fetchOptIns])

  // Fetch data when user changes
  useEffect(() => {
    fetchOptIns()
  }, [fetchOptIns])

  return {
    // Data
    dailyOptIns,
    todayOptIns,
    upcomingOptIns,
    scheduledOptIns,
    activeScheduledOptIns,
    stats,
    
    // States
    loading,
    submitting,
    error,
    
    // Actions
    createDailyOptIn,
    updateDailyOptIn,
    cancelDailyOptIn,
    deleteDailyOptIn,
    createScheduledOptIn,
    updateScheduledOptIn,
    deleteScheduledOptIn,
    checkExistingOptIn,
    refreshOptIns
  }
}
