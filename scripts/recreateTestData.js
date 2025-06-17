#!/usr/bin/env node

/**
 * Recreate Test Data Script
 * 
 * This script recreates pickup locations and opt-ins for the fixed test users.
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
  console.log('🔄 Recreating Test Data')
  console.log('=======================')
  
  try {
    // Get the fixed users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, default_role')
      .in('email', ['driver.test@nsu.edu', 'rider1.test@nsu.edu', 'rider2.test@nsu.edu'])
    
    if (usersError) {
      throw new Error(`Failed to get users: ${usersError.message}`)
    }
    
    console.log(`\n📋 Found ${users.length} users:`)
    users.forEach(user => {
      console.log(`   • ${user.email} - "${user.full_name}" (${user.default_role})`)
      console.log(`     ID: ${user.id}`)
    })
    
    // Step 1: Create pickup locations
    console.log('\n📍 Creating pickup locations...')
    await createPickupLocations(users)
    
    // Step 2: Create opt-ins
    console.log('\n✋ Creating opt-ins...')
    await createOptIns(users)
    
    console.log('\n✅ Test data recreation completed!')
    console.log('\n🎯 You can now login and test the application')
    console.log('\n📋 Test credentials:')
    users.forEach(user => {
      console.log(`   • ${user.email} / TestPassword123!`)
    })
    
  } catch (error) {
    console.error('❌ Error recreating test data:', error.message)
  }
}

async function createPickupLocations(users) {
  const locations = [
    {
      user_id: users.find(u => u.email === 'driver.test@nsu.edu')?.id,
      name: 'Dhanmondi 27',
      description: 'Pickup point at Dhanmondi 27',
      coords: 'POINT(90.3742 23.7461)',
      is_default: true
    },
    {
      user_id: users.find(u => u.email === 'rider1.test@nsu.edu')?.id,
      name: 'Dhanmondi 15',
      description: 'Pickup point at Dhanmondi 15',
      coords: 'POINT(90.3712 23.7501)',
      is_default: true
    },
    {
      user_id: users.find(u => u.email === 'rider2.test@nsu.edu')?.id,
      name: 'Dhanmondi 32',
      description: 'Pickup point at Dhanmondi 32',
      coords: 'POINT(90.3772 23.7431)',
      is_default: true
    }
  ]
  
  // Delete existing pickup locations first
  for (const user of users) {
    const { error: deleteError } = await supabase
      .from('pickup_locations')
      .delete()
      .eq('user_id', user.id)
    
    if (deleteError) {
      console.log(`   ⚠️  Warning deleting old locations for ${user.email}: ${deleteError.message}`)
    }
  }
  
  // Create new pickup locations
  for (const location of locations) {
    if (!location.user_id) {
      console.log(`   ❌ User not found for location: ${location.name}`)
      continue
    }
    
    const { error } = await supabase
      .from('pickup_locations')
      .insert(location)
    
    if (error) {
      console.log(`   ❌ Error creating location ${location.name}: ${error.message}`)
    } else {
      console.log(`   ✅ Created pickup location: ${location.name}`)
    }
  }
}

async function createOptIns(users) {
  // Delete existing opt-ins first
  for (const user of users) {
    const { error: deleteError } = await supabase
      .from('daily_opt_ins')
      .delete()
      .eq('user_id', user.id)
      .eq('commute_date', TEST_DATE)
    
    if (deleteError) {
      console.log(`   ⚠️  Warning deleting old opt-ins for ${user.email}: ${deleteError.message}`)
    }
  }
  
  // Get the created pickup locations
  const { data: locations, error: locationsError } = await supabase
    .from('pickup_locations')
    .select('id, user_id, name')
    .in('user_id', users.map(u => u.id))
  
  if (locationsError) {
    console.log(`   ❌ Error getting pickup locations: ${locationsError.message}`)
    return
  }
  
  // Create opt-ins
  const optIns = users.map(user => {
    const location = locations.find(loc => loc.user_id === user.id)
    
    return {
      user_id: user.id,
      commute_date: TEST_DATE,
      time_window_start: '08:30:00',
      time_window_end: '09:30:00',
      pickup_location_id: location?.id || null,
      status: 'PENDING_MATCH'
    }
  })
  
  for (const optIn of optIns) {
    const user = users.find(u => u.id === optIn.user_id)
    
    const { error } = await supabase
      .from('daily_opt_ins')
      .insert(optIn)
    
    if (error) {
      console.log(`   ❌ Error creating opt-in for ${user.email}: ${error.message}`)
    } else {
      console.log(`   ✅ Created opt-in for ${user.email} (${user.default_role})`)
    }
  }
}

// Run the script
main().catch(console.error)
