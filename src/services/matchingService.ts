import { supabase } from './supabase'
import { geminiService, type MatchingRequest, type MatchingResult } from './geminiService'
import { optInService } from './optInService'
import { uberService } from './uberService'
import { googleMapsService } from './googleMapsService'
import { notificationService } from './notificationService'
import type { UberRouteData } from '../types'

export interface MatchedRide {
  id: string
  commute_date: string
  status: 'PROPOSED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
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
  status: 'PENDING_ACCEPTANCE' | 'CONFIRMED' | 'DECLINED' | 'NO_RESPONSE'
  confirmation_deadline: string
  created_at: string
  updated_at: string
}

export const matchingService = {
  /**
   * Find matches for a specific opt-in using Edge Function
   */
  async findMatches(optInId: string): Promise<{ matches: MatchingResult['matches']; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        return { matches: [], error: 'User not authenticated' }
      }

      const { data, error } = await supabase.functions.invoke('match-rides', {
        body: {
          targetOptInId: optInId,
          forceMatch: false
        }
      })

      if (error) {
        console.error('Error calling match-rides function:', error)
        return { matches: [], error: error.message }
      }

      if (!data.success) {
        return { matches: [], error: data.error || 'Matching failed' }
      }

      // Backend returns additional fields: goodMatches, ridesCreated, rides
      console.log(`Matching completed: ${data.goodMatches || 0} good matches, ${data.ridesCreated || 0} rides created`)

      return {
        matches: data.matches || [],
        goodMatches: data.goodMatches || 0,
        ridesCreated: data.ridesCreated || 0,
        createdRides: data.rides || []
      }
    } catch (error) {
      console.error('Error in findMatches:', error)
      return {
        matches: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  },

  /**
   * Find matches for a specific opt-in using local Gemini service (fallback)
   */
  async findMatchesLocal(optInId: string): Promise<{ matches: MatchingResult['matches']; error?: string }> {
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

      // Try Gemini AI first, fallback to local algorithm
      let result = await geminiService.generateMatches(matchingRequest)

      if (!result.success) {
        console.log('Gemini AI failed, falling back to local algorithm')
        result = await geminiService.generateMatchesLocal(matchingRequest)
      }

      if (!result.success) {
        return { matches: [], error: result.error }
      }

      return { matches: result.matches }
    } catch (error) {
      console.error('Error in findMatchesLocal:', error)
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

      // Use enhanced route optimization with APIs
      const { routeData, error: routeError } = await this.optimizeRouteWithAPIs(match)

      if (routeError) {
        console.warn('Route optimization warning:', routeError)
      }

      // Create the matched ride with optimized route data
      const { data: ride, error: rideError } = await supabase
        .from('matched_rides')
        .insert({
          commute_date: commuteDate,
          status: 'PROPOSED', // Align with backend status
          driver_user_id: driverParticipant.user_id,
          estimated_cost_per_person: Math.round(routeData.estimated_cost / match.participants.length),
          estimated_total_time: Math.round(routeData.duration / 60), // Convert seconds to minutes
          pickup_order: routeData.waypoints.map(wp => wp.user_id).filter(Boolean),
          route_optimization_data: routeData,
          ai_confidence_score: match.confidence / 100, // Convert to decimal for database
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
        status: 'PENDING_ACCEPTANCE', // Align with backend status
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

      // Send ride match notifications
      try {
        const notificationResult = await notificationService.sendNotificationsForRide(
          ride.id,
          'MATCH'
        )

        if (!notificationResult.success) {
          console.warn('Some notifications failed to send:', notificationResult.errors)
        } else {
          console.log(`Sent ${notificationResult.sent_count} ride match notifications`)
        }
      } catch (notificationError) {
        console.error('Error sending ride match notifications:', notificationError)
        // Don't fail the ride creation if notifications fail
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

        // Send appropriate notifications based on status
        try {
          if (newStatus === 'CONFIRMED') {
            const notificationResult = await notificationService.sendNotificationsForRide(
              rideId,
              'CONFIRMATION'
            )

            if (!notificationResult.success) {
              console.warn('Some confirmation notifications failed to send:', notificationResult.errors)
            } else {
              console.log(`Sent ${notificationResult.sent_count} ride confirmation notifications`)
            }
          } else if (newStatus === 'CANCELLED') {
            const notificationResult = await notificationService.sendNotificationsForRide(
              rideId,
              'CANCELLATION',
              'One or more participants declined the ride'
            )

            if (!notificationResult.success) {
              console.warn('Some cancellation notifications failed to send:', notificationResult.errors)
            } else {
              console.log(`Sent ${notificationResult.sent_count} ride cancellation notifications`)
            }
          }
        } catch (notificationError) {
          console.error('Error sending status change notifications:', notificationError)
        }
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
   * Run matching for all pending opt-ins for a specific date using Edge Function
   */
  async runDailyMatching(date: string): Promise<{ matchesCreated: number; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        return { matchesCreated: 0, error: 'User not authenticated' }
      }

      const { data, error } = await supabase.functions.invoke('daily-matching', {
        body: {
          date,
          dryRun: false
        }
      })

      if (error) {
        console.error('Error calling daily-matching function:', error)
        return { matchesCreated: 0, error: error.message }
      }

      return {
        matchesCreated: data.matchesCreated || 0,
        error: data.error
      }
    } catch (error) {
      console.error('Error in runDailyMatching:', error)
      return {
        matchesCreated: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  },

  /**
   * Run matching for all pending opt-ins for a specific date using local service (fallback)
   */
  async runDailyMatchingLocal(date: string): Promise<{ matchesCreated: number; error?: string }> {
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

        const { matches } = await this.findMatchesLocal(optIn.id)

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
      console.error('Error in runDailyMatchingLocal:', error)
      return {
        matchesCreated: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  },

  /**
   * Trigger automatic matching for a new opt-in
   */
  async triggerAutoMatching(optInId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data, error } = await supabase.functions.invoke('auto-match-trigger', {
        body: {
          type: 'opt_in_created',
          optInId
        }
      })

      if (error) {
        console.error('Error calling auto-match-trigger function:', error)
        return { success: false, error: error.message }
      }

      return { success: data.success || false, error: data.error }
    } catch (error) {
      console.error('Error in triggerAutoMatching:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  },

  /**
   * Enhanced route optimization using Uber API or Google Maps API
   */
  async optimizeRouteWithAPIs(match: MatchingResult['matches'][0]): Promise<{ routeData: UberRouteData; error?: string }> {
    try {
      // Extract pickup locations from match participants
      const pickupPoints = match.participants.map(participant => ({
        latitude: participant.pickup_location.coords[1], // lat
        longitude: participant.pickup_location.coords[0], // lng
        address: participant.pickup_location.name,
        user_id: participant.user_id
      }))

      // NSU coordinates as destination
      const nsuLocation = { latitude: 23.8103, longitude: 90.4125 }

      // Start from the driver's pickup location
      const driverParticipant = match.participants.find(p => p.role === 'DRIVER')
      if (!driverParticipant) {
        throw new Error('No driver found in match')
      }

      const startPoint = {
        latitude: driverParticipant.pickup_location.coords[1],
        longitude: driverParticipant.pickup_location.coords[0]
      }

      // Remove driver from pickup points (they're the starting point)
      const riderPickupPoints = pickupPoints.filter(p => p.user_id !== driverParticipant.user_id)

      let routeResult = null
      let error = null

      // Try Uber API first
      if (uberService.isConfigured()) {
        try {
          const uberResult = await uberService.optimizeRoute(
            startPoint,
            nsuLocation,
            riderPickupPoints
          )

          if (uberResult.result && !uberResult.error) {
            routeResult = uberResult.result
          } else {
            error = uberResult.error
          }
        } catch (uberError) {
          console.warn('Uber API failed, trying Google Maps:', uberError)
          error = uberError instanceof Error ? uberError.message : 'Uber API failed'
        }
      }

      // Fallback to Google Maps API
      if (!routeResult && googleMapsService.isConfigured()) {
        try {
          const googleResult = await googleMapsService.optimizePickupRoute(
            { lat: startPoint.latitude, lng: startPoint.longitude },
            { lat: nsuLocation.latitude, lng: nsuLocation.longitude },
            riderPickupPoints.map(p => ({
              lat: p.latitude,
              lng: p.longitude,
              address: p.address,
              user_id: p.user_id
            }))
          )

          if (googleResult.route && !googleResult.error) {
            // Convert Google Maps result to our UberRouteData format
            routeResult = {
              optimized_waypoints: googleResult.route.waypoints.map(wp => ({
                latitude: wp.location.lat,
                longitude: wp.location.lng,
                address: wp.address,
                user_id: wp.user_id,
                pickup_order: wp.order
              })),
              total_distance: googleResult.route.total_distance,
              total_duration: googleResult.route.total_duration,
              estimated_cost: googleResult.route.estimated_cost,
              cost_per_person: googleResult.route.cost_per_person,
              pickup_etas: googleResult.route.pickup_etas
            }
          } else {
            error = googleResult.error
          }
        } catch (googleError) {
          console.warn('Google Maps API failed:', googleError)
          error = googleError instanceof Error ? googleError.message : 'Google Maps API failed'
        }
      }

      // If both APIs failed, use the basic algorithm from geminiService
      if (!routeResult) {
        console.log('Both APIs failed, using basic algorithm')
        const basicResult = geminiService.calculateRouteData(match.participants, [90.4125, 23.8103])

        routeResult = {
          optimized_waypoints: [],
          total_distance: 0,
          total_duration: basicResult.estimated_total_time * 60, // convert minutes to seconds
          estimated_cost: basicResult.estimated_cost_per_person * match.participants.length,
          cost_per_person: basicResult.estimated_cost_per_person,
          pickup_etas: {}
        }
      }

      // Convert to UberRouteData format
      const uberRouteData: UberRouteData = {
        distance: routeResult.total_distance,
        duration: routeResult.total_duration,
        waypoints: routeResult.optimized_waypoints?.map(wp => ({
          latitude: wp.latitude,
          longitude: wp.longitude,
          address: wp.address,
          user_id: wp.user_id
        })) || [],
        estimated_cost: routeResult.estimated_cost,
        pickup_etas: routeResult.pickup_etas || {}
      }

      return { routeData: uberRouteData, error }

    } catch (error) {
      console.error('Error optimizing route with APIs:', error)

      // Fallback to basic calculation
      const basicResult = geminiService.calculateRouteData(match.participants, [90.4125, 23.8103])

      const fallbackRouteData: UberRouteData = {
        distance: 10000, // 10km default
        duration: basicResult.estimated_total_time * 60,
        waypoints: [],
        estimated_cost: basicResult.estimated_cost_per_person * match.participants.length,
        pickup_etas: {}
      }

      return {
        routeData: fallbackRouteData,
        error: error instanceof Error ? error.message : 'Route optimization failed'
      }
    }
  }
}
