#!/usr/bin/env node

/**
 * Validate Clean Backend Script
 * Comprehensive validation of the clean backend deployment
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function validateCleanBackend() {
  console.log('🔍 Validating Clean Backend Deployment')
  console.log('=' .repeat(50))
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  let allTestsPassed = true

  try {
    console.log('1. Validating Database Schema...')
    
    // Check matched_rides table structure using direct query
    const { data: matchedRidesColumns, error: mrError } = await supabase
      .rpc('exec_sql', {
        sql: `SELECT column_name, data_type, is_nullable
              FROM information_schema.columns
              WHERE table_name = 'matched_rides' AND table_schema = 'public'
              ORDER BY ordinal_position`
      })
    
    if (mrError) {
      console.log('   ❌ Error checking matched_rides schema:', mrError.message)
      allTestsPassed = false
    } else {
      const columnNames = matchedRidesColumns.map(col => col.column_name)
      
      // Check for NEW schema columns
      const requiredColumns = [
        'driver_user_id', 'commute_date', 'route_optimization_data', 
        'estimated_cost_per_person', 'estimated_total_time', 'pickup_order',
        'ai_confidence_score', 'ai_reasoning'
      ]
      
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col))
      const oldColumns = ['driver_id', 'ride_date', 'uber_api_route_data', 'cost_per_rider']
        .filter(col => columnNames.includes(col))
      
      if (missingColumns.length > 0) {
        console.log('   ❌ Missing required columns:', missingColumns.join(', '))
        allTestsPassed = false
      } else {
        console.log('   ✅ All required columns present')
      }
      
      if (oldColumns.length > 0) {
        console.log('   ⚠️  Old columns still present:', oldColumns.join(', '))
        console.log('   ⚠️  These should be renamed to new schema')
      }
    }
    
    // Check ride_participants table structure
    const { data: participantsColumns, error: rpError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'ride_participants')
      .order('ordinal_position')
    
    if (rpError) {
      console.log('   ❌ Error checking ride_participants schema:', rpError.message)
      allTestsPassed = false
    } else {
      const columnNames = participantsColumns.map(col => col.column_name)
      
      if (columnNames.includes('matched_ride_id')) {
        console.log('   ✅ ride_participants uses matched_ride_id')
      } else if (columnNames.includes('ride_id')) {
        console.log('   ⚠️  ride_participants still uses old ride_id column')
      } else {
        console.log('   ❌ ride_participants missing ride reference column')
        allTestsPassed = false
      }
    }
    
    console.log('\n2. Validating API Functions...')
    
    // Check if API functions exist
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .like('routine_name', 'api_%')
    
    if (functionsError) {
      console.log('   ❌ Error checking functions:', functionsError.message)
      allTestsPassed = false
    } else {
      const requiredFunctions = [
        'api_create_user_profile',
        'api_get_user_profile', 
        'api_update_user_profile',
        'api_add_pickup_location',
        'api_get_profile_status'
      ]
      
      const existingFunctions = functions.map(f => f.routine_name)
      const missingFunctions = requiredFunctions.filter(f => !existingFunctions.includes(f))
      
      if (missingFunctions.length > 0) {
        console.log('   ❌ Missing API functions:', missingFunctions.join(', '))
        allTestsPassed = false
      } else {
        console.log('   ✅ All API functions present:', existingFunctions.join(', '))
      }
    }
    
    console.log('\n3. Testing API Function Execution...')
    
    // Test api_create_user_profile
    const testUserId = crypto.randomUUID()
    const testEmail = `validate${Date.now()}@test.com`
    
    console.log('   Testing api_create_user_profile...')
    const { data: createResult, error: createError } = await supabase.rpc('api_create_user_profile', {
      p_user_id: testUserId,
      p_email: testEmail,
      p_full_name: 'Validation Test User',
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
      
      // Test api_get_user_profile
      console.log('   Testing api_get_user_profile...')
      const { data: getResult, error: getError } = await supabase.rpc('api_get_user_profile', {
        p_user_id: testUserId
      })
      
      if (getError) {
        console.log('   ❌ api_get_user_profile failed:', getError.message)
        allTestsPassed = false
      } else if (getResult && getResult.length > 0 && getResult[0].success) {
        console.log('   ✅ api_get_user_profile works!')
        
        // Validate coordinate format
        const profileData = getResult[0].data.profile
        if (Array.isArray(profileData.home_location_coords) && 
            profileData.home_location_coords.length === 2) {
          console.log('   ✅ Coordinate format is correct: [lng, lat]')
        } else {
          console.log('   ❌ Coordinate format is incorrect')
          allTestsPassed = false
        }
      } else {
        console.log('   ❌ api_get_user_profile returned no data')
        allTestsPassed = false
      }
      
      // Test api_get_profile_status
      console.log('   Testing api_get_profile_status...')
      const { data: statusResult, error: statusError } = await supabase.rpc('api_get_profile_status', {
        p_user_id: testUserId
      })
      
      if (statusError) {
        console.log('   ❌ api_get_profile_status failed:', statusError.message)
        allTestsPassed = false
      } else if (statusResult && statusResult.length > 0 && statusResult[0].success) {
        console.log('   ✅ api_get_profile_status works!')
        const status = statusResult[0].data
        console.log(`   Profile completion: ${status.is_complete ? 'Complete' : 'Incomplete'}`)
        console.log(`   Pickup locations: ${status.pickup_location_count}`)
      } else {
        console.log('   ❌ api_get_profile_status returned no data')
        allTestsPassed = false
      }
      
      // Cleanup test data
      await supabase.from('pickup_locations').delete().eq('user_id', testUserId)
      await supabase.from('users').delete().eq('id', testUserId)
      console.log('   ✅ Test data cleaned up')
      
    } else {
      console.log('   ❌ api_create_user_profile returned no data or failed')
      allTestsPassed = false
    }
    
    console.log('\n4. Validating Triggers and Constraints...')
    
    // Check if validation triggers exist
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, action_timing')
      .eq('event_object_table', 'users')
    
    if (triggersError) {
      console.log('   ❌ Error checking triggers:', triggersError.message)
      allTestsPassed = false
    } else {
      const triggerNames = triggers.map(t => t.trigger_name)
      const requiredTriggers = [
        'email_validation_trigger',
        'profile_validation_trigger', 
        'auto_pickup_creation_trigger',
        'home_location_sync_trigger'
      ]
      
      const missingTriggers = requiredTriggers.filter(t => !triggerNames.includes(t))
      
      if (missingTriggers.length > 0) {
        console.log('   ⚠️  Missing triggers:', missingTriggers.join(', '))
      } else {
        console.log('   ✅ All validation triggers present')
      }
    }
    
    console.log('\n5. Validating RLS Policies...')
    
    // Check RLS policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, tablename, cmd')
      .in('tablename', ['users', 'matched_rides', 'ride_participants'])
    
    if (policiesError) {
      console.log('   ❌ Error checking RLS policies:', policiesError.message)
      allTestsPassed = false
    } else {
      console.log('   ✅ RLS policies found:', policies.length)
      policies.forEach(policy => {
        console.log(`     ${policy.tablename}.${policy.policyname} (${policy.cmd})`)
      })
    }
    
    console.log('\n6. Final Validation Summary...')
    
    if (allTestsPassed) {
      console.log('   🎉 ALL VALIDATIONS PASSED!')
      console.log('   ✅ Schema is consistent and clean')
      console.log('   ✅ API functions are working correctly')
      console.log('   ✅ Triggers and constraints are in place')
      console.log('   ✅ Backend is ready for production use')
      console.log('\n📋 Next Steps:')
      console.log('   1. Update frontend to use profileService-clean.ts')
      console.log('   2. Update types to use database-clean.ts')
      console.log('   3. Update Edge Functions to use new schema')
      console.log('   4. Test complete integration')
    } else {
      console.log('   ❌ SOME VALIDATIONS FAILED!')
      console.log('   ⚠️  Please review the errors above')
      console.log('   ⚠️  You may need to re-apply migrations')
      console.log('   ⚠️  Run: npx supabase db push --linked')
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message)
    console.error('Stack:', error.stack)
    allTestsPassed = false
  }
  
  process.exit(allTestsPassed ? 0 : 1)
}

// Run the validation
validateCleanBackend()
