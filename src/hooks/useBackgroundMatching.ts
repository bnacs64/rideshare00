import { useState, useCallback } from 'react'
import { backgroundMatchingService } from '../services/backgroundMatchingService'

interface UseBackgroundMatchingReturn {
  // State
  loading: boolean
  error: string | null
  jobHistory: any[]
  matchingStats: any
  
  // Actions
  triggerImmediateMatching: (type?: 'daily' | 'optimization') => Promise<{ success: boolean; error?: string }>
  getJobHistory: () => Promise<void>
  getMatchingStats: (days?: number) => Promise<void>
  initializeSchedules: () => Promise<{ success: boolean; error?: string }>
  
  // Utilities
  clearError: () => void
}

export const useBackgroundMatching = (): UseBackgroundMatchingReturn => {
  // State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobHistory, setJobHistory] = useState<any[]>([])
  const [matchingStats, setMatchingStats] = useState<any>(null)

  // Trigger immediate matching
  const triggerImmediateMatching = useCallback(async (type: 'daily' | 'optimization' = 'daily') => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await backgroundMatchingService.triggerImmediateMatching(type)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }
      
      // Refresh job history after triggering
      await getJobHistory()
      
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to trigger matching'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  // Get job history
  const getJobHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await backgroundMatchingService.getMatchingJobHistory()
      
      if (result.error) {
        setError(result.error)
        return
      }
      
      setJobHistory(result.jobs)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job history'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Get matching statistics
  const getMatchingStats = useCallback(async (days: number = 7) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await backgroundMatchingService.getMatchingStats(days)
      
      if (result.error) {
        setError(result.error)
        return
      }
      
      setMatchingStats(result.stats)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch matching stats'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initialize schedules
  const initializeSchedules = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await backgroundMatchingService.initializeSchedules()
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }
      
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize schedules'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    loading,
    error,
    jobHistory,
    matchingStats,
    
    // Actions
    triggerImmediateMatching,
    getJobHistory,
    getMatchingStats,
    initializeSchedules,
    
    // Utilities
    clearError
  }
}
