import { supabase } from './supabase'
import { geminiService, type MatchingRequest, type MatchingResult } from './geminiService'
import { optInService } from './optInService'

export interface MatchedRide {
  id: string
  commute_date: string
  status: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  driver_user_id: string
  estimated_cost_per_person: number
  estimated_total_time: number
  pickup_order: string[] // Array of pickup location IDs
  route_optimization_data: any
  ai_confidence_score: number
  ai_reasoning: string
  created_at: string
  updated_at: string
}

export interface RideParticipant {
  id: string
  matched_ride_id: string
  user_id: string
  daily_opt_in_id: string
  pickup_location_id: string
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'NO_RESPONSE'
  confirmation_deadline: string
  created_at: string
  updated_at: string
}

export const matchingService = {
  /**
   * Find matches for a specific opt-in
   */
  async findMatches(optInId: string): Promise<{ matches: MatchingResult['matches']; error?: string }> {
    try {
      // Get the target opt-in with full details
      const { optIn: targetOptIn, error: targetError } = await optInService.getDailyOptIn(optInId)
      
      if (targetError || !targetOptIn) {
        return { matches: [], error: 'Target opt-in not found' }
      }

      // Get available opt-ins for the same date (excluding the target)
      const { optIns: availableOptIns, error: availableError } = await optInService.getDailyOptIns(
        targetOptIn.user_id, 
        {
          startDate: targetOptIn.commute_date,
          endDate: targetOptIn.commute_date,
          status: 'PENDING_MATCH'
        }
      )

      if (availableError) {
        return { matches: [], error: 'Failed to fetch available opt-ins' }
      }

      // Filter out the target opt-in and get other users' opt-ins
      const otherOptIns = availableOptIns.filter(opt => 
        opt.id !== optInId && opt.user_id !== targetOptIn.user_id
      )

      if (otherOptIns.length === 0) {
        return { matches: [], error: 'No other opt-ins available for matching' }
      }

      // Get user details for all opt-ins
      const enrichedOptIns = await this.enrichOptInsWithUserData([targetOptIn, ...otherOptIns])
      const enrichedTarget = enrichedOptIns.find(opt => opt.id === optInId)
      const enrichedAvailable = enrichedOptIns.filter(opt => opt.id !== optInId)

      if (!enrichedTarget) {
        return { matches: [], error: 'Failed to enrich target opt-in data' }
      }

      // Prepare matching request for Gemini
      const matchingRequest: MatchingRequest = {
        targetOptIn: enrichedTarget,
        availableOptIns: enrichedAvailable,
        nsuLocation: [90.4125, 23.8103] // NSU coordinates
      }

      // Get matches from Gemini AI
      const result = await geminiService.generateMatches(matchingRequest)
      
      if (!result.success) {
        return { matches: [], error: result.error }
      }

      return { matches: result.matches }
    } catch (error) {
      console.error('Error in findMatches:', error)
      return { 
        matches: [], 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  },

  /**
   * Create a matched ride from AI results
   */
  async createMatchedRide(match: MatchingResult['matches'][0], commuteDate: string): Promise<{ ride: MatchedRide | null; error?: string }> {
    try {
      // Find the driver participant
      const driverParticipant = match.participants.find(p => p.role === 'DRIVER')
      if (!driverParticipant) {
        return { ride: null, error: 'No driver found in match' }
      }

      // Create the matched ride
      const { data: ride, error: rideError } = await supabase
        .from('matched_rides')
        .insert({
          commute_date: commuteDate,
          status: 'PENDING_CONFIRMATION',
          driver_user_id: driverParticipant.user_id,
          estimated_cost_per_person: match.route_optimization.estimated_cost_per_person,
          estimated_total_time: match.route_optimization.estimated_total_time,
          pickup_order: match.route_optimization.pickup_order,
          route_optimization_data: match.route_optimization,
          ai_confidence_score: match.confidence,
          ai_reasoning: match.reasoning
        })
        .select()
        .single()

      if (rideError) {
        console.error('Error creating matched ride:', rideError)
        return { ride: null, error: 'Failed to create matched ride' }
      }

      // Create ride participants
      const participantInserts = match.participants.map(participant => ({
        matched_ride_id: ride.id,
        user_id: participant.user_id,
        daily_opt_in_id: participant.opt_in_id,
        pickup_location_id: participant.pickup_location.id,
        status: 'PENDING',
        confirmation_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      }))

      const { error: participantsError } = await supabase
        .from('ride_participants')
        .insert(participantInserts)

      if (participantsError) {
        console.error('Error creating ride participants:', participantsError)
        // Rollback the ride creation
        await supabase.from('matched_rides').delete().eq('id', ride.id)
        return { ride: null, error: 'Failed to create ride participants' }
      }

      // Update opt-in statuses to MATCHED
      const optInIds = match.participants.map(p => p.opt_in_id)
      const { error: updateError } = await supabase
        .from('daily_opt_ins')
        .update({ status: 'MATCHED' })
        .in('id', optInIds)

      if (updateError) {
        console.error('Error updating opt-in statuses:', updateError)
        // Note: We don't rollback here as the ride is created, just log the error
      }

      return { ride }
    } catch (error) {
      console.error('Error in createMatchedRide:', error)
      return { 
        ride: null, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  },

  /**
   * Get matched rides for a user
   */
  async getUserMatchedRides(userId: string, options?: {
    status?: string
    startDate?: string
    endDate?: string
  }): Promise<{ rides: any[]; error?: string }> {
    try {
      let query = supabase
        .from('matched_rides')
        .select(`
          *,
          ride_participants!inner (
            *,
            users (
              id,
              full_name,
              default_role
            ),
            pickup_locations (
              id,
              name,
              description,
              coords
            ),
            daily_opt_ins (
              id,
              time_window_start,
              time_window_end
            )
          )
        `)
        .eq('ride_participants.user_id', userId)
        .order('commute_date', { ascending: false })

      if (options?.status) {
        query = query.eq('status', options.status)
      }

      if (options?.startDate) {
        query = query.gte('commute_date', options.startDate)
      }

      if (options?.endDate) {
        query = query.lte('commute_date', options.endDate)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching user matched rides:', error)
        return { rides: [], error: 'Failed to fetch matched rides' }
      }

      return { rides: data || [] }
    } catch (error) {
      console.error('Error in getUserMatchedRides:', error)
      return { 
        rides: [], 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  },

  /**
   * Confirm or decline participation in a matched ride
   */
  async updateParticipationStatus(
    rideId: string, 
    userId: string, 
    status: 'CONFIRMED' | 'DECLINED'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('ride_participants')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('matched_ride_id', rideId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error updating participation status:', error)
        return { success: false, error: 'Failed to update participation status' }
      }

      // Check if all participants have responded
      await this.checkRideConfirmationStatus(rideId)

      return { success: true }
    } catch (error) {
      console.error('Error in updateParticipationStatus:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  },

  /**
   * Check and update ride confirmation status
   */
  async checkRideConfirmationStatus(rideId: string): Promise<void> {
    try {
      // Get all participants for this ride
      const { data: participants, error } = await supabase
        .from('ride_participants')
        .select('status')
        .eq('matched_ride_id', rideId)

      if (error || !participants) {
        console.error('Error fetching ride participants:', error)
        return
      }

      const allConfirmed = participants.every(p => p.status === 'CONFIRMED')
      const anyDeclined = participants.some(p => p.status === 'DECLINED')

      let newStatus: string | null = null

      if (anyDeclined) {
        newStatus = 'CANCELLED'
      } else if (allConfirmed) {
        newStatus = 'CONFIRMED'
      }

      if (newStatus) {
        await supabase
          .from('matched_rides')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', rideId)
      }
    } catch (error) {
      console.error('Error in checkRideConfirmationStatus:', error)
    }
  },

  /**
   * Enrich opt-ins with user data
   */
  async enrichOptInsWithUserData(optIns: any[]): Promise<any[]> {
    try {
      const userIds = [...new Set(optIns.map(opt => opt.user_id))]
      
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds)

      if (error) {
        console.error('Error fetching user data:', error)
        return optIns
      }

      return optIns.map(optIn => {
        const user = users?.find(u => u.id === optIn.user_id)
        return {
          ...optIn,
          user: user || { id: optIn.user_id, full_name: 'Unknown User', default_role: 'RIDER' }
        }
      })
    } catch (error) {
      console.error('Error enriching opt-ins with user data:', error)
      return optIns
    }
  },

  /**
   * Run matching for all pending opt-ins for a specific date
   */
  async runDailyMatching(date: string): Promise<{ matchesCreated: number; error?: string }> {
    try {
      // Get all pending opt-ins for the date
      const { data: optIns, error } = await supabase
        .from('daily_opt_ins')
        .select(`
          *,
          pickup_locations (*),
          users (*)
        `)
        .eq('commute_date', date)
        .eq('status', 'PENDING_MATCH')

      if (error) {
        console.error('Error fetching opt-ins for daily matching:', error)
        return { matchesCreated: 0, error: 'Failed to fetch opt-ins' }
      }

      if (!optIns || optIns.length === 0) {
        return { matchesCreated: 0 }
      }

      let matchesCreated = 0
      const processedOptIns = new Set<string>()

      // Process each opt-in that hasn't been processed yet
      for (const optIn of optIns) {
        if (processedOptIns.has(optIn.id)) {
          continue
        }

        const { matches } = await this.findMatches(optIn.id)
        
        // Create rides for good matches (confidence > 70)
        for (const match of matches) {
          if (match.confidence > 70) {
            const { ride, error: createError } = await this.createMatchedRide(match, date)
            
            if (ride && !createError) {
              matchesCreated++
              // Mark all participants as processed
              match.participants.forEach(p => processedOptIns.add(p.opt_in_id))
            }
          }
        }
      }

      return { matchesCreated }
    } catch (error) {
      console.error('Error in runDailyMatching:', error)
      return { 
        matchesCreated: 0, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
}
