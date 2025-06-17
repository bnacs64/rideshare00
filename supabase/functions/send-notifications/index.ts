import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  ride_id: string
  type: 'MATCH' | 'CONFIRMATION' | 'REMINDER' | 'CANCELLATION'
  cancellation_reason?: string
}

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
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
    const { ride_id, type, cancellation_reason }: NotificationRequest = await req.json()

    console.log(`Processing notification request: ${type} for ride ${ride_id}`)

    // Get ride details with participants
    const { data: ride, error: rideError } = await supabaseClient
      .from('matched_rides')
      .select(`
        id,
        commute_date,
        driver_user_id,
        estimated_cost_per_person,
        estimated_total_time,
        route_optimization_data,
        status,
        users!matched_rides_driver_user_id_fkey (
          id,
          full_name,
          telegram_user_id,
          phone
        )
      `)
      .eq('id', ride_id)
      .single()

    if (rideError || !ride) {
      console.error('Error fetching ride:', rideError)
      return new Response(
        JSON.stringify({ 
          error: 'Ride not found',
          details: rideError?.message 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get ride participants
    const { data: participants, error: participantsError } = await supabaseClient
      .from('ride_participants')
      .select(`
        user_id,
        status,
        users (
          id,
          full_name,
          telegram_user_id,
          email
        )
      `)
      .eq('matched_ride_id', ride_id)

    if (participantsError) {
      console.error('Error fetching participants:', participantsError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch participants',
          details: participantsError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Add driver to participants if not already included
    const driverInParticipants = participants?.some(p => p.user_id === ride.driver_user_id)
    if (!driverInParticipants && ride.users) {
      participants?.push({
        user_id: ride.driver_user_id,
        status: 'CONFIRMED', // Driver is automatically confirmed
        users: {
          id: ride.users.id,
          full_name: ride.users.full_name,
          telegram_user_id: ride.users.telegram_user_id,
          email: null
        }
      })
    }

    if (!participants || participants.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No participants found for this ride' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send notifications based on type
    const results = await sendNotifications(ride, participants, type, cancellation_reason)

    return new Response(
      JSON.stringify({
        success: true,
        ride_id,
        type,
        sent_count: results.sent_count,
        failed_count: results.failed_count,
        errors: results.errors
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-notifications function:', error)
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

async function sendNotifications(
  ride: any,
  participants: any[],
  type: string,
  cancellationReason?: string
) {
  const results = {
    sent_count: 0,
    failed_count: 0,
    errors: [] as string[]
  }

  const driver = ride.users
  const pickupTime = '8:00 AM' // This should be calculated from route data
  const pickupLocation = 'Pickup Location' // This should be extracted from route data

  for (const participant of participants) {
    const user = participant.users
    
    if (!user.telegram_user_id) {
      results.failed_count++
      results.errors.push(`No Telegram ID for ${user.full_name}`)
      continue
    }

    try {
      let message = ''
      let keyboard = null

      switch (type) {
        case 'MATCH':
          const otherParticipants = participants
            .filter(p => p.user_id !== participant.user_id)
            .map(p => p.users.full_name)

          message = `
🚗 <b>Ride Match Found!</b>

<b>Driver:</b> ${driver.full_name}
<b>Pickup Time:</b> ${pickupTime}
<b>Pickup Location:</b> ${pickupLocation}
<b>Cost per Person:</b> ৳${ride.estimated_cost_per_person}
<b>Other Riders:</b> ${otherParticipants.join(', ')}

Please confirm your participation within 30 minutes.
          `.trim()

          keyboard = {
            inline_keyboard: [[
              { text: '✅ Accept Ride', callback_data: `accept_ride_${ride.id}` },
              { text: '❌ Decline Ride', callback_data: `decline_ride_${ride.id}` }
            ]]
          }
          break

        case 'CONFIRMATION':
          const confirmedParticipants = participants
            .filter(p => p.user_id !== participant.user_id)
            .map(p => p.users.full_name)

          message = `
✅ <b>Ride Confirmed!</b>

<b>Driver:</b> ${driver.full_name}
${driver.phone ? `<b>Driver Phone:</b> ${driver.phone}` : ''}
<b>Pickup Time:</b> ${pickupTime}
<b>Pickup Location:</b> ${pickupLocation}
<b>Fellow Riders:</b> ${confirmedParticipants.join(', ')}

Please be ready at the pickup location 5 minutes before the scheduled time.
          `.trim()
          break

        case 'REMINDER':
          message = `
⏰ <b>Pickup Reminder</b>

Your ride with ${driver.full_name} is in 15 minutes!

<b>Pickup Time:</b> ${pickupTime}
<b>Pickup Location:</b> ${pickupLocation}

Please be ready at the pickup location.
          `.trim()
          break

        case 'CANCELLATION':
          message = `
❌ <b>Ride Cancelled</b>

Your ride scheduled for ${pickupTime} has been cancelled.

<b>Reason:</b> ${cancellationReason || 'Ride cancelled'}

You can create a new opt-in for alternative transportation.
          `.trim()
          break

        default:
          results.failed_count++
          results.errors.push(`Unknown notification type: ${type}`)
          continue
      }

      const success = await sendTelegramMessage(user.telegram_user_id, message, keyboard)
      
      if (success) {
        results.sent_count++
      } else {
        results.failed_count++
        results.errors.push(`Failed to send Telegram message to ${user.full_name}`)
      }

    } catch (error) {
      results.failed_count++
      results.errors.push(`Error notifying ${user.full_name}: ${error.message}`)
    }
  }

  return results
}

async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyMarkup?: any
): Promise<boolean> {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not configured')
    return false
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Telegram API error:', errorData)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending Telegram message:', error)
    return false
  }
}
