#!/usr/bin/env node

/**
 * Quick Test Script - Dhanmondi to NSU Route
 * Simple test for user creation, opt-ins, and AI matching
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Quick test configuration
const QUICK_TEST = {
  // Dhanmondi to NSU route
  DHANMONDI: [90.3742, 23.7461],
  NSU: [90.4125, 23.8103],
  TEST_DATE: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  TIME_WINDOW: { start: '08:30', end: '09:30' }
}

// Simple test users with direct database insertion
const timestamp = Date.now()
const USERS = [
  {
    email: `testdriver${timestamp}@northsouth.edu`,
    name: 'Ahmed Rahman',
    role: 'DRIVER',
    location: 'Dhanmondi 27',
    coords: [90.3742, 23.7461],
    driver_details: {
      license_number: 'DH123456',
      car_model: 'Toyota Corolla',
      vehicle_make: 'Toyota',
      vehicle_model: 'Corolla',
      vehicle_year: 2020,
      vehicle_color: 'White',
      vehicle_plate: 'DHA-1234',
      max_passengers: 3,
      capacity: 3
    }
  },
  {
    email: `testrider1${timestamp}@northsouth.edu`,
    name: 'Fatima Khan',
    role: 'RIDER',
    location: 'Dhanmondi 32',
    coords: [90.3756, 23.7489]
  },
  {
    email: `testrider2${timestamp}@northsouth.edu`,
    name: 'Sakib Hassan',
    role: 'RIDER',
    location: 'Dhanmondi Lake',
    coords: [90.3728, 23.7501]
  }
]

async function runQuickTest() {
  console.log('🚗 NSU Commute - Quick Test')
  console.log('=' .repeat(40))
  console.log(`📅 Date: ${QUICK_TEST.TEST_DATE}`)
  console.log(`📍 Route: Dhanmondi → NSU`)
  console.log(`⏰ Time: ${QUICK_TEST.TIME_WINDOW.start}-${QUICK_TEST.TIME_WINDOW.end}`)
  console.log('')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration')
    console.error('Please check your .env file')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // Step 1: Create users and opt-ins
    console.log('👥 Creating test users and opt-ins...')
    const results = await createUsersAndOptIns(supabase)
    
    // Step 2: Run AI matching
    console.log('\n🤖 Running AI matching...')
    const matches = await runMatching(supabase)
    
    // Step 3: Test notifications
    console.log('\n📱 Testing notifications...')
    await testNotifications(supabase, matches)
    
    // Step 4: Show results
    console.log('\n📊 Test Results:')
    console.log(`   Users created: ${results.users.length}`)
    console.log(`   Opt-ins created: ${results.optIns.length}`)
    console.log(`   Matches found: ${matches.length}`)
    
    if (matches.length > 0) {
      console.log('\n🎯 Match Details:')
      matches.forEach((match, i) => {
        console.log(`   Match ${i + 1}:`)
        console.log(`     Driver: ${match.driver?.full_name || 'Unknown'}`)
        console.log(`     Passengers: ${match.participants?.length || 0}`)
        console.log(`     Cost: ৳${match.estimated_cost_per_person}`)
        console.log(`     Confidence: ${(match.ai_confidence_score * 100).toFixed(1)}%`)
      })
    }
    
    // Step 5: Cleanup
    console.log('\n🧹 Cleaning up...')
    await cleanup(supabase, results.users)
    
    console.log('\n✅ Quick test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

async function createUsersAndOptIns(supabase) {
  const createdUsers = []
  const createdOptIns = []
  
  for (const userData of USERS) {
    try {
      // Generate UUID for user (bypass auth for testing)
      const userId = crypto.randomUUID()

      console.log(`   Creating ${userData.name} (${userData.role})...`)
      
      // Create user profile using SQL to handle PostGIS
      const { data: profileData, error: profileError } = await supabase
        .rpc('sql', {
          query: `
            INSERT INTO users (id, email, full_name, default_role, home_location_coords, driver_details)
            VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7)
            RETURNING *
          `,
          args: [userId, userData.email, userData.name, userData.role, userData.coords[0], userData.coords[1], JSON.stringify(userData.driver_details || {})]
        })
      
      if (profileError) {
        console.log(`   ❌ Profile error for ${userData.email}: ${profileError.message}`)
        continue
      }

      const userRecord = profileData[0] // SQL returns array
      
      // Create pickup location using SQL to handle PostGIS
      const { data: locationData, error: locationError } = await supabase
        .rpc('sql', {
          query: `
            INSERT INTO pickup_locations (user_id, name, description, coords, is_default)
            VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6)
            RETURNING *
          `,
          args: [userId, userData.location, `${userData.location}, Dhaka`, userData.coords[0], userData.coords[1], true]
        })
      
      if (locationError) {
        console.log(`   ❌ Location error for ${userData.email}: ${locationError.message}`)
        continue
      }

      const locationRecord = locationData[0] // SQL returns array
      
      // Create opt-in
      const { data: optInData, error: optInError } = await supabase
        .from('daily_opt_ins')
        .upsert({
          user_id: userId,
          commute_date: QUICK_TEST.TEST_DATE,
          time_window_start: QUICK_TEST.TIME_WINDOW.start,
          time_window_end: QUICK_TEST.TIME_WINDOW.end,
          pickup_location_id: locationRecord.id,
          status: 'PENDING_MATCH'
        })
        .select()
        .single()
      
      if (optInError) {
        console.log(`   ❌ Opt-in error for ${userData.email}: ${optInError.message}`)
        continue
      }
      
      createdUsers.push({ ...userRecord, auth_id: userId })
      createdOptIns.push(optInData)

      console.log(`   ✅ ${userData.name} (${userData.role}) - ${userData.location}`)
      
    } catch (error) {
      console.log(`   ❌ Error with ${userData.email}: ${error.message}`)
    }
  }
  
  return { users: createdUsers, optIns: createdOptIns }
}

async function runMatching(supabase) {
  try {
    console.log('   Calling daily-matching function...')
    
    const { data, error } = await supabase.functions.invoke('daily-matching', {
      body: {
        date: QUICK_TEST.TEST_DATE,
        dryRun: false
      }
    })
    
    if (error) {
      console.log(`   ❌ Matching failed: ${error.message}`)
      return []
    }
    
    console.log('   ✅ Matching function completed')
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Fetch created matches
    const { data: matches, error: fetchError } = await supabase
      .from('matched_rides')
      .select(`
        *,
        driver:users!driver_user_id(full_name, email),
        participants:ride_participants!matched_ride_id(
          user:users!user_id(full_name, email)
        )
      `)
      .eq('commute_date', QUICK_TEST.TEST_DATE)
    
    if (fetchError) {
      console.log(`   ❌ Error fetching matches: ${fetchError.message}`)
      return []
    }
    
    console.log(`   🎯 Found ${matches.length} matches`)
    return matches
    
  } catch (error) {
    console.log(`   ❌ Matching error: ${error.message}`)
    return []
  }
}

async function testNotifications(supabase, matches) {
  if (matches.length === 0) {
    console.log('   ⚠️  No matches to notify about')
    return
  }
  
  try {
    const match = matches[0]
    
    console.log('   Sending test notification...')
    
    const { data, error } = await supabase.functions.invoke('send-notifications', {
      body: {
        type: 'MATCH_FOUND',
        rideId: match.id,
        dryRun: true // Set to false to actually send
      }
    })
    
    if (error) {
      console.log(`   ❌ Notification failed: ${error.message}`)
    } else {
      console.log('   ✅ Notification function called successfully')
      console.log(`   📱 Would notify ${match.participants?.length || 0} participants`)
    }
    
  } catch (error) {
    console.log(`   ❌ Notification error: ${error.message}`)
  }
}

async function cleanup(supabase, users) {
  if (users.length === 0) return
  
  const userIds = users.map(u => u.id)
  
  try {
    // Delete in dependency order
    await supabase.from('ride_participants').delete().in('user_id', userIds)
    await supabase.from('matched_rides').delete().in('driver_user_id', userIds)
    await supabase.from('daily_opt_ins').delete().in('user_id', userIds)
    await supabase.from('pickup_locations').delete().in('user_id', userIds)
    await supabase.from('users').delete().in('id', userIds)
    
    // Skip auth deletion since we didn't create auth users
    
    console.log('   ✅ Test data cleaned up')
    
  } catch (error) {
    console.log(`   ⚠️  Cleanup warning: ${error.message}`)
  }
}

// Add test scripts to package.json
console.log('💡 To add these tests to package.json, add:')
console.log('   "test:quick": "node scripts/quickTest.js"')
console.log('   "test:complete": "node scripts/testCompleteFlow.js"')
console.log('   "test:apis": "node scripts/testUberAndTelegram.js"')
console.log('')

// Run the test
runQuickTest()
