import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { matchingService } from '../services/matchingService'
import { geminiService } from '../services/geminiService'
import type { MatchingResult } from '../services/geminiService'

interface UseMatchingReturn {
  // State
  loading: boolean
  error: string | null
  matches: MatchingResult['matches']
  matchedRides: any[]
  
  // Actions
  findMatches: (optInId: string) => Promise<{ success: boolean; matches?: MatchingResult['matches']; error?: string }>
  createRideFromMatch: (match: MatchingResult['matches'][0], commuteDate: string) => Promise<{ success: boolean; error?: string }>
  getUserRides: (options?: { status?: string; startDate?: string; endDate?: string }) => Promise<void>
  confirmParticipation: (rideId: string) => Promise<{ success: boolean; error?: string }>
  declineParticipation: (rideId: string) => Promise<{ success: boolean; error?: string }>
  testGeminiConnection: () => Promise<{ success: boolean; error?: string }>
  runDailyMatching: (date: string) => Promise<{ success: boolean; matchesCreated?: number; error?: string }>
  
  // Utilities
  clearError: () => void
  clearMatches: () => void
}

export const useMatching = (): UseMatchingReturn => {
  const { user } = useAuth()
  
  // State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matches, setMatches] = useState<MatchingResult['matches']>([])
  const [matchedRides, setMatchedRides] = useState<any[]>([])

  // Find matches for an opt-in
  const findMatches = useCallback(async (optInId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await matchingService.findMatches(optInId)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }
      
      setMatches(result.matches)
      return { success: true, matches: result.matches }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find matches'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  // Create a ride from a match
  const createRideFromMatch = useCallback(async (match: MatchingResult['matches'][0], commuteDate: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await matchingService.createMatchedRide(match, commuteDate)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }
      
      // Refresh user rides after creating a new one
      if (user) {
        await getUserRides()
      }
      
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create ride'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [user])

  // Get user's matched rides
  const getUserRides = useCallback(async (options?: { status?: string; startDate?: string; endDate?: string }) => {
    if (!user) return
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await matchingService.getUserMatchedRides(user.id, options)
      
      if (result.error) {
        setError(result.error)
        return
      }
      
      setMatchedRides(result.rides)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch rides'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Confirm participation in a ride
  const confirmParticipation = useCallback(async (rideId: string) => {
    if (!user) return { success: false, error: 'User not authenticated' }
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await matchingService.updateParticipationStatus(rideId, user.id, 'CONFIRMED')
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }
      
      // Refresh rides after confirmation
      await getUserRides()
      
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to confirm participation'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [user, getUserRides])

  // Decline participation in a ride
  const declineParticipation = useCallback(async (rideId: string) => {
    if (!user) return { success: false, error: 'User not authenticated' }
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await matchingService.updateParticipationStatus(rideId, user.id, 'DECLINED')
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }
      
      // Refresh rides after declining
      await getUserRides()
      
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decline participation'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [user, getUserRides])

  // Test Gemini connection
  const testGeminiConnection = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await geminiService.testConnection()
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }
      
      return { success: result.success }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test connection'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  // Run daily matching for a specific date
  const runDailyMatching = useCallback(async (date: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await matchingService.runDailyMatching(date)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }
      
      return { success: true, matchesCreated: result.matchesCreated }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run daily matching'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  // Utility functions
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearMatches = useCallback(() => {
    setMatches([])
  }, [])

  return {
    // State
    loading,
    error,
    matches,
    matchedRides,
    
    // Actions
    findMatches,
    createRideFromMatch,
    getUserRides,
    confirmParticipation,
    declineParticipation,
    testGeminiConnection,
    runDailyMatching,
    
    // Utilities
    clearError,
    clearMatches
  }
}
