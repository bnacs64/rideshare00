#!/usr/bin/env node

/**
 * Uber API and Telegram Notification Test Script
 * Focused testing for external API integrations
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const UBER_CLIENT_ID = process.env.VITE_UBER_CLIENT_ID
const UBER_CLIENT_SECRET = process.env.VITE_UBER_CLIENT_SECRET
const TELEGRAM_BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN

// Test route: Dhanmondi to NSU
const TEST_ROUTE = {
  start: {
    name: 'Dhanmondi',
    latitude: 23.7461,
    longitude: 90.3742,
    address: 'Dhanmondi, Dhaka, Bangladesh'
  },
  end: {
    name: 'North South University',
    latitude: 23.8103,
    longitude: 90.4125,
    address: 'Plot 15, Block B, Bashundhara R/A, Dhaka 1229'
  }
}

async function runUberAndTelegramTest() {
  console.log('🚕📱 Uber API & Telegram Notification Test')
  console.log('=' .repeat(50))
  console.log(`📍 Route: ${TEST_ROUTE.start.name} → ${TEST_ROUTE.end.name}`)
  console.log(`🗺️  Distance: ~${calculateDistance(TEST_ROUTE.start, TEST_ROUTE.end).toFixed(2)} km`)
  console.log('')

  try {
    // Test 1: Uber API Integration
    console.log('🚕 Test 1: Uber API Integration')
    await testUberPriceEstimates()
    await testUberTimeEstimates()
    
    // Test 2: Telegram Bot Integration
    console.log('\n📱 Test 2: Telegram Bot Integration')
    await testTelegramBotInfo()
    await testTelegramWebhook()
    await testTelegramNotification()
    
    // Test 3: Integration with Supabase Functions
    console.log('\n🔗 Test 3: Supabase Function Integration')
    await testSupabaseFunctionIntegration()
    
    console.log('\n✅ All tests completed!')
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message)
    process.exit(1)
  }
}

async function testUberPriceEstimates() {
  console.log('   Testing Uber price estimates...')
  
  if (!UBER_CLIENT_ID || !UBER_CLIENT_SECRET) {
    console.log('   ⚠️  Uber credentials not configured, skipping...')
    return
  }
  
  try {
    // First, get OAuth token
    const tokenResponse = await fetch('https://login.uber.com/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: UBER_CLIENT_ID,
        client_secret: UBER_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'request'
      })
    })
    
    if (!tokenResponse.ok) {
      console.log(`   ❌ OAuth token request failed: ${tokenResponse.status}`)
      console.log(`   💡 Response: ${await tokenResponse.text()}`)
      return
    }
    
    const tokenData = await tokenResponse.json()
    console.log('   ✅ OAuth token obtained')
    
    // Get price estimates
    const priceUrl = new URL('https://api.uber.com/v1.2/estimates/price')
    priceUrl.searchParams.append('start_latitude', TEST_ROUTE.start.latitude.toString())
    priceUrl.searchParams.append('start_longitude', TEST_ROUTE.start.longitude.toString())
    priceUrl.searchParams.append('end_latitude', TEST_ROUTE.end.latitude.toString())
    priceUrl.searchParams.append('end_longitude', TEST_ROUTE.end.longitude.toString())
    
    const priceResponse = await fetch(priceUrl, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept-Language': 'en_US'
      }
    })
    
    if (priceResponse.ok) {
      const priceData = await priceResponse.json()
      console.log('   ✅ Price estimates received')
      console.log(`   📊 Available options: ${priceData.prices?.length || 0}`)
      
      if (priceData.prices && priceData.prices.length > 0) {
        priceData.prices.forEach(price => {
          console.log(`     • ${price.display_name}: ${price.estimate} (${price.duration/60} min)`)
        })
        
        // Calculate our estimated cost
        const avgPrice = priceData.prices.reduce((sum, p) => {
          const numPrice = parseFloat(p.estimate.replace(/[^0-9.]/g, ''))
          return sum + (isNaN(numPrice) ? 0 : numPrice)
        }, 0) / priceData.prices.length
        
        console.log(`   💰 Average estimated cost: $${avgPrice.toFixed(2)}`)
        console.log(`   💰 Estimated cost in BDT: ৳${(avgPrice * 110).toFixed(0)}`)
      }
    } else {
      console.log(`   ❌ Price estimates failed: ${priceResponse.status}`)
      const errorText = await priceResponse.text()
      console.log(`   💡 Error: ${errorText}`)
    }
    
  } catch (error) {
    console.log(`   ❌ Uber API error: ${error.message}`)
    console.log('   💡 This might be due to API limitations or geographic restrictions')
  }
}

async function testUberTimeEstimates() {
  console.log('   Testing Uber time estimates...')
  
  if (!UBER_CLIENT_ID || !UBER_CLIENT_SECRET) {
    console.log('   ⚠️  Uber credentials not configured, skipping...')
    return
  }
  
  try {
    // Use a simpler approach for time estimates
    const timeUrl = new URL('https://api.uber.com/v1.2/estimates/time')
    timeUrl.searchParams.append('start_latitude', TEST_ROUTE.start.latitude.toString())
    timeUrl.searchParams.append('start_longitude', TEST_ROUTE.start.longitude.toString())
    
    // For testing, we'll simulate the response
    console.log('   ✅ Time estimate simulation')
    console.log('   ⏱️  Estimated pickup time: 5-10 minutes')
    console.log('   🚗 Estimated travel time: 25-35 minutes')
    console.log('   📍 Route distance: ~12 km')
    
  } catch (error) {
    console.log(`   ❌ Time estimates error: ${error.message}`)
  }
}

async function testTelegramBotInfo() {
  console.log('   Testing Telegram bot configuration...')
  
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('   ❌ Telegram bot token not configured')
    return
  }
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`)
    const data = await response.json()
    
    if (data.ok) {
      console.log('   ✅ Telegram bot is active')
      console.log(`   🤖 Bot name: ${data.result.first_name}`)
      console.log(`   📝 Username: @${data.result.username}`)
      console.log(`   🆔 Bot ID: ${data.result.id}`)
    } else {
      console.log('   ❌ Telegram bot configuration error:', data.description)
    }
    
  } catch (error) {
    console.log(`   ❌ Telegram bot test error: ${error.message}`)
  }
}

async function testTelegramWebhook() {
  console.log('   Testing Telegram webhook configuration...')
  
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('   ⚠️  Telegram bot token not configured, skipping...')
    return
  }
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`)
    const data = await response.json()
    
    if (data.ok) {
      const info = data.result
      console.log('   ✅ Webhook information retrieved')
      console.log(`   🔗 Webhook URL: ${info.url || 'Not set'}`)
      console.log(`   📊 Pending updates: ${info.pending_update_count}`)
      console.log(`   🔄 Max connections: ${info.max_connections}`)
      
      if (info.last_error_date) {
        console.log(`   ⚠️  Last error: ${new Date(info.last_error_date * 1000).toISOString()}`)
        console.log(`   💬 Error message: ${info.last_error_message}`)
      } else {
        console.log('   ✅ No recent webhook errors')
      }
    } else {
      console.log('   ❌ Webhook info error:', data.description)
    }
    
  } catch (error) {
    console.log(`   ❌ Webhook test error: ${error.message}`)
  }
}

async function testTelegramNotification() {
  console.log('   Testing Telegram notification sending...')
  
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('   ⚠️  Telegram bot token not configured, skipping...')
    return
  }
  
  try {
    // Test message
    const testMessage = `🚗 NSU Commute Test Notification

📍 Route: ${TEST_ROUTE.start.name} → ${TEST_ROUTE.end.name}
⏰ Time: ${new Date().toLocaleTimeString()}
🧪 This is a test message from the NSU Commute system.

✅ If you receive this message, Telegram integration is working correctly!`

    // Note: We can't send without a chat_id, so we'll simulate
    console.log('   ✅ Test notification prepared')
    console.log('   📱 Message preview:')
    console.log('   ' + testMessage.split('\n').join('\n   '))
    console.log('   💡 To test actual sending, add a chat_id and uncomment the send code')
    
    // Uncomment and add chat_id to actually send:
    /*
    const sendResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: 'YOUR_CHAT_ID_HERE',
        text: testMessage,
        parse_mode: 'HTML'
      })
    })
    
    if (sendResponse.ok) {
      console.log('   ✅ Test notification sent successfully')
    } else {
      const errorData = await sendResponse.json()
      console.log('   ❌ Notification sending failed:', errorData.description)
    }
    */
    
  } catch (error) {
    console.log(`   ❌ Notification test error: ${error.message}`)
  }
}

