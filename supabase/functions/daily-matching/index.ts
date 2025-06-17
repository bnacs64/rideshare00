import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DailyMatchingRequest {
  date?: string // YYYY-MM-DD format, defaults to today
  dryRun?: boolean // If true, only return potential matches without creating rides
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
      date = new Date().toISOString().split('T')[0], 
      dryRun = false 
    }: DailyMatchingRequest = body

    console.log(`Running daily matching for date: ${date}, dryRun: ${dryRun}`)

    // Get all pending opt-ins for the date
    const { data: optIns, error: optInsError } = await supabaseClient
      .from('daily_opt_ins')
      .select(`
        *,
        pickup_locations (*),
        users (*)
      `)
      .eq('commute_date', date)
      .eq('status', 'PENDING_MATCH')
      .order('created_at', { ascending: true })

    if (optInsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch opt-ins', details: optInsError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!optIns || optIns.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No pending opt-ins found for the specified date',
          date,
          optInsProcessed: 0,
          matchesCreated: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${optIns.length} pending opt-ins for ${date}`)

    let matchesCreated = 0
    let optInsProcessed = 0
    const processedOptIns = new Set<string>()
    const matchingResults = []

    // Process each opt-in that hasn't been processed yet
    for (const optIn of optIns) {
      if (processedOptIns.has(optIn.id)) {
        continue
      }

      try {
        console.log(`Processing opt-in ${optIn.id} for user ${optIn.users.full_name}`)

        // Call the match-rides function for this opt-in
        const matchResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/match-rides`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            targetOptInId: optIn.id,
            forceMatch: false
          })
        })

        if (!matchResponse.ok) {
          console.error(`Failed to get matches for opt-in ${optIn.id}:`, await matchResponse.text())
          continue
        }

        const matchResult = await matchResponse.json()
        
        if (matchResult.success && matchResult.ridesCreated > 0) {
          matchesCreated += matchResult.ridesCreated
          
          // Mark all participants in the created rides as processed
          if (matchResult.rides) {
            for (const ride of matchResult.rides) {
              // Get participants for this ride
              const { data: participants } = await supabaseClient
                .from('ride_participants')
                .select('daily_opt_in_id')
                .eq('matched_ride_id', ride.id)
              
              if (participants) {
                participants.forEach(p => processedOptIns.add(p.daily_opt_in_id))
              }
            }
          }
        }

        matchingResults.push({
          optInId: optIn.id,
          userId: optIn.user_id,
          userName: optIn.users.full_name,
          matchesFound: matchResult.matches?.length || 0,
          goodMatches: matchResult.goodMatches || 0,
          ridesCreated: matchResult.ridesCreated || 0
        })

        optInsProcessed++

      } catch (error) {
        console.error(`Error processing opt-in ${optIn.id}:`, error)
        matchingResults.push({
          optInId: optIn.id,
          userId: optIn.user_id,
          userName: optIn.users?.full_name || 'Unknown',
          error: error.message
        })
      }
    }

    // Get summary statistics
    const { data: finalOptIns } = await supabaseClient
      .from('daily_opt_ins')
      .select('status')
      .eq('commute_date', date)

    const statusCounts = finalOptIns?.reduce((acc, opt) => {
      acc[opt.status] = (acc[opt.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const summary = {
      date,
      dryRun,
      totalOptIns: optIns.length,
      optInsProcessed,
      matchesCreated,
      statusCounts,
      processingResults: matchingResults,
      timestamp: new Date().toISOString()
    }

    console.log('Daily matching completed:', summary)

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in daily-matching function:', error)
    return new Response(
      JSON.stringify({ 
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

/* To deploy these functions, run:
 * 
 * supabase functions deploy match-rides
 * supabase functions deploy daily-matching
 * 
 * To test locally:
 * supabase functions serve
 * 
 * To invoke:
 * curl -X POST 'http://localhost:54321/functions/v1/daily-matching' \
 *   -H 'Authorization: Bearer YOUR_ANON_KEY' \
 *   -H 'Content-Type: application/json' \
 *   -d '{"date": "2024-01-15", "dryRun": true}'
 */
