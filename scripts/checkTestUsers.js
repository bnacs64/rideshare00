#!/usr/bin/env node

/**
 * Check Test Users Script
 * 
 * This script checks the profile completeness of test users
 * and fixes any issues that might cause profile-setup redirects.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TEST_EMAILS = [
  'driver.test@nsu.edu',
  'rider1.test@nsu.edu',
  'rider2.test@nsu.edu',
  'gulshan0@akshathe.xyz',
  'dhanmondi0@akshathe.xyz'
]

async function main() {
  console.log('🔍 Checking Test User Profiles')
  console.log('==============================')
  
  try {
    for (const email of TEST_EMAILS) {
      await checkAndFixUser(email)
    }
    
    console.log('\n✅ All test users checked and fixed if needed')
    console.log('\n🎯 You can now test login with any of these accounts:')
    TEST_EMAILS.forEach(email => {
      console.log(`   • ${email} (password: TestPassword123!)`)
    })
    
  } catch (error) {
    console.error('❌ Error checking test users:', error.message)
  }
}

async function checkAndFixUser(email) {
  console.log(`\n👤 Checking user: ${email}`)
  
  // Get user from database
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      console.log(`   ❌ User not found: ${email}`)
      return
    } else {
      console.log(`   ❌ Error fetching user: ${error.message}`)
      return
    }
  }
  
  console.log(`   📋 Profile status:`)
  console.log(`      ID: ${user.id}`)
  console.log(`      Email: ${user.email}`)
  console.log(`      Full Name: "${user.full_name || 'EMPTY'}"`)
  console.log(`      Role: ${user.default_role}`)
  console.log(`      Home Address: "${user.home_location_address || 'EMPTY'}"`)
  
  // Check if profile is complete
  const isComplete = user.full_name && user.full_name.trim() !== ''
  
  if (isComplete) {
    console.log(`   ✅ Profile is complete`)
  } else {
    console.log(`   ⚠️  Profile is incomplete - fixing...`)
    
    // Fix the profile
    const updates = {}
    
    if (!user.full_name || user.full_name.trim() === '') {
      if (email.includes('driver.test')) {
        updates.full_name = 'Ahmed Rahman (Test Driver)'
      } else if (email.includes('rider1.test')) {
        updates.full_name = 'Student 1 (Test Rider)'
      } else if (email.includes('rider2.test')) {
        updates.full_name = 'Student 2 (Test Rider)'
      } else if (email.includes('gulshan0')) {
        updates.full_name = 'Gulshan User (Test)'
      } else if (email.includes('dhanmondi0')) {
        updates.full_name = 'Dhanmondi User (Test)'
      } else {
        updates.full_name = 'Test User'
      }
    }
    
    if (!user.home_location_address || user.home_location_address.trim() === '') {
      updates.home_location_address = 'Dhanmondi, Dhaka, Bangladesh'
    }
    
    // Update the user
    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
    
    if (updateError) {
      console.log(`   ❌ Error updating user: ${updateError.message}`)
    } else {
      console.log(`   ✅ Profile fixed:`)
      console.log(`      Full Name: "${updates.full_name}"`)
      if (updates.home_location_address) {
        console.log(`      Home Address: "${updates.home_location_address}"`)
      }
    }
  }
  
  // Check pickup locations
  const { data: locations, error: locError } = await supabase
    .from('pickup_locations')
    .select('id, name, is_default')
    .eq('user_id', user.id)
  
  if (locError) {
    console.log(`   ⚠️  Error checking pickup locations: ${locError.message}`)
  } else {
    console.log(`   📍 Pickup locations: ${locations.length}`)
    if (locations.length > 0) {
      locations.forEach(loc => {
        console.log(`      - ${loc.name} ${loc.is_default ? '(default)' : ''}`)
      })
    }
  }
}

// Run the script
main().catch(console.error)
