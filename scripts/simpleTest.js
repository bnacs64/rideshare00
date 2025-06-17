#!/usr/bin/env node

/**
 * Simple Test Script
 * Direct database insertion bypassing auth and validation
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const TEST_CONFIG = {
  TEST_DATE: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  TIME_WINDOW: { start: '08:30', end: '09:30' },
  DHANMONDI_COORDS: [90.3742, 23.7461],
  NSU_COORDS: [90.4125, 23.8103]
}

async function runSimpleTest() {
  console.log('🚗 NSU Commute - Simple Test')
  console.log('=' .repeat(40))
  console.log(`📅 Date: ${TEST_CONFIG.TEST_DATE}`)
  console.log('📍 Route: Dhanmondi → NSU')
  console.log('⏰ Time: 08:30-09:30')
  console.log('')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // Step 1: Create test users directly in database
    console.log('👥 Creating test users...')
    
    const timestamp = Date.now()
    const users = []
    
    // Create driver
    const driverId = crypto.randomUUID()
    const driverEmail = `testdriver${timestamp}@northsouth.edu`
    
    console.log('   Creating driver...')
    const { error: driverError } = await supabase
      .rpc('create_test_user', {
        user_id: driverId,
        user_email: driverEmail,
        user_name: 'Ahmed Rahman',
        user_role: 'DRIVER',
        longitude: TEST_CONFIG.DHANMONDI_COORDS[0],
        latitude: TEST_CONFIG.DHANMONDI_COORDS[1],
        driver_info: JSON.stringify({
          license_number: 'DH123456',
          car_model: 'Toyota Corolla',
          capacity: 3
        })
      })
    
    if (driverError) {
      console.log(`   ❌ Driver creation failed: ${driverError.message}`)
      console.log('   Trying alternative approach...')
      
      // Alternative: Direct SQL execution
      const { data: driverData, error: driverSqlError } = await supabase
        .from('users')
        .insert({
          id: driverId,
          email: driverEmail,
          full_name: 'Ahmed Rahman',
          default_role: 'DRIVER',
          home_location_coords: `POINT(${TEST_CONFIG.DHANMONDI_COORDS[0]} ${TEST_CONFIG.DHANMONDI_COORDS[1]})`,
          driver_details: {
            license_number: 'DH123456',
            car_model: 'Toyota Corolla',
            capacity: 3
          }
        })
        .select()
        .single()
      
      if (driverSqlError) {
        console.log(`   ❌ Alternative driver creation failed: ${driverSqlError.message}`)
        console.log('   Skipping to database check...')
        await checkExistingData(supabase)
        return
      } else {
        console.log('   ✅ Driver created via alternative method')
        users.push(driverData)
      }
    } else {
      console.log('   ✅ Driver created')
      users.push({ id: driverId, email: driverEmail, full_name: 'Ahmed Rahman', default_role: 'DRIVER' })
    }
    
    // Create riders
    for (let i = 1; i <= 2; i++) {
      const riderId = crypto.randomUUID()
      const riderEmail = `testrider${i}${timestamp}@northsouth.edu`
      const riderName = i === 1 ? 'Fatima Khan' : 'Sakib Hassan'
      
      console.log(`   Creating rider ${i}...`)
      const { data: riderData, error: riderError } = await supabase
        .from('users')
        .insert({
          id: riderId,
          email: riderEmail,
          full_name: riderName,
          default_role: 'RIDER',
          home_location_coords: `POINT(${TEST_CONFIG.DHANMONDI_COORDS[0] + (i * 0.001)} ${TEST_CONFIG.DHANMONDI_COORDS[1] + (i * 0.001)})`,
          driver_details: null
        })
        .select()
        .single()
      
      if (riderError) {
        console.log(`   ❌ Rider ${i} creation failed: ${riderError.message}`)
      } else {
        console.log(`   ✅ Rider ${i} created`)
        users.push(riderData)
      }
    }
    
    console.log(`   📊 Created ${users.length} users`)
    
    // Step 2: Create pickup locations and opt-ins
    console.log('\n📍 Creating locations and opt-ins...')
    
    const optIns = []
    for (const user of users) {
      // Create pickup location
      const { data: locationData, error: locationError } = await supabase
        .from('pickup_locations')
        .insert({
          user_id: user.id,
          name: 'Dhanmondi',
          description: 'Dhanmondi area, Dhaka',
          coords: `POINT(${TEST_CONFIG.DHANMONDI_COORDS[0]} ${TEST_CONFIG.DHANMONDI_COORDS[1]})`,
          is_default: true
        })
        .select()
        .single()
      
      if (locationError) {
        console.log(`   ❌ Location creation failed for ${user.full_name}: ${locationError.message}`)
        continue
      }
      
      // Create opt-in
      const { data: optInData, error: optInError } = await supabase
        .from('daily_opt_ins')
        .insert({
          user_id: user.id,
          commute_date: TEST_CONFIG.TEST_DATE,
          time_window_start: TEST_CONFIG.TIME_WINDOW.start,
          time_window_end: TEST_CONFIG.TIME_WINDOW.end,
          pickup_location_id: locationData.id,
          status: 'PENDING_MATCH'
        })
        .select()
        .single()
      
      if (optInError) {
        console.log(`   ❌ Opt-in creation failed for ${user.full_name}: ${optInError.message}`)
      } else {
        console.log(`   ✅ ${user.full_name} opted in`)
        optIns.push(optInData)
      }
    }
    
    console.log(`   📊 Created ${optIns.length} opt-ins`)
    
    // Step 3: Test AI matching
    console.log('\n🤖 Testing AI matching...')
    
    const { data: matchResult, error: matchError } = await supabase.functions.invoke('daily-matching', {
      body: {
        date: TEST_CONFIG.TEST_DATE,
        dryRun: false
      }
    })
    
    if (matchError) {
      console.log(`   ❌ Matching failed: ${matchError.message}`)
    } else {
      console.log('   ✅ Matching function completed')
      console.log('   📊 Result:', JSON.stringify(matchResult, null, 2))
    }
    
    // Step 4: Check results
    await checkExistingData(supabase)
    
    // Step 5: Cleanup
    console.log('\n🧹 Cleaning up...')
    const userIds = users.map(u => u.id)
    
    if (userIds.length > 0) {
      await supabase.from('ride_participants').delete().in('user_id', userIds)
      await supabase.from('matched_rides').delete().in('driver_user_id', userIds)
      await supabase.from('daily_opt_ins').delete().in('user_id', userIds)
      await supabase.from('pickup_locations').delete().in('user_id', userIds)
      await supabase.from('users').delete().in('id', userIds)
      
      console.log('   ✅ Test data cleaned up')
    }
    
    console.log('\n✅ Simple test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

async function checkExistingData(supabase) {
  console.log('\n🔍 Checking database state...')
  
  // Check users
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, default_role, email')
    .order('created_at', { ascending: false })
    .limit(5)
  
  console.log(`   👥 Recent users: ${users?.length || 0}`)
  users?.forEach(user => {
    console.log(`      ${user.full_name} (${user.default_role})`)
  })
  
  // Check opt-ins for test date
  const { data: optIns } = await supabase
    .from('daily_opt_ins')
    .select(`
      id, status,
      user:users(full_name, default_role)
    `)
    .eq('commute_date', TEST_CONFIG.TEST_DATE)
  
  console.log(`   ✋ Opt-ins for ${TEST_CONFIG.TEST_DATE}: ${optIns?.length || 0}`)
  optIns?.forEach(optIn => {
    console.log(`      ${optIn.user?.full_name} (${optIn.user?.default_role}) - ${optIn.status}`)
  })
  
  // Check matches
  const { data: matches } = await supabase
    .from('matched_rides')
    .select('id, status, driver_user_id')
    .eq('commute_date', TEST_CONFIG.TEST_DATE)
  
  console.log(`   🎯 Matches for ${TEST_CONFIG.TEST_DATE}: ${matches?.length || 0}`)
  matches?.forEach(match => {
    console.log(`      Match ${match.id} - ${match.status}`)
  })
}

// Run the test
runSimpleTest()
