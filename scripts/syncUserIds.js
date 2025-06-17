#!/usr/bin/env node

/**
 * Sync User IDs Script
 * 
 * This script syncs database user IDs with auth user IDs to fix the profile-setup redirect issue.
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
  console.log('🔄 Syncing User IDs')
  console.log('===================')
  
  try {
    // Get all auth users
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      throw new Error(`Failed to get auth users: ${authError.message}`)
    }
    
    const testEmails = [
      'driver.test@nsu.edu',
      'rider1.test@nsu.edu',
      'rider2.test@nsu.edu'
    ]
    
    for (const email of testEmails) {
      await syncUserIds(email, authUsers)
    }
    
    console.log('\n✅ User ID sync completed!')
    console.log('\n🎯 You can now login without profile-setup redirects')
    console.log('\n📋 Test credentials:')
    testEmails.forEach(email => {
      console.log(`   • ${email} / TestPassword123!`)
    })
    
  } catch (error) {
    console.error('❌ Error syncing user IDs:', error.message)
  }
}

async function syncUserIds(email, authUsers) {
  console.log(`\n👤 Syncing IDs for: ${email}`)
  
  // Find auth user
  const authUser = authUsers.find(u => u.email === email)
  
  if (!authUser) {
    console.log(`   ❌ Auth user not found`)
    return
  }
  
  console.log(`   📋 Target auth ID: ${authUser.id}`)
  
  // Find current database user
  const { data: currentDbUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
  
  if (fetchError) {
    console.log(`   ❌ Database user not found: ${fetchError.message}`)
    return
  }
  
  console.log(`   📋 Current database ID: ${currentDbUser.id}`)
  
  if (authUser.id === currentDbUser.id) {
    console.log(`   ✅ IDs already match - no sync needed`)
    return
  }
  
  console.log(`   🔄 IDs don't match - syncing...`)
  
  // Step 1: Delete any existing user with the target auth ID
  const { error: deleteExistingError } = await supabase
    .from('users')
    .delete()
    .eq('id', authUser.id)
  
  if (deleteExistingError) {
    console.log(`   ⚠️  Warning deleting existing user with auth ID: ${deleteExistingError.message}`)
  }
  
  // Step 2: Update related tables to use the new ID
  console.log(`   📝 Updating related records...`)
  
  // Update pickup_locations
  const { error: locationsError } = await supabase
    .from('pickup_locations')
    .update({ user_id: authUser.id })
    .eq('user_id', currentDbUser.id)
  
  if (locationsError) {
    console.log(`   ⚠️  Warning updating pickup locations: ${locationsError.message}`)
  } else {
    console.log(`   ✅ Updated pickup locations`)
  }
  
  // Update daily_opt_ins
  const { error: optInsError } = await supabase
    .from('daily_opt_ins')
    .update({ user_id: authUser.id })
    .eq('user_id', currentDbUser.id)
  
  if (optInsError) {
    console.log(`   ⚠️  Warning updating daily opt-ins: ${optInsError.message}`)
  } else {
    console.log(`   ✅ Updated daily opt-ins`)
  }
  
  // Update matched_rides (driver_user_id)
  const { error: ridesError } = await supabase
    .from('matched_rides')
    .update({ driver_user_id: authUser.id })
    .eq('driver_user_id', currentDbUser.id)
  
  if (ridesError) {
    console.log(`   ⚠️  Warning updating matched rides: ${ridesError.message}`)
  } else {
    console.log(`   ✅ Updated matched rides`)
  }
  
  // Update ride_participants
  const { error: participantsError } = await supabase
    .from('ride_participants')
    .update({ user_id: authUser.id })
    .eq('user_id', currentDbUser.id)
  
  if (participantsError) {
    console.log(`   ⚠️  Warning updating ride participants: ${participantsError.message}`)
  } else {
    console.log(`   ✅ Updated ride participants`)
  }
  
  // Step 3: Create new user record with correct ID
  console.log(`   📝 Creating user with correct auth ID...`)
  
  const newUserData = {
    ...currentDbUser,
    id: authUser.id, // Use the auth user ID
    updated_at: new Date().toISOString()
  }
  
  // Remove the old user first
  const { error: deleteOldError } = await supabase
    .from('users')
    .delete()
    .eq('id', currentDbUser.id)
  
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
      .insert(currentDbUser)
    
    return
  }
  
  console.log(`   ✅ Created user with correct auth ID`)
  console.log(`   📋 New user ID: ${newUser.id}`)
  console.log(`   📋 Full name: "${newUser.full_name}"`)
  
  // Step 4: Verify the sync worked
  const { data: verifyUser, error: verifyError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()
  
  if (verifyError) {
    console.log(`   ❌ Verification failed: ${verifyError.message}`)
  } else {
    console.log(`   ✅ Sync verified - AuthContext will now find user`)
  }
}

// Run the script
main().catch(console.error)
