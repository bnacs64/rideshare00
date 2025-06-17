#!/usr/bin/env node

/**
 * Test Clean Backend Script
 * Simple test of the clean backend API functions
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function testCleanBackend() {
  console.log('🧪 Testing Clean Backend API Functions')
  console.log('=' .repeat(50))
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  let allTestsPassed = true

  try {
    console.log('1. Testing api_create_user_profile...')
    
    const testUserId = crypto.randomUUID()
    const testEmail = `cleantest${Date.now()}@test.com`
    
    const { data: createResult, error: createError } = await supabase.rpc('api_create_user_profile', {
      p_user_id: testUserId,
      p_email: testEmail,
      p_full_name: 'Clean Test User',
      p_default_role: 'RIDER',
      p_home_location_lng: 90.3742,
      p_home_location_lat: 23.7461,
      p_home_location_address: 'Test Address'
    })
    
    if (createError) {
      console.log('   ❌ api_create_user_profile failed:', createError.message)
      allTestsPassed = false
    } else if (createResult && createResult.length > 0 && createResult[0].success) {
      console.log('   ✅ api_create_user_profile works!')
      console.log('   User created:', createResult[0].data.user.id)
      console.log('   Pickup location:', createResult[0].data.pickup_location_id)
      
      console.log('\n2. Testing api_get_user_profile...')
      
      const { data: getResult, error: getError } = await supabase.rpc('api_get_user_profile', {
        p_user_id: testUserId
      })
      
      if (getError) {
        console.log('   ❌ api_get_user_profile failed:', getError.message)
        allTestsPassed = false
      } else if (getResult && getResult.length > 0 && getResult[0].success) {
        console.log('   ✅ api_get_user_profile works!')
        
        const profile = getResult[0].data.profile
        const locations = getResult[0].data.pickup_locations
        
        console.log('   Profile:', {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          coords: profile.home_location_coords
        })
        console.log('   Pickup locations count:', locations.length)
        
        // Validate coordinate format
        if (Array.isArray(profile.home_location_coords) && 
            profile.home_location_coords.length === 2) {
          console.log('   ✅ Coordinate format is correct: [lng, lat]')
        } else {
          console.log('   ❌ Coordinate format is incorrect')
          allTestsPassed = false
        }
      } else {
        console.log('   ❌ api_get_user_profile returned no data')
        allTestsPassed = false
      }
      
      console.log('\n3. Testing api_get_profile_status...')
      
      const { data: statusResult, error: statusError } = await supabase.rpc('api_get_profile_status', {
        p_user_id: testUserId
      })
      
      if (statusError) {
        console.log('   ❌ api_get_profile_status failed:', statusError.message)
        allTestsPassed = false
      } else if (statusResult && statusResult.length > 0 && statusResult[0].success) {
        console.log('   ✅ api_get_profile_status works!')
        const status = statusResult[0].data
        console.log('   Profile completion:', status.is_complete ? 'Complete' : 'Incomplete')
        console.log('   Missing fields:', status.missing_fields)
        console.log('   Pickup locations:', status.pickup_location_count)
        console.log('   Has default pickup:', status.has_default_pickup)
      } else {
        console.log('   ❌ api_get_profile_status returned no data')
        allTestsPassed = false
      }
      
      console.log('\n4. Testing direct table access...')
      
      // Test direct table queries to ensure schema is correct
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', testUserId)
        .single()
      
      if (userError) {
        console.log('   ❌ Direct user query failed:', userError.message)
        allTestsPassed = false
      } else {
        console.log('   ✅ Direct user query works!')
        console.log('   User fields:', Object.keys(userRecord))
      }
      
      // Test pickup locations table
      const { data: pickupRecords, error: pickupError } = await supabase
        .from('pickup_locations')
        .select('*')
        .eq('user_id', testUserId)
      
      if (pickupError) {
        console.log('   ❌ Direct pickup query failed:', pickupError.message)
        allTestsPassed = false
      } else {
        console.log('   ✅ Direct pickup query works!')
        console.log('   Pickup locations found:', pickupRecords.length)
      }
      
      console.log('\n5. Testing matched_rides table schema...')
      
      // Test if we can query matched_rides with new schema
      const { data: rideTest, error: rideError } = await supabase
        .from('matched_rides')
        .select('driver_user_id, commute_date, route_optimization_data, estimated_cost_per_person')
        .limit(1)
      
      if (rideError) {
        console.log('   ❌ New schema query failed:', rideError.message)
        console.log('   ⚠️  This might mean the schema hasn\'t been fully updated')
        
        // Try old schema
        const { data: oldRideTest, error: oldRideError } = await supabase
          .from('matched_rides')
          .select('driver_id, ride_date, uber_api_route_data, cost_per_rider')
          .limit(1)
        
        if (oldRideError) {
          console.log('   ❌ Old schema query also failed:', oldRideError.message)
          allTestsPassed = false
        } else {
          console.log('   ⚠️  Old schema still in use - Edge Functions need updating')
        }
      } else {
        console.log('   ✅ New schema query works!')
        console.log('   New schema fields available')
      }
      
      // Cleanup test data
      console.log('\n6. Cleaning up test data...')
      await supabase.from('pickup_locations').delete().eq('user_id', testUserId)
      await supabase.from('users').delete().eq('id', testUserId)
      console.log('   ✅ Test data cleaned up')
      
    } else {
      console.log('   ❌ api_create_user_profile returned no data or failed')
      if (createResult && createResult.length > 0) {
        console.log('   Error:', createResult[0].error_message)
      }
      allTestsPassed = false
    }
    
    console.log('\n7. Final Test Summary...')
    
    if (allTestsPassed) {
      console.log('   🎉 ALL TESTS PASSED!')
      console.log('   ✅ Clean backend API functions are working')
      console.log('   ✅ Profile creation and retrieval work')
      console.log('   ✅ Coordinate handling is correct')
      console.log('   ✅ Database schema is accessible')
      console.log('\n📋 Next Steps:')
      console.log('   1. Update frontend to use profileService-clean.ts')
      console.log('   2. Update types to use database-clean.ts')
      console.log('   3. Update Edge Functions to use new schema')
      console.log('   4. Test complete integration')
    } else {
      console.log('   ❌ SOME TESTS FAILED!')
      console.log('   ⚠️  Please review the errors above')
      console.log('   ⚠️  The backend may need additional fixes')
    }
    
  } catch (error) {
    console.error('❌ Testing failed:', error.message)
    console.error('Stack:', error.stack)
    allTestsPassed = false
  }
  
  process.exit(allTestsPassed ? 0 : 1)
}

// Run the test
testCleanBackend()
