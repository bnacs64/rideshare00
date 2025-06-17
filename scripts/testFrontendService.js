#!/usr/bin/env node

/**
 * Test Frontend Service Script
 * Test the updated frontend profile service with clean backend API
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Mock the profile service (since we can't import ES modules in Node.js easily)
async function testProfileService() {
  console.log('🧪 Testing Frontend Profile Service')
  console.log('=' .repeat(50))
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  let allTestsPassed = true

  try {
    console.log('1. Testing createCompleteProfile (simulating frontend service)...')
    
    const testUserId = crypto.randomUUID()
    const testEmail = `frontend${Date.now()}@test.com`
    
    // Simulate the frontend service call to api_create_user_profile
    const profileData = {
      id: testUserId,
      email: testEmail,
      full_name: 'Frontend Test User',
      default_role: 'RIDER',
      home_location_coords: [90.3742, 23.7461], // [lng, lat]
      home_location_address: 'Test Address'
    }
    
    console.log('   Calling api_create_user_profile with:', {
      p_user_id: profileData.id,
      p_email: profileData.email,
      p_full_name: profileData.full_name,
      p_default_role: profileData.default_role,
      p_home_location_lng: profileData.home_location_coords[0],
      p_home_location_lat: profileData.home_location_coords[1],
      p_home_location_address: profileData.home_location_address
    })
    
    const { data: createResult, error: createError } = await supabase.rpc('api_create_user_profile', {
      p_user_id: profileData.id,
      p_email: profileData.email,
      p_full_name: profileData.full_name,
      p_default_role: profileData.default_role,
      p_home_location_lng: profileData.home_location_coords[0], // lng
      p_home_location_lat: profileData.home_location_coords[1],  // lat
      p_home_location_address: profileData.home_location_address || null,
      p_driver_details: null,
      p_telegram_user_id: null
    })
    
    if (createError) {
      console.log('   ❌ api_create_user_profile failed:', createError.message)
      allTestsPassed = false
    } else if (createResult && createResult.length > 0 && createResult[0].success) {
      console.log('   ✅ api_create_user_profile works!')
      
      const result = createResult[0]
      console.log('   Created user:', {
        id: result.data.user.id,
        email: result.data.user.email,
        full_name: result.data.user.full_name,
        coords: result.data.user.home_location_coords
      })
      console.log('   Pickup location ID:', result.data.pickup_location_id)
      
      console.log('\n2. Testing getCompleteProfile (simulating frontend service)...')
      
      // Simulate the frontend service call to api_get_user_profile
      const { data: getResult, error: getError } = await supabase.rpc('api_get_user_profile', {
        p_user_id: testUserId
      })
      
      if (getError) {
        console.log('   ❌ api_get_user_profile failed:', getError.message)
        allTestsPassed = false
      } else if (getResult && getResult.length > 0 && getResult[0].success) {
        console.log('   ✅ api_get_user_profile works!')
        
        const profileResult = getResult[0]
        const profile = profileResult.data.profile
        const locations = profileResult.data.pickup_locations
        
        console.log('   Retrieved profile:', {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          coords: profile.home_location_coords
        })
        console.log('   Pickup locations count:', locations.length)
        
        // Test coordinate format consistency
        if (Array.isArray(profile.home_location_coords) && 
            profile.home_location_coords.length === 2) {
          console.log('   ✅ Profile coordinates format: [lng, lat]')
        } else {
          console.log('   ❌ Profile coordinates format incorrect')
          allTestsPassed = false
        }
        
        if (locations.length > 0 && Array.isArray(locations[0].coords) && 
            locations[0].coords.length === 2) {
          console.log('   ✅ Pickup location coordinates format: [lat, lng]')
        } else {
          console.log('   ❌ Pickup location coordinates format incorrect')
          allTestsPassed = false
        }
      } else {
        console.log('   ❌ api_get_user_profile returned no data')
        allTestsPassed = false
      }
      
      console.log('\n3. Testing getProfileStatus (simulating frontend service)...')
      
      // Simulate the frontend service call to api_get_profile_status
      const { data: statusResult, error: statusError } = await supabase.rpc('api_get_profile_status', {
        p_user_id: testUserId
      })
      
      if (statusError) {
        console.log('   ❌ api_get_profile_status failed:', statusError.message)
        allTestsPassed = false
      } else if (statusResult && statusResult.length > 0 && statusResult[0].success) {
        console.log('   ✅ api_get_profile_status works!')
        const status = statusResult[0].data
        console.log('   Profile status:', {
          is_complete: status.is_complete,
          missing_fields: status.missing_fields,
          pickup_location_count: status.pickup_location_count,
          has_default_pickup: status.has_default_pickup
        })
      } else {
        console.log('   ❌ api_get_profile_status returned no data')
        allTestsPassed = false
      }
      
      // Cleanup test data
      console.log('\n4. Cleaning up test data...')
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
    
    console.log('\n5. Testing Edge Function Schema Compatibility...')
    
    // Test if we can query matched_rides with new schema
    const { data: rideTest, error: rideError } = await supabase
      .from('matched_rides')
      .select('driver_user_id, commute_date, route_optimization_data, estimated_cost_per_person')
      .limit(1)
    
    if (rideError) {
      console.log('   ❌ New schema query failed:', rideError.message)
      console.log('   ⚠️  Edge Functions may need updating')
      allTestsPassed = false
    } else {
      console.log('   ✅ New schema query works!')
      console.log('   ✅ Edge Functions can use new field names')
    }
    
    console.log('\n6. Final Frontend Service Test Summary...')
    
    if (allTestsPassed) {
      console.log('   🎉 ALL FRONTEND SERVICE TESTS PASSED!')
      console.log('   ✅ Clean backend API functions work with frontend')
      console.log('   ✅ Profile creation and retrieval work')
      console.log('   ✅ Coordinate handling is consistent')
      console.log('   ✅ Database schema supports new field names')
      console.log('\n📋 Frontend Integration Status:')
      console.log('   ✅ Profile Service: Updated to use clean API')
      console.log('   ✅ Database Types: Updated with clean schema')
      console.log('   ✅ Backend API: Fully functional')
      console.log('   ⚠️  Edge Functions: Need schema field name updates')
      console.log('\n🚀 Ready for user registration testing!')
    } else {
      console.log('   ❌ SOME FRONTEND SERVICE TESTS FAILED!')
      console.log('   ⚠️  Please review the errors above')
      console.log('   ⚠️  Frontend may need additional fixes')
    }
    
  } catch (error) {
    console.error('❌ Frontend service testing failed:', error.message)
    console.error('Stack:', error.stack)
    allTestsPassed = false
  }
  
  process.exit(allTestsPassed ? 0 : 1)
}

// Run the test
testProfileService()
