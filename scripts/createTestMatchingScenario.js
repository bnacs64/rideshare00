#!/usr/bin/env node

/**
 * Test Matching Scenario Creator
 * 
 * This script creates a realistic test scenario for ride matching:
 * 1. Creates test users (1 driver + 2 riders) with Dhanmondi pickup locations
 * 2. Creates opt-ins for the same time window going to NSU
 * 3. Triggers matching to create matched rides
 * 4. Shows how the UI should update when matching occurs
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Test scenario configuration
const TEST_DATE = '2025-06-18' // Tomorrow
const TEST_TIME_START = '08:30:00'
const TEST_TIME_END = '09:30:00'

// Dhanmondi area coordinates (pickup locations)
const DHANMONDI_LOCATIONS = [
  {
    name: 'Dhanmondi 27',
    coords: [90.3742, 23.7461], // [lng, lat] for PostGIS
    address: 'Dhanmondi 27, Dhaka, Bangladesh'
  },
  {
    name: 'Dhanmondi 15',
    coords: [90.3712, 23.7501], 
    address: 'Dhanmondi 15, Dhaka, Bangladesh'
  },
  {
    name: 'Dhanmondi 32',
    coords: [90.3772, 23.7431],
    address: 'Dhanmondi 32, Dhaka, Bangladesh'
  }
]

// NSU coordinates (destination)
const NSU_LOCATION = [90.4125, 23.8103]

async function main() {
  console.log('🎯 Creating Test Matching Scenario')
  console.log('=====================================')
  
  try {
    // Step 1: Clean up any existing test data
    console.log('\n🧹 Cleaning up existing test data...')
    await cleanupTestData()
    
    // Step 2: Create test users
    console.log('\n👥 Creating test users...')
    const users = await createTestUsers()
    
    // Step 3: Create pickup locations
    console.log('\n📍 Creating pickup locations...')
    const locations = await createPickupLocations(users)
    
    // Step 4: Create opt-ins for the same time window
    console.log('\n✋ Creating opt-ins...')
    const optIns = await createOptIns(users, locations)
    
    // Step 5: Trigger matching
    console.log('\n🤖 Triggering ride matching...')
    const matchingResults = await triggerMatching(optIns)
    
    // Step 6: Display results
    console.log('\n📊 Test Scenario Results')
    console.log('========================')
    await displayResults(users, optIns, matchingResults)
    
    // Step 7: Show UI testing instructions
    console.log('\n🖥️  UI Testing Instructions')
    console.log('===========================')
    showUITestingInstructions(users)
    
  } catch (error) {
    console.error('❌ Error creating test scenario:', error.message)
    process.exit(1)
  }
}

async function cleanupTestData() {
  // Delete test users and their related data (cascading deletes will handle the rest)
  const testEmails = [
    'driver.test@nsu.edu',
    'rider1.test@nsu.edu', 
    'rider2.test@nsu.edu'
  ]
  
  for (const email of testEmails) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('email', email)
    
    if (error && !error.message.includes('No rows found')) {
      console.log(`   ⚠️  Warning cleaning up ${email}:`, error.message)
    }
  }
  
  console.log('   ✅ Cleanup completed')
}

async function createTestUsers() {
  const users = []
  
  // Create 1 driver
  const driverData = {
    email: 'driver.test@nsu.edu',
    full_name: 'Ahmed Rahman (Driver)',
    default_role: 'DRIVER',
    home_location_coords: `POINT(${DHANMONDI_LOCATIONS[0].coords[0]} ${DHANMONDI_LOCATIONS[0].coords[1]})`,
    home_location_address: DHANMONDI_LOCATIONS[0].address,
    driver_details: {
      car_model: 'Toyota Corolla',
      car_color: 'White',
      license_plate: 'DHA-1234',
      capacity: 4
    }
  }
  
  const { data: driver, error: driverError } = await supabase
    .from('users')
    .insert(driverData)
    .select()
    .single()
  
  if (driverError) throw new Error(`Failed to create driver: ${driverError.message}`)
  users.push(driver)
  console.log(`   ✅ Created driver: ${driver.full_name}`)
  
  // Create 2 riders
  for (let i = 1; i <= 2; i++) {
    const riderData = {
      email: `rider${i}.test@nsu.edu`,
      full_name: `Student ${i} (Rider)`,
      default_role: 'RIDER',
      home_location_coords: `POINT(${DHANMONDI_LOCATIONS[i].coords[0]} ${DHANMONDI_LOCATIONS[i].coords[1]})`,
      home_location_address: DHANMONDI_LOCATIONS[i].address
    }
    
    const { data: rider, error: riderError } = await supabase
      .from('users')
      .insert(riderData)
      .select()
      .single()
    
    if (riderError) throw new Error(`Failed to create rider ${i}: ${riderError.message}`)
    users.push(rider)
    console.log(`   ✅ Created rider: ${rider.full_name}`)
  }
  
  return users
}

async function createPickupLocations(users) {
  const locations = []
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    const locationData = DHANMONDI_LOCATIONS[i]
    
    const pickupData = {
      user_id: user.id,
      name: locationData.name,
      description: `Pickup point at ${locationData.name}`,
      coords: `POINT(${locationData.coords[0]} ${locationData.coords[1]})`,
      is_default: true
    }
    
    const { data: location, error } = await supabase
      .from('pickup_locations')
      .insert(pickupData)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create pickup location for ${user.full_name}: ${error.message}`)
    locations.push(location)
    console.log(`   ✅ Created pickup location: ${location.name} for ${user.full_name}`)
  }
  
  return locations
}

async function createOptIns(users, locations) {
  const optIns = []
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    const location = locations[i]
    
    const optInData = {
      user_id: user.id,
      commute_date: TEST_DATE,
      time_window_start: TEST_TIME_START,
      time_window_end: TEST_TIME_END,
      pickup_location_id: location.id,
      status: 'PENDING_MATCH'
    }
    
    const { data: optIn, error } = await supabase
      .from('daily_opt_ins')
      .insert(optInData)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create opt-in for ${user.full_name}: ${error.message}`)
    optIns.push(optIn)
    console.log(`   ✅ Created opt-in: ${user.full_name} (${user.default_role}) - ${TEST_TIME_START} to ${TEST_TIME_END}`)
  }
  
  return optIns
}

async function triggerMatching(optIns) {
  console.log('   🔄 Running daily matching for test date...')
  
  try {
    // Call the daily matching Edge Function
    const { data, error } = await supabase.functions.invoke('daily-matching', {
      body: {
        date: TEST_DATE,
        dryRun: false
      }
    })
    
    if (error) {
      console.log('   ⚠️  Edge Function error:', error.message)
      console.log('   🔄 Trying local matching service...')
      
      // Fallback to local matching
      return await triggerLocalMatching(optIns)
    }
    
    console.log('   ✅ Daily matching completed via Edge Function')
    return data
    
  } catch (error) {
    console.log('   ⚠️  Edge Function failed:', error.message)
    console.log('   🔄 Trying local matching service...')
    
    // Fallback to local matching
    return await triggerLocalMatching(optIns)
  }
}

async function triggerLocalMatching(optIns) {
  // Simple local matching logic for testing
  const driver = optIns.find(opt => opt.user_id)
  const riders = optIns.filter(opt => opt.user_id !== driver?.user_id)
  
  if (!driver || riders.length === 0) {
    console.log('   ❌ No valid driver-rider combination found')
    return { matchesCreated: 0 }
  }
  
  // Create a simple matched ride
  const matchedRideData = {
    driver_user_id: driver.user_id,
    commute_date: TEST_DATE,
    route_optimization_data: {
      distance: 8.5,
      duration: 1800, // 30 minutes
      waypoints: [
        { user_id: driver.user_id, coords: DHANMONDI_LOCATIONS[0].coords },
        { user_id: riders[0].user_id, coords: DHANMONDI_LOCATIONS[1].coords },
        { user_id: riders[1]?.user_id, coords: DHANMONDI_LOCATIONS[2].coords },
        { coords: NSU_LOCATION, name: 'NSU Campus' }
      ]
    },
    estimated_cost_per_person: 150,
    estimated_total_time: 30,
    pickup_order: [driver.user_id, ...riders.map(r => r.user_id)],
    ai_confidence_score: 0.85,
    ai_reasoning: 'High compatibility: overlapping time windows, nearby pickup locations in Dhanmondi area, optimal route to NSU',
    status: 'PROPOSED'
  }
  
  const { data: ride, error: rideError } = await supabase
    .from('matched_rides')
    .insert(matchedRideData)
    .select()
    .single()
  
  if (rideError) {
    console.log('   ❌ Failed to create matched ride:', rideError.message)
    return { matchesCreated: 0 }
  }
  
  // Create ride participants
  const participants = [driver, ...riders].map(optIn => ({
    matched_ride_id: ride.id,
    user_id: optIn.user_id,
    daily_opt_in_id: optIn.id,
    status: 'PENDING_ACCEPTANCE',
    confirmation_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }))
  
  const { error: participantsError } = await supabase
    .from('ride_participants')
    .insert(participants)
  
  if (participantsError) {
    console.log('   ❌ Failed to create participants:', participantsError.message)
    return { matchesCreated: 0 }
  }
  
  console.log('   ✅ Local matching completed - 1 ride created')
  return { matchesCreated: 1, rideId: ride.id }
}

async function displayResults(users, optIns, matchingResults) {
  console.log(`📊 Created ${users.length} test users:`)
  users.forEach((user, i) => {
    console.log(`   ${i + 1}. ${user.full_name} (${user.default_role}) - ${user.email}`)
  })
  
  console.log(`\n✋ Created ${optIns.length} opt-ins for ${TEST_DATE}:`)
  optIns.forEach((optIn, i) => {
    const user = users.find(u => u.id === optIn.user_id)
    console.log(`   ${i + 1}. ${user.full_name} - ${optIn.time_window_start} to ${optIn.time_window_end}`)
  })
  
  console.log(`\n🎯 Matching Results:`)
  console.log(`   Matches created: ${matchingResults.matchesCreated || 0}`)
  
  if (matchingResults.matchesCreated > 0) {
    // Fetch and display the created matches
    const { data: matches } = await supabase
      .from('matched_rides')
      .select(`
        id, driver_user_id, estimated_cost_per_person, ai_confidence_score,
        driver:users!driver_user_id(full_name),
        participants:ride_participants(
          user:users(full_name, default_role)
        )
      `)
      .eq('commute_date', TEST_DATE)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (matches && matches.length > 0) {
      matches.forEach((match, i) => {
        console.log(`   ${i + 1}. Driver: ${match.driver.full_name}`)
        console.log(`      Cost per person: ৳${match.estimated_cost_per_person}`)
        console.log(`      Confidence: ${(match.ai_confidence_score * 100).toFixed(1)}%`)
        console.log(`      Participants: ${match.participants.length}`)
        match.participants.forEach(p => {
          console.log(`        - ${p.user.full_name} (${p.user.default_role})`)
        })
      })
    }
  }
}

function showUITestingInstructions(users) {
  console.log('1. 🌐 Open the application: http://localhost:3001')
  console.log('\n2. 👤 Login with test accounts:')
  users.forEach((user, i) => {
    console.log(`   ${i + 1}. Email: ${user.email}`)
    console.log(`      Role: ${user.default_role}`)
    console.log(`      Password: Use the same password you set during registration`)
  })
  
  console.log('\n3. 🔍 Test the matching UI:')
  console.log('   • Go to Dashboard → My Rides')
  console.log('   • Check for new ride proposals')
  console.log('   • Test accepting/declining rides')
  console.log('   • View ride details and participant lists')
  
  console.log('\n4. 📱 Test notifications:')
  console.log('   • Check if users receive ride match notifications')
  console.log('   • Test Telegram notifications (if configured)')
  
  console.log('\n5. 🔄 Re-run matching:')
  console.log('   • Go to Dashboard → Matching Admin')
  console.log('   • Trigger manual matching to see real-time updates')
  
  console.log('\n6. 🧹 Cleanup when done:')
  console.log('   • Run this script again to create fresh test data')
  console.log('   • Or manually delete test users from the database')
}

// Run the script
main().catch(console.error)
