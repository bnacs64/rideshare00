#!/usr/bin/env node

/**
 * Complete User Sync Script
 * 
 * This script completely recreates test data with correct auth user IDs
 * to fix the profile-setup redirect issue.
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
  console.log('🔄 Complete User Sync')
  console.log('=====================')
  
  try {
    // Step 1: Get auth users
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      throw new Error(`Failed to get auth users: ${authError.message}`)
    }
    
    const testUsers = {
      driver: authUsers.find(u => u.email === 'driver.test@nsu.edu'),
      rider1: authUsers.find(u => u.email === 'rider1.test@nsu.edu'),
      rider2: authUsers.find(u => u.email === 'rider2.test@nsu.edu')
    }
    
    console.log('\n📋 Auth user IDs:')
    Object.entries(testUsers).forEach(([key, user]) => {
      if (user) {
        console.log(`   ${key}: ${user.id}`)
      } else {
        console.log(`   ${key}: NOT FOUND`)
      }
    })
    
    // Step 2: Clean all test data
    console.log('\n🧹 Cleaning all test data...')
    await cleanAllTestData()
    
    // Step 3: Recreate users with correct auth IDs
    console.log('\n👥 Creating users with correct auth IDs...')
    await createUsersWithAuthIds(testUsers)
    
    // Step 4: Create test scenario
    console.log('\n🎯 Creating test scenario...')
    await createTestScenario(testUsers)
    
    // Step 5: Verify sync
    console.log('\n✅ Verifying sync...')
    await verifySync(testUsers)
    
    console.log('\n🎉 Complete user sync finished!')
    console.log('\n🎯 You can now login without profile-setup redirects')
    console.log('\n📋 Test credentials:')
    console.log('   • driver.test@nsu.edu / TestPassword123!')
    console.log('   • rider1.test@nsu.edu / TestPassword123!')
    console.log('   • rider2.test@nsu.edu / TestPassword123!')
    
  } catch (error) {
    console.error('❌ Error in complete user sync:', error.message)
  }
}

async function cleanAllTestData() {
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
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
    
    if (users && users.length > 0) {
      for (const user of users) {
        const { error: locError } = await supabase
          .from('pickup_locations')
          .delete()
          .eq('user_id', user.id)
        
        if (locError) {
          console.log(`   ⚠️  Warning deleting locations for ${email}: ${locError.message}`)
        }
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

async function createUsersWithAuthIds(testUsers) {
  const usersToCreate = [
    {
      id: testUsers.driver.id,
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
      id: testUsers.rider1.id,
      email: 'rider1.test@nsu.edu',
      full_name: 'Student 1 (Test Rider)',
      default_role: 'RIDER',
      home_location_coords: 'POINT(90.3712 23.7501)',
      home_location_address: 'Dhanmondi 15, Dhaka, Bangladesh',
      driver_details: null
    },
    {
      id: testUsers.rider2.id,
      email: 'rider2.test@nsu.edu',
      full_name: 'Student 2 (Test Rider)',
      default_role: 'RIDER',
      home_location_coords: 'POINT(90.3772 23.7431)',
      home_location_address: 'Dhanmondi 32, Dhaka, Bangladesh',
      driver_details: null
    }
  ]
  
  for (const user of usersToCreate) {
    const { error } = await supabase
      .from('users')
      .insert(user)
    
    if (error) {
      console.log(`   ❌ Error creating ${user.email}: ${error.message}`)
    } else {
      console.log(`   ✅ Created ${user.email} with auth ID ${user.id}`)
    }
  }
}

async function createTestScenario(testUsers) {
  // Create pickup locations
  const locations = [
    {
      user_id: testUsers.driver.id,
      name: 'Dhanmondi 27',
      description: 'Pickup point at Dhanmondi 27',
      coords: 'POINT(90.3742 23.7461)',
      is_default: true
    },
    {
      user_id: testUsers.rider1.id,
      name: 'Dhanmondi 15',
      description: 'Pickup point at Dhanmondi 15',
      coords: 'POINT(90.3712 23.7501)',
      is_default: true
    },
    {
      user_id: testUsers.rider2.id,
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
      user_id: testUsers.driver.id,
      commute_date: TEST_DATE,
      time_window_start: '08:30:00',
      time_window_end: '09:30:00',
      status: 'PENDING_MATCH'
    },
    {
      user_id: testUsers.rider1.id,
      commute_date: TEST_DATE,
      time_window_start: '08:30:00',
      time_window_end: '09:30:00',
      status: 'PENDING_MATCH'
    },
    {
      user_id: testUsers.rider2.id,
      commute_date: TEST_DATE,
      time_window_start: '08:30:00',
      time_window_end: '09:30:00',
      status: 'PENDING_MATCH'
    }
  ]
  
  // Get the created pickup locations to set pickup_location_id
  const { data: createdLocations } = await supabase
    .from('pickup_locations')
    .select('id, user_id')
    .in('user_id', [testUsers.driver.id, testUsers.rider1.id, testUsers.rider2.id])
  
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

async function verifySync(testUsers) {
  const testEmails = [
    'driver.test@nsu.edu',
    'rider1.test@nsu.edu',
    'rider2.test@nsu.edu'
  ]
  
  for (const email of testEmails) {
    const authUser = Object.values(testUsers).find(u => u.email === email)
    
    if (!authUser) {
      console.log(`   ❌ Auth user not found for ${email}`)
      continue
    }
    
    // Test AuthContext lookup
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()
    
    if (error) {
      console.log(`   ❌ ${email}: AuthContext lookup FAILS - ${error.message}`)
    } else {
      console.log(`   ✅ ${email}: AuthContext lookup SUCCESS - "${user.full_name}"`)
    }
  }
}

// Run the script
main().catch(console.error)
