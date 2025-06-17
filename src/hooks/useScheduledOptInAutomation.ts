import { useState, useCallback } from 'react'
import { optInService } from '../services/optInService'

interface ScheduledOptInsSummary {
  day_of_week: string
  total_scheduled: number
  active_scheduled: number
  inactive_scheduled: number
  users: string[]
}

interface RecentAutomaticOptIn {
  commute_date: string
  total_created: number
  pending_match: number
  matched: number
  cancelled: number
  users: string[]
}

interface TriggerResult {
  success: boolean
  date?: string
  dayOfWeek?: string
  totalScheduled?: number
  created?: number
  skipped?: number
  errors?: string[]
  preview?: any[]
  error?: string
}

interface UseScheduledOptInAutomationReturn {
  // Data
  summary: ScheduledOptInsSummary[]
  recentOptIns: RecentAutomaticOptIn[]
  
  // Loading states
  loading: boolean
  triggering: boolean
  
  // Error state
  error: string | null
  
  // Actions
  fetchSummary: () => Promise<void>
  fetchRecentOptIns: () => Promise<void>
  triggerScheduledOptIns: (date?: string, dryRun?: boolean) => Promise<TriggerResult>
  refreshData: () => Promise<void>
}

export const useScheduledOptInAutomation = (): UseScheduledOptInAutomationReturn => {
  const [summary, setSummary] = useState<ScheduledOptInsSummary[]>([])
  const [recentOptIns, setRecentOptIns] = useState<RecentAutomaticOptIn[]>([])
  const [loading, setLoading] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch scheduled opt-ins summary
  const fetchSummary = useCallback(async () => {
    try {
      setError(null)
      const { summary: data, error: fetchError } = await optInService.getScheduledOptInsSummary()
      
      if (fetchError) {
        setError('Failed to fetch scheduled opt-ins summary')
        console.error('Error fetching summary:', fetchError)
        return
      }

      setSummary(data)
    } catch (err) {
      console.error('Error in fetchSummary:', err)
      setError('An unexpected error occurred while fetching summary')
    }
  }, [])

  // Fetch recent automatic opt-ins
  const fetchRecentOptIns = useCallback(async () => {
    try {
      setError(null)
      const { optIns: data, error: fetchError } = await optInService.getRecentAutomaticOptIns()
      
      if (fetchError) {
        setError('Failed to fetch recent automatic opt-ins')
        console.error('Error fetching recent opt-ins:', fetchError)
        return
      }

      setRecentOptIns(data)
    } catch (err) {
      console.error('Error in fetchRecentOptIns:', err)
      setError('An unexpected error occurred while fetching recent opt-ins')
    }
  }, [])

  // Trigger scheduled opt-ins creation
  const triggerScheduledOptIns = useCallback(async (date?: string, dryRun: boolean = false): Promise<TriggerResult> => {
    setTriggering(true)
    setError(null)

    try {
      const result = await optInService.triggerScheduledOptIns(date, dryRun)
      
      if (!result.success) {
        setError(result.error || 'Failed to trigger scheduled opt-ins')
        return result
      }

      // Refresh data after successful trigger (unless it's a dry run)
      if (!dryRun) {
        await Promise.all([fetchSummary(), fetchRecentOptIns()])
      }

      return result
    } catch (err) {
      console.error('Error in triggerScheduledOptIns:', err)
      const errorMessage = 'An unexpected error occurred while triggering scheduled opt-ins'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setTriggering(false)
    }
  }, [fetchSummary, fetchRecentOptIns])

  // Refresh all data
  const refreshData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      await Promise.all([fetchSummary(), fetchRecentOptIns()])
    } catch (err) {
      console.error('Error in refreshData:', err)
      setError('Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }, [fetchSummary, fetchRecentOptIns])

  return {
    // Data
    summary,
    recentOptIns,
    
    // Loading states
    loading,
    triggering,
    
    // Error state
    error,
    
    // Actions
    fetchSummary,
    fetchRecentOptIns,
    triggerScheduledOptIns,
    refreshData
  }
}
