#!/usr/bin/env node

/**
 * Check Auth-Database Sync Script
 * 
 * This script checks if auth user IDs match database user IDs.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('🔍 Checking Auth-Database Sync')
  console.log('==============================')
  
  try {
    // Get all auth users
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      throw new Error(`Failed to get auth users: ${authError.message}`)
    }
    
    console.log(`\n📋 Found ${authUsers.length} auth users`)
    
    const testEmails = [
      'driver.test@nsu.edu',
      'rider1.test@nsu.edu',
      'rider2.test@nsu.edu'
    ]
    
    for (const email of testEmails) {
      await checkUserSync(email, authUsers)
    }
    
    console.log('\n🎯 Summary:')
    console.log('If any users show ID mismatch, that explains the profile-setup redirect.')
    console.log('The AuthContext looks for database users by auth user ID.')
    
  } catch (error) {
    console.error('❌ Error checking sync:', error.message)
  }
}

async function checkUserSync(email, authUsers) {
  console.log(`\n👤 Checking sync for: ${email}`)
  
  // Find auth user
  const authUser = authUsers.find(u => u.email === email)
  
  if (!authUser) {
    console.log(`   ❌ Auth user not found`)
    return
  }
  
  console.log(`   📋 Auth user ID: ${authUser.id}`)
  
  // Find database user by email
  const { data: dbUserByEmail, error: emailError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
  
  if (emailError) {
    console.log(`   ❌ Database user not found by email: ${emailError.message}`)
    return
  }
  
  console.log(`   📋 Database user ID: ${dbUserByEmail.id}`)
  console.log(`   📋 Database user name: "${dbUserByEmail.full_name}"`)
  
  // Check if IDs match
  if (authUser.id === dbUserByEmail.id) {
    console.log(`   ✅ IDs match - sync is correct`)
  } else {
    console.log(`   ❌ ID MISMATCH - this causes profile-setup redirect!`)
    
    // Check if there's a database user with the auth ID
    const { data: dbUserByAuthId, error: authIdError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()
    
    if (authIdError) {
      console.log(`   📋 No database user with auth ID ${authUser.id}`)
      console.log(`   🔧 Need to update database user ID or create new user`)
    } else {
      console.log(`   📋 Found database user with auth ID: ${dbUserByAuthId.email}`)
      console.log(`   🔧 Multiple users with same email - need cleanup`)
    }
    
    // Suggest fix
    console.log(`   💡 Fix: Update database user ID from ${dbUserByEmail.id} to ${authUser.id}`)
  }
  
  // Test what AuthContext would find
  const { data: authContextUser, error: contextError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()
  
  if (contextError) {
    console.log(`   🔍 AuthContext lookup: FAILS - ${contextError.message}`)
    console.log(`   📝 This explains why user gets redirected to profile-setup`)
  } else {
    console.log(`   🔍 AuthContext lookup: SUCCESS - finds "${contextUser.full_name}"`)
  }
}

// Run the script
main().catch(console.error)
