#!/usr/bin/env node

/**
 * Fix Driver User Sync Script
 * 
 * This script fixes the driver user sync by updating foreign key references.
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
  console.log('🔧 Fixing Driver User Sync')
  console.log('==========================')
  
  try {
    // Get the auth user for driver
    const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      throw new Error(`Failed to list auth users: ${listError.message}`)
    }
    
    const driverAuthUser = authUsers.find(u => u.email === 'driver.test@nsu.edu')
    
    if (!driverAuthUser) {
      console.log('❌ Driver auth user not found')
      return
    }
    
    console.log(`📋 Driver auth user ID: ${driverAuthUser.id}`)
    
    // Get the current database user
    const { data: currentDbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'driver.test@nsu.edu')
      .single()
    
    if (dbError) {
      console.log(`❌ Error getting current database user: ${dbError.message}`)
      return
    }
    
    console.log(`📋 Current database user ID: ${currentDbUser.id}`)
    
    if (currentDbUser.id === driverAuthUser.id) {
      console.log('✅ Driver user already synced correctly')
      return
    }
    
    // Update matched_rides to use the new auth user ID
    const { data: matchedRides, error: matchesError } = await supabase
      .from('matched_rides')
      .select('id')
      .eq('driver_user_id', currentDbUser.id)
    
    if (matchesError) {
      console.log(`❌ Error getting matched rides: ${matchesError.message}`)
      return
    }
    
    console.log(`📋 Found ${matchedRides.length} matched rides to update`)
    
    if (matchedRides.length > 0) {
      const { error: updateMatchesError } = await supabase
        .from('matched_rides')
        .update({ driver_user_id: driverAuthUser.id })
        .eq('driver_user_id', currentDbUser.id)
      
      if (updateMatchesError) {
        console.log(`❌ Error updating matched rides: ${updateMatchesError.message}`)
        return
      }
      
      console.log(`✅ Updated ${matchedRides.length} matched rides`)
    }
    
    // Update ride_participants
    const { data: participants, error: participantsError } = await supabase
      .from('ride_participants')
      .select('id')
      .eq('user_id', currentDbUser.id)
    
    if (participantsError) {
      console.log(`❌ Error getting ride participants: ${participantsError.message}`)
      return
    }
    
    console.log(`📋 Found ${participants.length} ride participants to update`)
    
    if (participants.length > 0) {
      const { error: updateParticipantsError } = await supabase
        .from('ride_participants')
        .update({ user_id: driverAuthUser.id })
        .eq('user_id', currentDbUser.id)
      
      if (updateParticipantsError) {
        console.log(`❌ Error updating ride participants: ${updateParticipantsError.message}`)
        return
      }
      
      console.log(`✅ Updated ${participants.length} ride participants`)
    }
    
    // Update daily_opt_ins
    const { data: optIns, error: optInsError } = await supabase
      .from('daily_opt_ins')
      .select('id')
      .eq('user_id', currentDbUser.id)
    
    if (optInsError) {
      console.log(`❌ Error getting daily opt-ins: ${optInsError.message}`)
      return
    }
    
    console.log(`📋 Found ${optIns.length} daily opt-ins to update`)
    
    if (optIns.length > 0) {
      const { error: updateOptInsError } = await supabase
        .from('daily_opt_ins')
        .update({ user_id: driverAuthUser.id })
        .eq('user_id', currentDbUser.id)
      
      if (updateOptInsError) {
        console.log(`❌ Error updating daily opt-ins: ${updateOptInsError.message}`)
        return
      }
      
      console.log(`✅ Updated ${optIns.length} daily opt-ins`)
    }
    
    // Update pickup_locations
    const { data: locations, error: locationsError } = await supabase
      .from('pickup_locations')
      .select('id')
      .eq('user_id', currentDbUser.id)
    
    if (locationsError) {
      console.log(`❌ Error getting pickup locations: ${locationsError.message}`)
      return
    }
    
    console.log(`📋 Found ${locations.length} pickup locations to update`)
    
    if (locations.length > 0) {
      const { error: updateLocationsError } = await supabase
        .from('pickup_locations')
        .update({ user_id: driverAuthUser.id })
        .eq('user_id', currentDbUser.id)
      
      if (updateLocationsError) {
        console.log(`❌ Error updating pickup locations: ${updateLocationsError.message}`)
        return
      }
      
      console.log(`✅ Updated ${locations.length} pickup locations`)
    }
    
    // Now update the user ID
    const { error: updateUserError } = await supabase
      .from('users')
      .update({ id: driverAuthUser.id })
      .eq('id', currentDbUser.id)
    
    if (updateUserError) {
      console.log(`❌ Error updating user ID: ${updateUserError.message}`)
      return
    }
    
    console.log(`✅ Driver user ID updated to match auth user`)
    
    console.log('\n🎯 Driver user sync completed successfully!')
    console.log('You can now login with: driver.test@nsu.edu / TestPassword123!')
    
  } catch (error) {
    console.error('❌ Error fixing driver user sync:', error.message)
  }
}

// Run the script
main().catch(console.error)