async function testSupabaseFunctionIntegration() {
  console.log('   Testing Supabase function integration...')
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('   ❌ Supabase configuration missing')
    return
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  
  try {
    // Test the telegram-webhook function
    console.log('   Testing telegram-webhook function...')
    const { data: webhookData, error: webhookError } = await supabase.functions.invoke('telegram-webhook', {
      body: {
        message: {
          chat: { id: 123456789 },
          text: '/start',
          from: { first_name: 'Test User' }
        }
      }
    })
    
    if (webhookError) {
      console.log(`   ⚠️  Webhook function test: ${webhookError.message}`)
    } else {
      console.log('   ✅ Telegram webhook function responded')
    }
    
    // Test the send-notifications function
    console.log('   Testing send-notifications function...')
    const { data: notifData, error: notifError } = await supabase.functions.invoke('send-notifications', {
      body: {
        type: 'TEST_NOTIFICATION',
        message: 'Test notification from integration test',
        dryRun: true
      }
    })
    
    if (notifError) {
      console.log(`   ⚠️  Notification function test: ${notifError.message}`)
    } else {
      console.log('   ✅ Send notifications function responded')
    }
    
  } catch (error) {
    console.log(`   ❌ Supabase function test error: ${error.message}`)
  }
}

// Utility function to calculate distance
function calculateDistance(point1, point2) {
  const R = 6371 // Earth's radius in km
  const dLat = (point2.latitude - point1.latitude) * Math.PI / 180
  const dLon = (point2.longitude - point1.longitude) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Run the test
runUberAndTelegramTest()
