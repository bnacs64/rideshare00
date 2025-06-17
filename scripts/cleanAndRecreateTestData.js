#!/usr/bin/env node

/**
 * Clean and Recreate Test Data Script
 * 
 * This script cleans all test data and recreates it with correct auth user IDs.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TEST_DATE = '2025-06-18'

async function main() {
  console.log('🧹 Cleaning and Recreating Test Data')
  console.log('====================================')
  
  try {
    // Step 1: Clean all test data
    console.log('\n🗑️  Cleaning existing test data...')
    await cleanTestData()
    
    // Step 2: Get auth users
    console.log('\n👥 Getting auth users...')
    const authUsers = await getAuthUsers()
    
    // Step 3: Recreate database users with correct IDs
    console.log('\n🔄 Recreating database users...')
    await recreateDbUsers(authUsers)
    
    // Step 4: Recreate test scenario
    console.log('\n🎯 Recreating test scenario...')
    await recreateTestScenario(authUsers)
    
    console.log('\n✅ Test data recreated successfully!')
    console.log('\n🎯 You can now login with these credentials:')
    console.log('   • driver.test@nsu.edu / TestPassword123!')
    console.log('   • rider1.test@nsu.edu / TestPassword123!')
    console.log('   • rider2.test@nsu.edu / TestPassword123!')
    console.log('   • gulshan0@akshathe.xyz / TestPassword123!')
    console.log('   • dhanmondi0@akshathe.xyz / TestPassword123!')
    
  } catch (error) {
    console.error('❌ Error recreating test data:', error.message)
  }
}

async function cleanTestData() {
  // Delete in order to respect foreign key constraints
  
  // 1. Delete ride participants
  const { error: participantsError } = await supabase
    .from('ride_participants')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
  
  if (participantsError) {
    console.log(`   ⚠️  Warning deleting participants: ${participantsError.message}`)
  } else {
    console.log('   ✅ Ride participants deleted')
  }
  
  // 2. Delete matched rides
  const { error: ridesError } = await supabase
    .from('matched_rides')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
  
  if (ridesError) {
    console.log(`   ⚠️  Warning deleting rides: ${ridesError.message}`)
  } else {
    console.log('   ✅ Matched rides deleted')
  }
  
  // 3. Delete daily opt-ins
  const { error: optInsError } = await supabase
    .from('daily_opt_ins')
    .delete()
    .eq('commute_date', TEST_DATE)
  
  if (optInsError) {
    console.log(`   ⚠️  Warning deleting opt-ins: ${optInsError.message}`)
  } else {
    console.log('   ✅ Daily opt-ins deleted')
  }
  
  // 4. Delete pickup locations for test users
  const testEmails = [
    'driver.test@nsu.edu',
    'rider1.test@nsu.edu',
    'rider2.test@nsu.edu'
  ]
  
  for (const email of testEmails) {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()
    
    if (user) {
      const { error: locError } = await supabase
        .from('pickup_locations')
        .delete()
        .eq('user_id', user.id)
      
      if (locError) {
        console.log(`   ⚠️  Warning deleting locations for ${email}: ${locError.message}`)
      }
    }
  }
  
  console.log('   ✅ Pickup locations deleted')
  
  // 5. Delete test users from database
  for (const email of testEmails) {
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('email', email)
    
    if (userError) {
      console.log(`   ⚠️  Warning deleting user ${email}: ${userError.message}`)
    }
  }
  
  console.log('   ✅ Test users deleted from database')
}

async function getAuthUsers() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    throw new Error(`Failed to get auth users: ${error.message}`)
  }
  
  const testUsers = {
    driver: users.find(u => u.email === 'driver.test@nsu.edu'),
    rider1: users.find(u => u.email === 'rider1.test@nsu.edu'),
    rider2: users.find(u => u.email === 'rider2.test@nsu.edu'),
    gulshan0: users.find(u => u.email === 'gulshan0@akshathe.xyz'),
    dhanmondi0: users.find(u => u.email === 'dhanmondi0@akshathe.xyz')
  }
  
  console.log('   📋 Auth user IDs:')
  Object.entries(testUsers).forEach(([key, user]) => {
    if (user) {
      console.log(`      ${key}: ${user.id}`)
    } else {
      console.log(`      ${key}: NOT FOUND`)
    }
  })
  
  return testUsers
}

async function recreateDbUsers(authUsers) {
  const dbUsers = [
    {
      id: authUsers.driver.id,
      email: 'driver.test@nsu.edu',
      full_name: 'Ahmed Rahman (Test Driver)',
      default_role: 'DRIVER',
      home_location_coords: 'POINT(90.3742 23.7461)',
      home_location_address: 'Dhanmondi 27, Dhaka, Bangladesh',
      driver_details: {
        car_model: 'Toyota Corolla',
        car_color: 'White',
        license_plate: 'DHA-1234',
        capacity: 4
      }
    },
    {
      id: authUsers.rider1.id,
      email: 'rider1.test@nsu.edu',
      full_name: 'Student 1 (Test Rider)',
      default_role: 'RIDER',
      home_location_coords: 'POINT(90.3712 23.7501)',
      home_location_address: 'Dhanmondi 15, Dhaka, Bangladesh',
      driver_details: null
    },
    {
      id: authUsers.rider2.id,
      email: 'rider2.test@nsu.edu',
      full_name: 'Student 2 (Test Rider)',
      default_role: 'RIDER',
      home_location_coords: 'POINT(90.3772 23.7431)',
      home_location_address: 'Dhanmondi 32, Dhaka, Bangladesh',
      driver_details: null
    }
  ]
  
  for (const user of dbUsers) {
    const { error } = await supabase
      .from('users')
      .insert(user)
    
    if (error) {
      console.log(`   ❌ Error creating ${user.email}: ${error.message}`)
    } else {
      console.log(`   ✅ Created ${user.email}`)
    }
  }
}

async function recreateTestScenario(authUsers) {
  // Create pickup locations
  const locations = [
    {
      user_id: authUsers.driver.id,
      name: 'Dhanmondi 27',
      description: 'Pickup point at Dhanmondi 27',
      coords: 'POINT(90.3742 23.7461)',
      is_default: true
    },
    {
      user_id: authUsers.rider1.id,
      name: 'Dhanmondi 15',
      description: 'Pickup point at Dhanmondi 15',
      coords: 'POINT(90.3712 23.7501)',
      is_default: true
    },
    {
      user_id: authUsers.rider2.id,
      name: 'Dhanmondi 32',
      description: 'Pickup point at Dhanmondi 32',
      coords: 'POINT(90.3772 23.7431)',
      is_default: true
    }
  ]
  
  for (const location of locations) {
    const { error } = await supabase
      .from('pickup_locations')
      .insert(location)
    
    if (error) {
      console.log(`   ❌ Error creating location: ${error.message}`)
    } else {
      console.log(`   ✅ Created pickup location: ${location.name}`)
    }
  }
  
  // Create opt-ins
  const optIns = [
    {
      user_id: authUsers.driver.id,
      commute_date: TEST_DATE,
      time_window_start: '08:30:00',
      time_window_end: '09:30:00',
      pickup_location_id: null, // Will be set after location creation
      status: 'PENDING_MATCH'
    },
    {
      user_id: authUsers.rider1.id,
      commute_date: TEST_DATE,
      time_window_start: '08:30:00',
      time_window_end: '09:30:00',
      pickup_location_id: null,
      status: 'PENDING_MATCH'
    },
    {
      user_id: authUsers.rider2.id,
      commute_date: TEST_DATE,
      time_window_start: '08:30:00',
      time_window_end: '09:30:00',
      pickup_location_id: null,
      status: 'PENDING_MATCH'
    }
  ]
  
  // Get the created pickup locations
  const { data: createdLocations } = await supabase
    .from('pickup_locations')
    .select('id, user_id')
    .in('user_id', [authUsers.driver.id, authUsers.rider1.id, authUsers.rider2.id])
  
  // Set pickup location IDs
  optIns.forEach(optIn => {
    const location = createdLocations.find(loc => loc.user_id === optIn.user_id)
    if (location) {
      optIn.pickup_location_id = location.id
    }
  })
  
  for (const optIn of optIns) {
    const { error } = await supabase
      .from('daily_opt_ins')
      .insert(optIn)
    
    if (error) {
      console.log(`   ❌ Error creating opt-in: ${error.message}`)
    } else {
      console.log(`   ✅ Created opt-in for user: ${optIn.user_id}`)
    }
  }
}

// Run the script
main().catch(console.error)
