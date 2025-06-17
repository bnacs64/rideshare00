import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScheduledOptInRequest {
  date?: string // YYYY-MM-DD format, defaults to tomorrow
  dryRun?: boolean // If true, only return what would be created without creating
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
      date = getNextBusinessDay(), 
      dryRun = false 
    }: ScheduledOptInRequest = body

    console.log(`Processing scheduled opt-ins for date: ${date}, dryRun: ${dryRun}`)

    // Get the day of week for the target date
    const targetDate = new Date(date)
    const dayOfWeek = getDayOfWeek(targetDate)

    console.log(`Target day of week: ${dayOfWeek}`)

    // Get all active scheduled opt-ins for this day of week
    const { data: scheduledOptIns, error: scheduledError } = await supabaseClient
      .from('scheduled_opt_ins')
      .select(`
        *,
        pickup_locations (*),
        users (*)
      `)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)

    if (scheduledError) {
      console.error('Error fetching scheduled opt-ins:', scheduledError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch scheduled opt-ins',
          details: scheduledError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!scheduledOptIns || scheduledOptIns.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: `No scheduled opt-ins found for ${dayOfWeek}`,
          totalScheduled: 0,
          created: 0,
          skipped: 0,
          errors: []
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${scheduledOptIns.length} scheduled opt-ins for ${dayOfWeek}`)

    let created = 0
    let skipped = 0
    const errors: string[] = []
    const createdOptIns: any[] = []

    // Process each scheduled opt-in
    for (const scheduledOptIn of scheduledOptIns) {
      try {
        // Check if user already has an opt-in for this date
        const { data: existingOptIn, error: checkError } = await supabaseClient
          .from('daily_opt_ins')
          .select('id')
          .eq('user_id', scheduledOptIn.user_id)
          .eq('commute_date', date)
          .single()

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error(`Error checking existing opt-in for user ${scheduledOptIn.user_id}:`, checkError)
          errors.push(`Failed to check existing opt-in for user ${scheduledOptIn.users?.full_name || scheduledOptIn.user_id}`)
          continue
        }

        if (existingOptIn) {
          console.log(`User ${scheduledOptIn.user_id} already has opt-in for ${date}, skipping`)
          skipped++
          continue
        }

        // Calculate time window (1 hour window starting from scheduled time)
        const startTime = scheduledOptIn.start_time
        const endTime = addHourToTime(startTime)

        const dailyOptInData = {
          user_id: scheduledOptIn.user_id,
          commute_date: date,
          time_window_start: startTime,
          time_window_end: endTime,
          pickup_location_id: scheduledOptIn.pickup_location_id,
          is_automatic: true,
          status: 'PENDING_MATCH'
        }

        if (dryRun) {
          createdOptIns.push({
            ...dailyOptInData,
            user_name: scheduledOptIn.users?.full_name,
            pickup_location_name: scheduledOptIn.pickup_locations?.name
          })
          created++
        } else {
          // Create the daily opt-in
          const { data: newOptIn, error: createError } = await supabaseClient
            .from('daily_opt_ins')
            .insert(dailyOptInData)
            .select()
            .single()

          if (createError) {
            console.error(`Error creating daily opt-in for user ${scheduledOptIn.user_id}:`, createError)
            errors.push(`Failed to create opt-in for user ${scheduledOptIn.users?.full_name || scheduledOptIn.user_id}`)
            continue
          }

          console.log(`Created daily opt-in ${newOptIn.id} for user ${scheduledOptIn.user_id}`)
          createdOptIns.push(newOptIn)
          created++

          // Trigger automatic matching for the new opt-in (async, don't wait)
          try {
            const matchResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/auto-match-trigger`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'opt_in_created',
                optInId: newOptIn.id
              })
            })

            if (!matchResponse.ok) {
              console.warn(`Failed to trigger auto-matching for opt-in ${newOptIn.id}`)
            }
          } catch (matchError) {
            console.warn(`Error triggering auto-matching for opt-in ${newOptIn.id}:`, matchError)
          }
        }

      } catch (error) {
        console.error(`Error processing scheduled opt-in ${scheduledOptIn.id}:`, error)
        errors.push(`Failed to process scheduled opt-in for user ${scheduledOptIn.users?.full_name || scheduledOptIn.user_id}`)
      }
    }

    const result = {
      success: true,
      date,
      dayOfWeek,
      totalScheduled: scheduledOptIns.length,
      created,
      skipped,
      errors,
      ...(dryRun && { preview: createdOptIns })
    }

    console.log('Scheduled opt-ins processing completed:', result)

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in scheduled-opt-ins function:', error)
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

// Helper functions
function getNextBusinessDay(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  // Skip weekends (Saturday = 6, Sunday = 0)
  while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
    tomorrow.setDate(tomorrow.getDate() + 1)
  }
  
  return tomorrow.toISOString().split('T')[0]
}

function getDayOfWeek(date: Date): string {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
  return days[date.getDay()]
}

function addHourToTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const newHours = (hours + 1) % 24
  return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}
