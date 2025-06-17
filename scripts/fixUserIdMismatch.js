#!/usr/bin/env node

/**
 * Fix User ID Mismatch Script
 * 
 * This script fixes the ID mismatch between auth and database users
 * by updating database user IDs to match auth user IDs.
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
  console.log('🔧 Fixing User ID Mismatch')
  console.log('==========================')
  
  try {
    // Get auth and database users
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw new Error(`Failed to get auth users: ${authError.message}`)
    
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
    if (dbError) throw new Error(`Failed to get database users: ${dbError.message}`)
    
    const testEmails = [
      'driver.test@nsu.edu',
      'rider1.test@nsu.edu',
      'rider2.test@nsu.edu'
    ]
    
    for (const email of testEmails) {
      await fixUserIdMismatch(email, authUsers, dbUsers)
    }
    
    console.log('\n✅ User ID mismatch fix completed!')
    console.log('\n🎯 You can now login without profile-setup redirects')
    console.log('\n📋 Test credentials:')
    testEmails.forEach(email => {
      console.log(`   • ${email} / TestPassword123!`)
    })
    
  } catch (error) {
    console.error('❌ Error fixing user ID mismatch:', error.message)
  }
}

async function fixUserIdMismatch(email, authUsers, dbUsers) {
  console.log(`\n👤 Fixing ${email}...`)
  
  // Find auth and database users
  const authUser = authUsers.find(u => u.email === email)
  const dbUser = dbUsers.find(u => u.email === email)
  
  if (!authUser) {
    console.log(`   ❌ Auth user not found`)
    return
  }
  
  if (!dbUser) {
    console.log(`   ❌ Database user not found`)
    return
  }
  
  console.log(`   📋 Auth ID: ${authUser.id}`)
  console.log(`   📋 Current DB ID: ${dbUser.id}`)
  
  if (authUser.id === dbUser.id) {
    console.log(`   ✅ IDs already match - no fix needed`)
    return
  }
  
  console.log(`   🔄 Fixing ID mismatch...`)
  
  // Step 1: Check if there's already a user with the target auth ID
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', authUser.id)
    .single()
  
  if (!checkError && existingUser) {
    console.log(`   ⚠️  User with auth ID already exists: ${existingUser.email}`)
    console.log(`   🗑️  Deleting conflicting user...`)
    
    // Delete the conflicting user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', authUser.id)
    
    if (deleteError) {
      console.log(`   ❌ Error deleting conflicting user: ${deleteError.message}`)
      return
    }
    
    console.log(`   ✅ Conflicting user deleted`)
  }
  
  // Step 2: Update related tables to use the new auth ID
  console.log(`   📝 Updating related records...`)
  
  // Update pickup_locations
  const { error: locationsError } = await supabase
    .from('pickup_locations')
    .update({ user_id: authUser.id })
    .eq('user_id', dbUser.id)
  
  if (locationsError) {
    console.log(`   ⚠️  Warning updating pickup locations: ${locationsError.message}`)
  } else {
    console.log(`   ✅ Updated pickup locations`)
  }
  
  // Update daily_opt_ins
  const { error: optInsError } = await supabase
    .from('daily_opt_ins')
    .update({ user_id: authUser.id })
    .eq('user_id', dbUser.id)
  
  if (optInsError) {
    console.log(`   ⚠️  Warning updating daily opt-ins: ${optInsError.message}`)
  } else {
    console.log(`   ✅ Updated daily opt-ins`)
  }
  
  // Update matched_rides (driver_user_id)
  const { error: ridesError } = await supabase
    .from('matched_rides')
    .update({ driver_user_id: authUser.id })
    .eq('driver_user_id', dbUser.id)
  
  if (ridesError) {
    console.log(`   ⚠️  Warning updating matched rides: ${ridesError.message}`)
  } else {
    console.log(`   ✅ Updated matched rides`)
  }
  
  // Update ride_participants
  const { error: participantsError } = await supabase
    .from('ride_participants')
    .update({ user_id: authUser.id })
    .eq('user_id', dbUser.id)
  
  if (participantsError) {
    console.log(`   ⚠️  Warning updating ride participants: ${participantsError.message}`)
  } else {
    console.log(`   ✅ Updated ride participants`)
  }
  
  // Step 3: Create new user record with correct auth ID
  console.log(`   📝 Creating user with correct auth ID...`)
  
  const newUserData = {
    ...dbUser,
    id: authUser.id, // Use the auth user ID
    updated_at: new Date().toISOString()
  }
  
  // Delete the old user record
  const { error: deleteOldError } = await supabase
    .from('users')
    .delete()
    .eq('id', dbUser.id)
  
  if (deleteOldError) {
    console.log(`   ❌ Error deleting old user: ${deleteOldError.message}`)
    return
  }
  
  console.log(`   ✅ Deleted old user record`)
  
  // Insert new user with correct ID
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert(newUserData)
    .select()
    .single()
  
  if (insertError) {
    console.log(`   ❌ Error creating new user: ${insertError.message}`)
    
    // If insert fails, try to restore the old user
    console.log(`   🔄 Attempting to restore old user...`)
    await supabase
      .from('users')
      .insert(dbUser)
    
    return
  }
  
  console.log(`   ✅ Created user with correct auth ID`)
  console.log(`   📋 New user ID: ${newUser.id}`)
  console.log(`   📋 Full name: "${newUser.full_name}"`)
  
  // Step 4: Verify the fix worked
  const { data: verifyUser, error: verifyError } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('id', authUser.id)
    .single()
  
  if (verifyError) {
    console.log(`   ❌ Verification failed: ${verifyError.message}`)
  } else {
    console.log(`   ✅ Fix verified - AuthContext will now find user`)
    console.log(`   📋 Verified: ${verifyUser.email} - "${verifyUser.full_name}"`)
  }
}

// Run the script
main().catch(console.error)
