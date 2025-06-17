#!/usr/bin/env node

/**
 * Sync Auth and Database Users Script
 * 
 * This script properly syncs Supabase Auth users with database users
 * by handling foreign key constraints properly.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TEST_USERS = [
  {
    email: 'driver.test@nsu.edu',
    password: 'TestPassword123!',
    full_name: 'Ahmed Rahman (Test Driver)',
    default_role: 'DRIVER',
    home_coords: [90.3742, 23.7461], // Dhanmondi 27
    home_address: 'Dhanmondi 27, Dhaka, Bangladesh'
  },
  {
    email: 'rider1.test@nsu.edu',
    password: 'TestPassword123!',
    full_name: 'Student 1 (Test Rider)',
    default_role: 'RIDER',
    home_coords: [90.3712, 23.7501], // Dhanmondi 15
    home_address: 'Dhanmondi 15, Dhaka, Bangladesh'
  },
  {
    email: 'rider2.test@nsu.edu',
    password: 'TestPassword123!',
    full_name: 'Student 2 (Test Rider)',
    default_role: 'RIDER',
    home_coords: [90.3772, 23.7431], // Dhanmondi 32
    home_address: 'Dhanmondi 32, Dhaka, Bangladesh'
  }
]

async function main() {
  console.log('🔄 Syncing Auth and Database Users')
  console.log('===================================')
  
  try {
    // First, get all auth users
    const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      throw new Error(`Failed to list auth users: ${listError.message}`)
    }
    
    console.log(`📋 Found ${authUsers.length} auth users`)
    
    for (const testUser of TEST_USERS) {
      await syncUser(testUser, authUsers)
    }
    
    console.log('\n✅ All users synced successfully')
    console.log('\n🎯 You can now login with these credentials:')
    TEST_USERS.forEach(user => {
      console.log(`   • ${user.email} / ${user.password}`)
    })
    
  } catch (error) {
    console.error('❌ Error syncing users:', error.message)
  }
}

async function syncUser(testUser, authUsers) {
  console.log(`\n👤 Syncing user: ${testUser.email}`)
  
  // Find the auth user
  const authUser = authUsers.find(u => u.email === testUser.email)
  
  if (!authUser) {
    console.log(`   ❌ Auth user not found for ${testUser.email}`)
    return
  }
  
  console.log(`   📋 Auth user ID: ${authUser.id}`)
  
  // Check if database user exists with this auth ID
  const { data: existingDbUser, error: checkError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()
  
  if (checkError && checkError.code !== 'PGRST116') {
    console.log(`   ❌ Error checking database user: ${checkError.message}`)
    return
  }
  
  if (existingDbUser) {
    console.log(`   ✅ Database user already exists with correct auth ID`)
    return
  }
  
  // Check if there's a database user with the same email but different ID
  const { data: emailDbUser, error: emailError } = await supabase
    .from('users')
    .select('*')
    .eq('email', testUser.email)
    .single()
  
  if (emailError && emailError.code !== 'PGRST116') {
    console.log(`   ❌ Error checking database user by email: ${emailError.message}`)
    return
  }
  
  if (emailDbUser) {
    console.log(`   🔄 Database user exists with different ID, need to recreate...`)
    
    // Delete the old database user (this will cascade delete related records)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('email', testUser.email)
    
    if (deleteError) {
      console.log(`   ❌ Error deleting old database user: ${deleteError.message}`)
      return
    }
    
    console.log(`   ✅ Old database user deleted`)
  }
  
  // Create new database user with correct auth ID
  const newDbUser = {
    id: authUser.id,
    email: testUser.email,
    full_name: testUser.full_name,
    default_role: testUser.default_role,
    home_location_coords: `POINT(${testUser.home_coords[0]} ${testUser.home_coords[1]})`,
    home_location_address: testUser.home_address,
    driver_details: testUser.default_role === 'DRIVER' ? {
      car_model: 'Toyota Corolla',
      car_color: 'White',
      license_plate: 'DHA-1234',
      capacity: 4
    } : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  const { data: createdUser, error: createError } = await supabase
    .from('users')
    .insert(newDbUser)
    .select()
    .single()
  
  if (createError) {
    console.log(`   ❌ Error creating database user: ${createError.message}`)
    return
  }
  
  console.log(`   ✅ Database user created with auth ID: ${createdUser.id}`)
  
  // Create default pickup location
  const pickupLocation = {
    user_id: authUser.id,
    name: testUser.home_address.split(',')[0], // First part of address
    description: `Default pickup location at ${testUser.home_address}`,
    coords: `POINT(${testUser.home_coords[0]} ${testUser.home_coords[1]})`,
    is_default: true
  }
  
  const { error: locationError } = await supabase
    .from('pickup_locations')
    .insert(pickupLocation)
  
  if (locationError) {
    console.log(`   ⚠️  Warning: Could not create pickup location: ${locationError.message}`)
  } else {
    console.log(`   ✅ Default pickup location created`)
  }
}

// Run the script
main().catch(console.error)
