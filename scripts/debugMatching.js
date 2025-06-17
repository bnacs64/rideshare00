#!/usr/bin/env node

/**
 * Debug AI Matching Script
 * Detailed debugging of the AI matching process
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function debugMatching() {
  console.log('🔍 AI Matching Debug Session')
  console.log('=' .repeat(40))
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const testDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  try {
    // Step 1: Check existing opt-ins
    console.log('📋 Step 1: Checking existing opt-ins...')
    const { data: optIns, error: optInError } = await supabase
      .from('daily_opt_ins')
      .select(`
        *,
        user:users(full_name, default_role, driver_details),
        pickup_location:pickup_locations(name, description, coords)
      `)
      .eq('commute_date', testDate)
      .eq('status', 'PENDING_MATCH')
    
    if (optInError) {
      console.log('❌ Error fetching opt-ins:', optInError.message)
      return
    }
    
    console.log(`   Found ${optIns.length} pending opt-ins for ${testDate}`)
    
    if (optIns.length === 0) {
      console.log('   ⚠️  No opt-ins found. Creating test opt-ins...')
      await createTestOptIns(supabase, testDate)
      return debugMatching() // Restart with new opt-ins
    }
    
    // Show opt-ins details
    optIns.forEach((optIn, i) => {
      console.log(`   ${i + 1}. ${optIn.user.full_name} (${optIn.user.default_role})`)
      console.log(`      Time: ${optIn.time_window_start}-${optIn.time_window_end}`)
      console.log(`      Location: ${optIn.pickup_location?.name || 'Unknown'}`)
      if (optIn.user.default_role === 'DRIVER') {
        console.log(`      Vehicle: ${optIn.user.driver_details?.car_model || 'Not specified'}`)
        console.log(`      Capacity: ${optIn.user.driver_details?.capacity || 'Not specified'}`)
      }
    })
    
    // Step 2: Check drivers vs riders
    const drivers = optIns.filter(o => o.user.default_role === 'DRIVER')
    const riders = optIns.filter(o => o.user.default_role === 'RIDER')
    
    console.log(`\n🚗 Drivers: ${drivers.length}`)
    console.log(`👥 Riders: ${riders.length}`)
    
    if (drivers.length === 0) {
      console.log('   ❌ No drivers available for matching')
      return
    }
    
    if (riders.length === 0) {
      console.log('   ❌ No riders available for matching')
      return
    }
    
    // Step 3: Test AI matching function
    console.log('\n🤖 Step 3: Testing AI matching function...')
    const { data: matchResult, error: matchError } = await supabase.functions.invoke('daily-matching', {
      body: {
        date: testDate,
        dryRun: false,
        debug: true
      }
    })
    
    if (matchError) {
      console.log('❌ Matching function error:', matchError.message)
      return
    }
    
    console.log('✅ Matching function response:')
    console.log(JSON.stringify(matchResult, null, 2))
    
    // Step 4: Check created matches
    console.log('\n🎯 Step 4: Checking created matches...')
    const { data: matches, error: fetchError } = await supabase
      .from('matched_rides')
      .select(`
        *,
        driver:users!driver_user_id(full_name, email),
        participants:ride_participants!matched_ride_id(
          user:users!user_id(full_name, email)
        )
      `)
      .eq('commute_date', testDate)
    
    if (fetchError) {
      console.log('❌ Error fetching matches:', fetchError.message)
      return
    }
    
    console.log(`   Found ${matches.length} matches`)
    
    if (matches.length > 0) {
      matches.forEach((match, i) => {
        console.log(`   Match ${i + 1}:`)
        console.log(`     ID: ${match.id}`)
        console.log(`     Driver: ${match.driver?.full_name || 'Unknown'}`)
        console.log(`     Status: ${match.status}`)
        console.log(`     Participants: ${match.participants?.length || 0}`)
        console.log(`     Cost per person: ৳${match.estimated_cost_per_person || 'N/A'}`)
        console.log(`     Confidence: ${match.ai_confidence_score ? (match.ai_confidence_score * 100).toFixed(1) + '%' : 'N/A'}`)
        if (match.ai_reasoning) {
          console.log(`     Reasoning: ${match.ai_reasoning}`)
        }
      })
    } else {
      console.log('   ⚠️  No matches created')
      
      // Step 5: Debug why no matches
      console.log('\n🔍 Step 5: Debugging why no matches were created...')
      
      // Check if Gemini API key is configured
      console.log('   Checking API configurations...')
      const geminiKey = process.env.VITE_GEMINI_API_KEY
      console.log(`   Gemini API Key: ${geminiKey ? '✅ Configured' : '❌ Missing'}`)
      
      // Check time windows overlap
      console.log('   Checking time window overlaps...')
      const driverTimes = drivers.map(d => ({
        name: d.user.full_name,
        start: d.time_window_start,
        end: d.time_window_end
      }))
      const riderTimes = riders.map(r => ({
        name: r.user.full_name,
        start: r.time_window_start,
        end: r.time_window_end
      }))
      
      console.log('   Driver time windows:', driverTimes)
      console.log('   Rider time windows:', riderTimes)
      
      // Check if times overlap
      let hasOverlap = false
      for (const driver of driverTimes) {
        for (const rider of riderTimes) {
          if (driver.start === rider.start && driver.end === rider.end) {
            console.log(`   ✅ Time overlap found: ${driver.name} and ${rider.name}`)
            hasOverlap = true
          }
        }
      }
      
      if (!hasOverlap) {
        console.log('   ⚠️  No time window overlaps found')
      }
    }
    
    // Step 6: Test notification system
    if (matches.length > 0) {
      console.log('\n📱 Step 6: Testing notification system...')
      const match = matches[0]
      
      const { data: notifResult, error: notifError } = await supabase.functions.invoke('send-notifications', {
        body: {
          type: 'MATCH_FOUND',
          rideId: match.id,
          dryRun: true
        }
      })
      
      if (notifError) {
        console.log('❌ Notification test error:', notifError.message)
      } else {
        console.log('✅ Notification test successful')
        console.log('   Response:', JSON.stringify(notifResult, null, 2))
      }
    }
    
    console.log('\n✅ Debug session completed!')
    
  } catch (error) {
    console.error('❌ Debug session failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

async function createTestOptIns(supabase, testDate) {
  console.log('   Creating test opt-ins for debugging...')
  
  // Get existing users
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*, pickup_locations(*)')
    .limit(5)
  
  if (userError || !users || users.length === 0) {
    console.log('   ❌ No users found. Please run the quick test first.')
    return
  }
  
  // Create opt-ins for available users
  for (const user of users.slice(0, 3)) {
    if (!user.pickup_locations || user.pickup_locations.length === 0) continue
    
    try {
      await supabase
        .from('daily_opt_ins')
        .upsert({
          user_id: user.id,
          commute_date: testDate,
          time_window_start: '08:30',
          time_window_end: '09:30',
          pickup_location_id: user.pickup_locations[0].id,
          status: 'PENDING_MATCH'
        })
      
      console.log(`   ✅ Created opt-in for ${user.full_name}`)
    } catch (error) {
      console.log(`   ❌ Failed to create opt-in for ${user.full_name}: ${error.message}`)
    }
  }
}

// Run the debug session
debugMatching()
