#!/usr/bin/env node

/**
 * Setup Telegram Webhook for NSU Commute Bot
 * This script configures the Telegram bot webhook to point to our deployed Edge Function
 */

import { config } from 'dotenv'

// Load environment variables
config()

const TELEGRAM_BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/telegram-webhook`

async function setupWebhook() {
  console.log('🤖 Setting up Telegram Webhook for NSU Commute Bot')
  console.log('=' .repeat(50))
  
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables')
    process.exit(1)
  }
  
  if (!SUPABASE_URL) {
    console.error('❌ SUPABASE_URL not found in environment variables')
    process.exit(1)
  }
  
  console.log(`📡 Webhook URL: ${WEBHOOK_URL}`)
  
  try {
    // First, get bot info to verify token
    console.log('\n🔍 Verifying bot token...')
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`)
    const botInfo = await botInfoResponse.json()
    
    if (!botInfo.ok) {
      console.error('❌ Invalid bot token:', botInfo.description)
      process.exit(1)
    }
    
    console.log(`✅ Bot verified: @${botInfo.result.username} (${botInfo.result.first_name})`)
    
    // Set webhook
    console.log('\n🔗 Setting webhook...')
    const webhookResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true
      })
    })
    
    const webhookResult = await webhookResponse.json()
    
    if (!webhookResult.ok) {
      console.error('❌ Failed to set webhook:', webhookResult.description)
      process.exit(1)
    }
    
    console.log('✅ Webhook set successfully!')
    
    // Verify webhook
    console.log('\n🔍 Verifying webhook...')
    const webhookInfoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`)
    const webhookInfo = await webhookInfoResponse.json()
    
    if (webhookInfo.ok) {
      const info = webhookInfo.result
      console.log('📊 Webhook Status:')
      console.log(`   URL: ${info.url}`)
      console.log(`   Has Custom Certificate: ${info.has_custom_certificate}`)
      console.log(`   Pending Update Count: ${info.pending_update_count}`)
      console.log(`   Max Connections: ${info.max_connections}`)
      console.log(`   Allowed Updates: ${info.allowed_updates?.join(', ') || 'All'}`)
      
      if (info.last_error_date) {
        console.log(`   Last Error: ${new Date(info.last_error_date * 1000).toISOString()}`)
        console.log(`   Last Error Message: ${info.last_error_message}`)
      }
    }
    
    console.log('\n🎉 Telegram webhook setup completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Test the bot by sending a message')
    console.log('   2. Check the Edge Function logs in Supabase Dashboard')
    console.log('   3. Verify notifications are working in the app')
    
  } catch (error) {
    console.error('❌ Error setting up webhook:', error.message)
    process.exit(1)
  }
}

// Run the setup
setupWebhook()
