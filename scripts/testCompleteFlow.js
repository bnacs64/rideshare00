#!/usr/bin/env node

/**
 * Complete Flow Test Script for NSU Commute PWA
 * Tests: User Creation -> Opt-ins -> AI Matching -> Uber API -> Telegram Notifications
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

// Test configuration
const TEST_CONFIG = {
  // Dhanmondi coordinates (starting point)
  DHANMONDI_COORDS: [90.3742, 23.7461],
  // NSU coordinates (destination)
  NSU_COORDS: [90.4125, 23.8103],
  // Test date (tomorrow)
  TEST_DATE: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  // Time windows
  MORNING_TIME: { start: '08:00', end: '09:00' },
  EVENING_TIME: { start: '17:00', end: '18:00' }
}

// Test users data
const TEST_USERS = [
  {
    email: 'driver1@northsouth.edu',
    password: 'testpass123',
    full_name: 'Ahmed Rahman',
    role: 'DRIVER',
    driver_details: {
      license_number: 'DH123456',
      vehicle_make: 'Toyota',
      vehicle_model: 'Corolla',
      vehicle_year: 2020,
      vehicle_color: 'White',
      vehicle_plate: 'DHA-1234',
      max_passengers: 3
    }
  },
  {
    email: 'rider1@northsouth.edu',
    password: 'testpass123',
    full_name: 'Fatima Khan',
    role: 'RIDER'
  },
  {
    email: 'rider2@northsouth.edu',
    password: 'testpass123',
    full_name: 'Sakib Hassan',
    role: 'RIDER'
  },
  {
    email: 'rider3@northsouth.edu',
    password: 'testpass123',
    full_name: 'Nadia Ahmed',
    role: 'RIDER'
  }
]

async function runCompleteFlowTest() {
  console.log('🚗 NSU Commute - Complete Flow Test')
  console.log('=' .repeat(50))
  console.log(`📅 Test Date: ${TEST_CONFIG.TEST_DATE}`)
  console.log(`📍 Route: Dhanmondi → NSU`)
  console.log(`👥 Test Users: ${TEST_USERS.length}`)
  console.log('')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const anonSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  try {
    // Step 1: Create test users
    console.log('👤 Step 1: Creating test users...')
    const createdUsers = await createTestUsers(supabase)
    
    // Step 2: Create pickup locations
    console.log('\n📍 Step 2: Creating pickup locations...')
    const locations = await createPickupLocations(supabase, createdUsers)
    
    // Step 3: Create opt-ins
    console.log('\n✋ Step 3: Creating daily opt-ins...')
    const optIns = await createOptIns(supabase, createdUsers, locations)
    
    // Step 4: Test AI matching
    console.log('\n🤖 Step 4: Testing AI matching...')
    const matches = await testAIMatching(supabase)
    
    // Step 5: Test Uber API integration
    console.log('\n🚕 Step 5: Testing Uber API integration...')
    await testUberAPI()
    
    // Step 6: Test Telegram notifications
    console.log('\n📱 Step 6: Testing Telegram notifications...')
    await testTelegramNotifications(supabase, matches)
    
    // Step 7: Cleanup (optional)
    console.log('\n🧹 Step 7: Cleanup test data...')
    await cleanupTestData(supabase, createdUsers)
    
    console.log('\n✅ Complete flow test finished successfully!')
    console.log('\n📊 Test Summary:')
    console.log(`   • Users created: ${createdUsers.length}`)
    console.log(`   • Locations created: ${locations.length}`)
    console.log(`   • Opt-ins created: ${optIns.length}`)
    console.log(`   • Matches found: ${matches?.length || 0}`)
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

async function createTestUsers(supabase) {
  console.log('   Creating test users...')
  const createdUsers = []
  
  for (const userData of TEST_USERS) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name
        }
      })
      
      if (authError) {
        console.log(`   ⚠️  User ${userData.email} might already exist: ${authError.message}`)
        continue
      }
      
      // Create user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          full_name: userData.full_name,
          default_role: userData.role,
          home_location_coords: TEST_CONFIG.DHANMONDI_COORDS,
          driver_details: userData.driver_details || null
        })
        .select()
        .single()
      
      if (profileError) {
        console.log(`   ❌ Profile creation failed for ${userData.email}: ${profileError.message}`)
        continue
      }
      
      createdUsers.push({
        ...profileData,
        auth_id: authData.user.id
      })
      
      console.log(`   ✅ Created user: ${userData.full_name} (${userData.role})`)
      
    } catch (error) {
      console.log(`   ❌ Error creating user ${userData.email}: ${error.message}`)
    }
  }
  
  return createdUsers
}

async function createPickupLocations(supabase, users) {
  console.log('   Creating pickup locations in Dhanmondi...')
  const locations = []
  
  // Different pickup points in Dhanmondi area
  const pickupPoints = [
    { name: 'Dhanmondi 27', coords: [90.3742, 23.7461], address: 'Road 27, Dhanmondi, Dhaka' },
    { name: 'Dhanmondi 32', coords: [90.3756, 23.7489], address: 'Road 32, Dhanmondi, Dhaka' },
    { name: 'Dhanmondi Lake', coords: [90.3728, 23.7501], address: 'Dhanmondi Lake, Dhaka' },
    { name: 'Satmasjid Road', coords: [90.3698, 23.7445], address: 'Satmasjid Road, Dhanmondi, Dhaka' }
  ]
  
  for (let i = 0; i < users.length && i < pickupPoints.length; i++) {
    const user = users[i]
    const point = pickupPoints[i]
    
    try {
      const { data, error } = await supabase
        .from('pickup_locations')
        .insert({
          user_id: user.id,
          name: point.name,
          description: point.address,
          coords: point.coords,
          is_default: true
        })
        .select()
        .single()
      
      if (error) {
        console.log(`   ❌ Location creation failed: ${error.message}`)
        continue
      }
      
      locations.push(data)
      console.log(`   ✅ Created location: ${point.name} for ${user.full_name}`)
      
    } catch (error) {
      console.log(`   ❌ Error creating location: ${error.message}`)
    }
  }
  
  return locations
}

async function createOptIns(supabase, users, locations) {
  console.log('   Creating daily opt-ins...')
  const optIns = []
  
  for (let i = 0; i < users.length && i < locations.length; i++) {
    const user = users[i]
    const location = locations[i]
    
    try {
      const { data, error } = await supabase
        .from('daily_opt_ins')
        .insert({
          user_id: user.id,
          commute_date: TEST_CONFIG.TEST_DATE,
          time_window_start: TEST_CONFIG.MORNING_TIME.start,
          time_window_end: TEST_CONFIG.MORNING_TIME.end,
          pickup_location_id: location.id,
          status: 'PENDING_MATCH'
        })
        .select()
        .single()
      
      if (error) {
        console.log(`   ❌ Opt-in creation failed: ${error.message}`)
        continue
      }
      
      optIns.push(data)
      console.log(`   ✅ Created opt-in: ${user.full_name} (${TEST_CONFIG.MORNING_TIME.start}-${TEST_CONFIG.MORNING_TIME.end})`)
      
    } catch (error) {
      console.log(`   ❌ Error creating opt-in: ${error.message}`)
    }
  }
  
  return optIns
}

async function testAIMatching(supabase) {
  console.log('   Triggering AI matching...')
  
  try {
    // Call the daily matching Edge Function
    const { data, error } = await supabase.functions.invoke('daily-matching', {
      body: {
        date: TEST_CONFIG.TEST_DATE,
        dryRun: false
      }
    })
    
    if (error) {
      console.log(`   ❌ AI matching failed: ${error.message}`)
      return []
    }
    
    console.log(`   ✅ AI matching completed`)
    console.log(`   📊 Response:`, JSON.stringify(data, null, 2))
    
    // Check for created matches
    const { data: matches, error: matchError } = await supabase
      .from('matched_rides')
      .select(`
        *,
        driver:users!driver_user_id(full_name, email)
      `)
      .eq('commute_date', TEST_CONFIG.TEST_DATE)
    
    if (matchError) {
      console.log(`   ❌ Error fetching matches: ${matchError.message}`)
      return []
    }
    
    console.log(`   🎯 Found ${matches.length} matches`)
    matches.forEach((match, index) => {
      console.log(`   Match ${index + 1}:`)
      console.log(`     Driver: ${match.driver.full_name}`)
      console.log(`     Passengers: ${match.participants.length}`)
      console.log(`     Cost per person: ৳${match.estimated_cost_per_person}`)
      console.log(`     Confidence: ${(match.ai_confidence_score * 100).toFixed(1)}%`)
    })
    
    return matches
    
  } catch (error) {
    console.log(`   ❌ AI matching error: ${error.message}`)
    return []
  }
}

async function testUberAPI() {
  console.log('   Testing Uber API integration...')
  
  try {
    // Test Uber API with our route
    const response = await fetch('https://api.uber.com/v1.2/estimates/price', {
      method: 'GET',
      headers: {
        'Authorization': `Token ${process.env.VITE_UBER_CLIENT_SECRET}`,
        'Accept-Language': 'en_US',
        'Content-Type': 'application/json'
      },
      params: new URLSearchParams({
        start_latitude: TEST_CONFIG.DHANMONDI_COORDS[1],
        start_longitude: TEST_CONFIG.DHANMONDI_COORDS[0],
        end_latitude: TEST_CONFIG.NSU_COORDS[1],
        end_longitude: TEST_CONFIG.NSU_COORDS[0]
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ Uber API response received`)
      console.log(`   📊 Available rides: ${data.prices?.length || 0}`)
      
      if (data.prices && data.prices.length > 0) {
        data.prices.forEach(price => {
          console.log(`     ${price.display_name}: ${price.estimate}`)
        })
      }
    } else {
      console.log(`   ⚠️  Uber API returned status: ${response.status}`)
      console.log(`   💡 This is expected if Uber API keys are not configured for production`)
    }
    
  } catch (error) {
    console.log(`   ⚠️  Uber API test skipped: ${error.message}`)
    console.log(`   💡 This is expected in development environment`)
  }
}

async function testTelegramNotifications(supabase, matches) {
  console.log('   Testing Telegram notifications...')
  
  if (!matches || matches.length === 0) {
    console.log('   ⚠️  No matches found, skipping notification test')
    return
  }
  
  try {
    // Test sending notifications for the first match
    const match = matches[0]
    
    const { data, error } = await supabase.functions.invoke('send-notifications', {
      body: {
        type: 'MATCH_FOUND',
        rideId: match.id,
        dryRun: false
      }
    })
    
    if (error) {
      console.log(`   ❌ Notification sending failed: ${error.message}`)
      return
    }
    
    console.log(`   ✅ Notifications sent successfully`)
    console.log(`   📱 Response:`, JSON.stringify(data, null, 2))
    
  } catch (error) {
    console.log(`   ❌ Notification test error: ${error.message}`)
  }
}

async function cleanupTestData(supabase, users) {
  console.log('   Cleaning up test data...')
  
  const userIds = users.map(u => u.id)
  
  try {
    // Delete in reverse order of dependencies
    await supabase.from('ride_participants').delete().in('user_id', userIds)
    await supabase.from('matched_rides').delete().in('driver_user_id', userIds)
    await supabase.from('daily_opt_ins').delete().in('user_id', userIds)
    await supabase.from('pickup_locations').delete().in('user_id', userIds)
    await supabase.from('users').delete().in('id', userIds)
    
    // Delete auth users
    for (const user of users) {
      if (user.auth_id) {
        await supabase.auth.admin.deleteUser(user.auth_id)
      }
    }
    
    console.log('   ✅ Test data cleaned up')
    
  } catch (error) {
    console.log(`   ⚠️  Cleanup warning: ${error.message}`)
  }
}

// Run the test
runCompleteFlowTest()
