import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RetryRequest {
  date?: string // YYYY-MM-DD format, defaults to today
  dryRun?: boolean
  maxRetries?: number
}

interface RetryResult {
  success: boolean
  date: string
  processed: number
  matched: number
  failed: number
  errors: string[]
  details: Array<{
    opt_in_id: string
    user_name: string
    status: 'matched' | 'failed' | 'skipped'
    reason?: string
  }>
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
      dryRun = false,
      maxRetries = 3
    }: RetryRequest = body

    console.log(`Starting retry process for date: ${date}, dryRun: ${dryRun}, maxRetries: ${maxRetries}`)

    const result: RetryResult = {
      success: true,
      date,
      processed: 0,
      matched: 0,
      failed: 0,
      errors: [],
      details: []
    }

    // Get failed opt-ins that haven't exceeded max retries
    const { data: failedOptIns, error: fetchError } = await supabaseClient
      .from('daily_opt_ins')
      .select(`
        id,
        user_id,
        commute_date,
        retry_count,
        last_retry_at,
        users (
          full_name
        )
      `)
      .eq('commute_date', date)
      .eq('status', 'PENDING_MATCH')
      .lt('retry_count', maxRetries)

    if (fetchError) {
      console.error('Error fetching failed opt-ins:', fetchError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to fetch failed opt-ins',
          details: fetchError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!failedOptIns || failedOptIns.length === 0) {
      console.log('No failed opt-ins found for retry')
      return new Response(
        JSON.stringify({
          ...result,
          message: 'No failed opt-ins found for retry'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${failedOptIns.length} opt-ins to retry`)

    // Process each failed opt-in
    for (const optIn of failedOptIns) {
      result.processed++
      
      try {
        const userName = optIn.users?.full_name || 'Unknown User'
        
        // Check if enough time has passed since last retry (at least 1 hour)
        if (optIn.last_retry_at) {
          const lastRetry = new Date(optIn.last_retry_at)
          const now = new Date()
          const hoursSinceLastRetry = (now.getTime() - lastRetry.getTime()) / (1000 * 60 * 60)
          
          if (hoursSinceLastRetry < 1) {
            result.details.push({
              opt_in_id: optIn.id,
              user_name: userName,
              status: 'skipped',
              reason: 'Too soon since last retry'
            })
            continue
          }
        }

        if (dryRun) {
          result.details.push({
            opt_in_id: optIn.id,
            user_name: userName,
            status: 'matched',
            reason: 'Dry run - would retry matching'
          })
          result.matched++
          continue
        }

        // Update retry count and timestamp
        const { error: updateError } = await supabaseClient
          .from('daily_opt_ins')
          .update({
            retry_count: (optIn.retry_count || 0) + 1,
            last_retry_at: new Date().toISOString()
          })
          .eq('id', optIn.id)

        if (updateError) {
          console.error(`Error updating retry count for opt-in ${optIn.id}:`, updateError)
          result.errors.push(`Failed to update retry count for ${userName}`)
          result.failed++
          result.details.push({
            opt_in_id: optIn.id,
            user_name: userName,
            status: 'failed',
            reason: 'Failed to update retry count'
          })
          continue
        }

        // Trigger matching for this opt-in
        try {
          const matchResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/auto-match-trigger`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'retry_matching',
              optInId: optIn.id
            })
          })

          if (matchResponse.ok) {
            const matchResult = await matchResponse.json()
            
            if (matchResult.success) {
              result.matched++
              result.details.push({
                opt_in_id: optIn.id,
                user_name: userName,
                status: 'matched',
                reason: 'Successfully retried matching'
              })
            } else {
              result.failed++
              result.details.push({
                opt_in_id: optIn.id,
                user_name: userName,
                status: 'failed',
                reason: matchResult.error || 'Matching failed'
              })
            }
          } else {
            throw new Error(`HTTP ${matchResponse.status}: ${matchResponse.statusText}`)
          }

        } catch (matchError) {
          console.error(`Error triggering match for opt-in ${optIn.id}:`, matchError)
          result.failed++
          result.details.push({
            opt_in_id: optIn.id,
            user_name: userName,
            status: 'failed',
            reason: `Matching trigger failed: ${matchError.message}`
          })

          // If we've reached max retries, mark as cancelled permanently
          if ((optIn.retry_count || 0) + 1 >= maxRetries) {
            await supabaseClient
              .from('daily_opt_ins')
              .update({ status: 'CANCELLED' })
              .eq('id', optIn.id)
          }
        }

      } catch (error) {
        console.error(`Error processing opt-in ${optIn.id}:`, error)
        result.failed++
        result.errors.push(`Failed to process opt-in for ${optIn.users?.full_name || 'Unknown User'}`)
        result.details.push({
          opt_in_id: optIn.id,
          user_name: optIn.users?.full_name || 'Unknown User',
          status: 'failed',
          reason: error.message
        })
      }
    }

    // Set success to false if there were more failures than successes
    if (result.failed > result.matched) {
      result.success = false
    }

    console.log('Retry process completed:', result)

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in retry-failed-matches function:', error)
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
