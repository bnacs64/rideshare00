import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      first_name: string
      last_name?: string
      username?: string
    }
    chat: {
      id: number
      type: string
    }
    text?: string
    date: number
  }
  callback_query?: {
    id: string
    from: {
      id: number
      first_name: string
      last_name?: string
      username?: string
    }
    message?: {
      message_id: number
      chat: {
        id: number
      }
    }
    data?: string
  }
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

    // Parse the Telegram update
    const update: TelegramUpdate = await req.json()
    console.log('Received Telegram update:', update)

    // Handle different types of updates
    if (update.message) {
      await handleMessage(supabaseClient, update.message)
    } else if (update.callback_query) {
      await handleCallbackQuery(supabaseClient, update.callback_query)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error processing Telegram webhook:', error)
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

async function handleMessage(supabaseClient: any, message: TelegramUpdate['message']) {
  if (!message) return

  const telegramUserId = message.from.id
  const chatId = message.chat.id
  const text = message.text || ''

  console.log(`Message from ${telegramUserId}: ${text}`)

  // Handle /start command
  if (text.startsWith('/start')) {
    await sendTelegramMessage(chatId, `
👋 Welcome to NSU Commute!

To link your Telegram account with NSU Commute:
1. Go to your profile in the NSU Commute app
2. Enter your Telegram User ID: <code>${telegramUserId}</code>
3. Save your profile

Once linked, you'll receive ride notifications here!
    `)
    return
  }

  // Handle /help command
  if (text.startsWith('/help')) {
    await sendTelegramMessage(chatId, `
🆘 <b>NSU Commute Help</b>

<b>Commands:</b>
/start - Get started with NSU Commute
/help - Show this help message
/status - Check your current rides

<b>Features:</b>
• Receive ride match notifications
• Confirm or decline rides
• Get pickup reminders
• Stay updated on ride status

For more help, visit the NSU Commute app.
    `)
    return
  }

  // Handle /status command
  if (text.startsWith('/status')) {
    await handleStatusCommand(supabaseClient, telegramUserId, chatId)
    return
  }

  // Default response for unknown messages
  await sendTelegramMessage(chatId, `
I don't understand that command. Type /help for available commands.
  `)
}

async function handleCallbackQuery(supabaseClient: any, callbackQuery: TelegramUpdate['callback_query']) {
  if (!callbackQuery || !callbackQuery.data) return

  const telegramUserId = callbackQuery.from.id
  const chatId = callbackQuery.message?.chat.id
  const data = callbackQuery.data

  console.log(`Callback query from ${telegramUserId}: ${data}`)

  // Handle ride acceptance/decline
  if (data.startsWith('accept_ride_') || data.startsWith('decline_ride_')) {
    const action = data.startsWith('accept_ride_') ? 'ACCEPTED' : 'DECLINED'
    const rideId = data.split('_')[2]

    await handleRideResponse(supabaseClient, telegramUserId, rideId, action, chatId)
  }

  // Answer the callback query to remove the loading state
  await answerCallbackQuery(callbackQuery.id)
}

async function handleStatusCommand(supabaseClient: any, telegramUserId: number, chatId: number) {
  try {
    // Find user by telegram_user_id
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('id, full_name')
      .eq('telegram_user_id', telegramUserId)
      .single()

    if (userError || !user) {
      await sendTelegramMessage(chatId, `
❌ Your Telegram account is not linked to NSU Commute.

To link your account:
1. Go to your profile in the NSU Commute app
2. Enter your Telegram User ID: <code>${telegramUserId}</code>
3. Save your profile
      `)
      return
    }

    // Get user's current rides
    const { data: rides, error: ridesError } = await supabaseClient
      .from('ride_participants')
      .select(`
        *,
        matched_rides (
          id,
          commute_date,
          status,
          estimated_cost_per_person,
          driver_user_id,
          users!matched_rides_driver_user_id_fkey (full_name)
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['PENDING', 'CONFIRMED'])
      .gte('matched_rides.commute_date', new Date().toISOString().split('T')[0])

    if (ridesError) {
      console.error('Error fetching rides:', ridesError)
      await sendTelegramMessage(chatId, 'Error fetching your ride status. Please try again later.')
      return
    }

    if (!rides || rides.length === 0) {
      await sendTelegramMessage(chatId, `
📊 <b>Ride Status</b>

Hello ${user.full_name}! You have no upcoming rides.

Create an opt-in in the NSU Commute app to find ride matches.
      `)
      return
    }

    let statusMessage = `📊 <b>Ride Status</b>\n\nHello ${user.full_name}!\n\n`

    rides.forEach((ride: any, index: number) => {
      const matchedRide = ride.matched_rides
      statusMessage += `<b>Ride ${index + 1}:</b>\n`
      statusMessage += `Date: ${matchedRide.commute_date}\n`
      statusMessage += `Driver: ${matchedRide.users.full_name}\n`
      statusMessage += `Cost: ৳${matchedRide.estimated_cost_per_person}\n`
      statusMessage += `Status: ${ride.status}\n\n`
    })

    await sendTelegramMessage(chatId, statusMessage)

  } catch (error) {
    console.error('Error in handleStatusCommand:', error)
    await sendTelegramMessage(chatId, 'Error fetching your ride status. Please try again later.')
  }
}

async function handleRideResponse(
  supabaseClient: any, 
  telegramUserId: number, 
  rideId: string, 
  action: 'ACCEPTED' | 'DECLINED',
  chatId?: number
) {
  try {
    // Find user by telegram_user_id
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('id, full_name')
      .eq('telegram_user_id', telegramUserId)
      .single()

    if (userError || !user) {
      if (chatId) {
        await sendTelegramMessage(chatId, 'Error: Your Telegram account is not linked to NSU Commute.')
      }
      return
    }

    // Update ride participant status
    const { error: updateError } = await supabaseClient
      .from('ride_participants')
      .update({ status: action })
      .eq('matched_ride_id', rideId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating ride participant:', updateError)
      if (chatId) {
        await sendTelegramMessage(chatId, 'Error updating your ride response. Please try again.')
      }
      return
    }

    const responseMessage = action === 'ACCEPTED' 
      ? '✅ You have accepted the ride! You will receive confirmation details soon.'
      : '❌ You have declined the ride. You can create a new opt-in for alternative transportation.'

    if (chatId) {
      await sendTelegramMessage(chatId, responseMessage)
    }

    console.log(`User ${user.full_name} ${action.toLowerCase()} ride ${rideId}`)

  } catch (error) {
    console.error('Error in handleRideResponse:', error)
    if (chatId) {
      await sendTelegramMessage(chatId, 'Error processing your response. Please try again.')
    }
  }
}

async function sendTelegramMessage(chatId: number, text: string) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not configured')
    return
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
        parse_mode: 'HTML'
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Telegram API error:', errorData)
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error)
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not configured')
    return
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text
      })
    })
  } catch (error) {
    console.error('Error answering callback query:', error)
  }
}
