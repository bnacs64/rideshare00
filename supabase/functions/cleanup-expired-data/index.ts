import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CleanupRequest {
  dryRun?: boolean
  daysToKeep?: number
}

interface CleanupResult {
  success: boolean
  cleaned: {
    expired_opt_ins: number
    old_rides: number
    cancelled_rides: number
    orphaned_participants: number
  }
  errors: string[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const body = await req.json().catch(() => ({}))
    const { 
      dryRun = false, 
      daysToKeep = 30 
    }: CleanupRequest = body

    console.log(`Starting cleanup process: dryRun=${dryRun}, daysToKeep=${daysToKeep}`)

    const result: CleanupResult = {
      success: true,
      cleaned: {
        expired_opt_ins: 0,
        old_rides: 0,
        cancelled_rides: 0,
        orphaned_participants: 0
      },
      errors: []
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    console.log(`Cleanup cutoff date: ${cutoffDateStr}`)

    // 1. Clean up expired daily opt-ins
    try {
      const expiredOptInsQuery = supabaseClient
        .from('daily_opt_ins')
        .select('id')
        .lt('commute_date', cutoffDateStr)
        .in('status', ['PENDING_MATCH', 'CANCELLED'])

      if (dryRun) {
        const { data: expiredOptIns, error } = await expiredOptInsQuery
        if (error) throw error
        result.cleaned.expired_opt_ins = expiredOptIns?.length || 0
      } else {
        const { data: expiredOptIns, error: selectError } = await expiredOptInsQuery
        if (selectError) throw selectError

        if (expiredOptIns && expiredOptIns.length > 0) {
          const { error: deleteError } = await supabaseClient
            .from('daily_opt_ins')
            .delete()
            .in('id', expiredOptIns.map(opt => opt.id))

          if (deleteError) throw deleteError
          result.cleaned.expired_opt_ins = expiredOptIns.length
        }
      }

      console.log(`Expired opt-ins to clean: ${result.cleaned.expired_opt_ins}`)
    } catch (error) {
      console.error('Error cleaning expired opt-ins:', error)
      result.errors.push(`Failed to clean expired opt-ins: ${error.message}`)
    }

    // 2. Clean up old completed/cancelled rides
    try {
      const oldRidesQuery = supabaseClient
        .from('matched_rides')
        .select('id')
        .lt('commute_date', cutoffDateStr)
        .in('status', ['COMPLETED', 'CANCELLED'])

      if (dryRun) {
        const { data: oldRides, error } = await oldRidesQuery
        if (error) throw error
        result.cleaned.old_rides = oldRides?.length || 0
      } else {
        const { data: oldRides, error: selectError } = await oldRidesQuery
        if (selectError) throw selectError

        if (oldRides && oldRides.length > 0) {
          // First delete ride participants
          const { error: participantsError } = await supabaseClient
            .from('ride_participants')
            .delete()
            .in('matched_ride_id', oldRides.map(ride => ride.id))

          if (participantsError) throw participantsError

          // Then delete the rides
          const { error: ridesError } = await supabaseClient
            .from('matched_rides')
            .delete()
            .in('id', oldRides.map(ride => ride.id))

          if (ridesError) throw ridesError
          result.cleaned.old_rides = oldRides.length
        }
      }

      console.log(`Old rides to clean: ${result.cleaned.old_rides}`)
    } catch (error) {
      console.error('Error cleaning old rides:', error)
      result.errors.push(`Failed to clean old rides: ${error.message}`)
    }

    // 3. Clean up cancelled rides older than 7 days
    try {
      const recentCutoff = new Date()
      recentCutoff.setDate(recentCutoff.getDate() - 7)
      const recentCutoffStr = recentCutoff.toISOString().split('T')[0]

      const cancelledRidesQuery = supabaseClient
        .from('matched_rides')
        .select('id')
        .lt('commute_date', recentCutoffStr)
        .eq('status', 'CANCELLED')

      if (dryRun) {
        const { data: cancelledRides, error } = await cancelledRidesQuery
        if (error) throw error
        result.cleaned.cancelled_rides = cancelledRides?.length || 0
      } else {
        const { data: cancelledRides, error: selectError } = await cancelledRidesQuery
        if (selectError) throw selectError

        if (cancelledRides && cancelledRides.length > 0) {
          // First delete ride participants
          const { error: participantsError } = await supabaseClient
            .from('ride_participants')
            .delete()
            .in('matched_ride_id', cancelledRides.map(ride => ride.id))

          if (participantsError) throw participantsError

          // Then delete the rides
          const { error: ridesError } = await supabaseClient
            .from('matched_rides')
            .delete()
            .in('id', cancelledRides.map(ride => ride.id))

          if (ridesError) throw ridesError
          result.cleaned.cancelled_rides = cancelledRides.length
        }
      }

      console.log(`Cancelled rides to clean: ${result.cleaned.cancelled_rides}`)
    } catch (error) {
      console.error('Error cleaning cancelled rides:', error)
      result.errors.push(`Failed to clean cancelled rides: ${error.message}`)
    }

    // 4. Clean up orphaned ride participants
    try {
      const orphanedParticipantsQuery = supabaseClient
        .from('ride_participants')
        .select(`
          id,
          matched_ride_id,
          matched_rides!inner (id)
        `)
        .is('matched_rides.id', null)

      if (dryRun) {
        const { data: orphanedParticipants, error } = await orphanedParticipantsQuery
        if (error) throw error
        result.cleaned.orphaned_participants = orphanedParticipants?.length || 0
      } else {
        const { data: orphanedParticipants, error: selectError } = await orphanedParticipantsQuery
        if (selectError) throw selectError

        if (orphanedParticipants && orphanedParticipants.length > 0) {
          const { error: deleteError } = await supabaseClient
            .from('ride_participants')
            .delete()
            .in('id', orphanedParticipants.map(p => p.id))

          if (deleteError) throw deleteError
          result.cleaned.orphaned_participants = orphanedParticipants.length
        }
      }

      console.log(`Orphaned participants to clean: ${result.cleaned.orphaned_participants}`)
    } catch (error) {
      console.error('Error cleaning orphaned participants:', error)
      result.errors.push(`Failed to clean orphaned participants: ${error.message}`)
    }

    // Set success to false if there were any errors
    if (result.errors.length > 0) {
      result.success = false
    }

    console.log('Cleanup completed:', result)

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in cleanup-expired-data function:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
