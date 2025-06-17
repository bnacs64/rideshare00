import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AutoMatchTriggerRequest {
  type: 'opt_in_created' | 'scheduled_check' | 'manual_trigger'
  optInId?: string
  date?: string
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
    const { type, optInId, date }: AutoMatchTriggerRequest = await req.json()

    console.log(`Auto-match trigger: ${type}`, { optInId, date })

    let results = []

    switch (type) {
      case 'opt_in_created':
        if (!optInId) {
          return new Response(
            JSON.stringify({ error: 'optInId is required for opt_in_created trigger' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Try to find matches for the newly created opt-in
        const matchResult = await triggerMatchingForOptIn(optInId)
        results.push(matchResult)
        break

      case 'scheduled_check':
        // Run matching for today and tomorrow
        const today = new Date().toISOString().split('T')[0]
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        const todayResult = await triggerDailyMatching(today)
        const tomorrowResult = await triggerDailyMatching(tomorrow)
        
        results.push({ date: today, ...todayResult })
        results.push({ date: tomorrow, ...tomorrowResult })
        break

      case 'manual_trigger':
        const targetDate = date || new Date().toISOString().split('T')[0]
        const manualResult = await triggerDailyMatching(targetDate)
        results.push({ date: targetDate, ...manualResult })
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid trigger type' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    return new Response(
      JSON.stringify({
        success: true,
        type,
        results,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in auto-match-trigger function:', error)
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

async function triggerMatchingForOptIn(optInId: string) {
  try {
    console.log(`Triggering matching for opt-in: ${optInId}`)

    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/match-rides`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetOptInId: optInId,
        forceMatch: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Match-rides function failed: ${errorText}`)
    }

    const result = await response.json()
    
    return {
      optInId,
      success: result.success,
      matchesFound: result.matches?.length || 0,
      goodMatches: result.goodMatches || 0,
      ridesCreated: result.ridesCreated || 0
    }

  } catch (error) {
    console.error(`Error triggering matching for opt-in ${optInId}:`, error)
    return {
      optInId,
      success: false,
      error: error.message
    }
  }
}

async function triggerDailyMatching(date: string) {
  try {
    console.log(`Triggering daily matching for date: ${date}`)

    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/daily-matching`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date,
        dryRun: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Daily-matching function failed: ${errorText}`)
    }

    const result = await response.json()
    
    return {
      success: true,
      totalOptIns: result.totalOptIns || 0,
      optInsProcessed: result.optInsProcessed || 0,
      matchesCreated: result.matchesCreated || 0,
      statusCounts: result.statusCounts || {}
    }

  } catch (error) {
    console.error(`Error triggering daily matching for ${date}:`, error)
    return {
      success: false,
      error: error.message
    }
  }
}

/* Database Trigger Setup:
 * 
 * To automatically trigger matching when a new opt-in is created,
 * add this trigger to your Supabase database:
 * 
 * CREATE OR REPLACE FUNCTION trigger_auto_matching()
 * RETURNS TRIGGER AS $$
 * BEGIN
 *   -- Only trigger for new opt-ins with PENDING_MATCH status
 *   IF NEW.status = 'PENDING_MATCH' THEN
 *     -- Call the Edge Function asynchronously
 *     PERFORM net.http_post(
 *       url := 'https://your-project.supabase.co/functions/v1/auto-match-trigger',
 *       headers := jsonb_build_object(
 *         'Content-Type', 'application/json',
 *         'Authorization', 'Bearer ' || 'YOUR_SERVICE_ROLE_KEY'
 *       ),
 *       body := jsonb_build_object(
 *         'type', 'opt_in_created',
 *         'optInId', NEW.id::text
 *       )
 *     );
 *   END IF;
 *   
 *   RETURN NEW;
 * END;
 * $$ LANGUAGE plpgsql;
 * 
 * CREATE TRIGGER auto_match_on_opt_in_created
 *   AFTER INSERT ON daily_opt_ins
 *   FOR EACH ROW
 *   EXECUTE FUNCTION trigger_auto_matching();
 * 
 * For scheduled matching, set up a cron job:
 * 
 * SELECT cron.schedule(
 *   'daily-matching-morning',
 *   '0 6 * * *', -- Every day at 6 AM
 *   $$
 *   SELECT net.http_post(
 *     url := 'https://your-project.supabase.co/functions/v1/auto-match-trigger',
 *     headers := jsonb_build_object(
 *       'Content-Type', 'application/json',
 *       'Authorization', 'Bearer ' || 'YOUR_SERVICE_ROLE_KEY'
 *     ),
 *     body := jsonb_build_object(
 *       'type', 'scheduled_check'
 *     )
 *   );
 *   $$
 * );
 */
