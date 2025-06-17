#!/usr/bin/env node

/**
 * Check Migration Status Script
 * Check which migrations have been applied and what functions exist
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkMigrationStatus() {
  console.log('🔍 Checking Migration Status')
  console.log('=' .repeat(40))
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    console.log('1. Checking applied migrations...')
    
    // Check supabase_migrations table
    const { data: migrations, error: migrationError } = await supabase
      .from('supabase_migrations')
      .select('version, name')
      .order('version')
    
    if (migrationError) {
      console.log('❌ Error fetching migrations:', migrationError.message)
    } else {
      console.log('   Applied migrations:')
      migrations?.forEach(migration => {
        console.log(`     ${migration.version} - ${migration.name || 'Unnamed'}`)
      })
    }
    
    console.log('\n2. Checking existing functions...')
    
    // Check what functions exist
    const { data: functions, error: functionError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type, specific_name')
      .eq('routine_schema', 'public')
      .like('routine_name', '%profile%')
    
    if (functionError) {
      console.log('❌ Error fetching functions:', functionError.message)
    } else {
      console.log('   Profile-related functions:')
      functions?.forEach(func => {
        console.log(`     ${func.routine_name} (${func.routine_type})`)
      })
    }
    
    console.log('\n3. Testing specific function calls...')
    
    // Test create_complete_user_profile with different parameter orders
    const testUserId = crypto.randomUUID()
    const testEmail = `test${Date.now()}@test.com`
    
    console.log('   Testing create_complete_user_profile with lng/lat order...')
    try {
      const { data: result1, error: error1 } = await supabase.rpc('create_complete_user_profile', {
        p_user_id: testUserId,
        p_email: testEmail,
        p_full_name: 'Test User',
        p_default_role: 'RIDER',
        p_home_location_lng: 90.3742,
        p_home_location_lat: 23.7461
      })
      
      if (error1) {
        console.log('     ❌ lng/lat order failed:', error1.message)
      } else {
        console.log('     ✅ lng/lat order works!')
        console.log('     Result type:', typeof result1)
        
        // Clean up
        await supabase.from('users').delete().eq('id', testUserId)
      }
    } catch (err) {
      console.log('     ❌ lng/lat order exception:', err.message)
    }
    
    console.log('   Testing create_complete_user_profile with lat/lng order...')
    try {
      const { data: result2, error: error2 } = await supabase.rpc('create_complete_user_profile', {
        p_user_id: testUserId,
        p_email: testEmail,
        p_full_name: 'Test User',
        p_default_role: 'RIDER',
        p_home_location_lat: 23.7461,
        p_home_location_lng: 90.3742
      })
      
      if (error2) {
        console.log('     ❌ lat/lng order failed:', error2.message)
      } else {
        console.log('     ✅ lat/lng order works!')
        console.log('     Result type:', typeof result2)
        
        // Clean up
        await supabase.from('users').delete().eq('id', testUserId)
      }
    } catch (err) {
      console.log('     ❌ lat/lng order exception:', err.message)
    }
    
    console.log('\n4. Checking function signatures...')
    
    // Get detailed function information
    const { data: funcDetails, error: detailError } = await supabase
      .from('information_schema.parameters')
      .select('specific_name, parameter_name, data_type, ordinal_position')
      .like('specific_name', '%create_complete_user_profile%')
      .order('ordinal_position')
    
    if (detailError) {
      console.log('❌ Error fetching function details:', detailError.message)
    } else {
      console.log('   create_complete_user_profile parameters:')
      funcDetails?.forEach(param => {
        console.log(`     ${param.ordinal_position}. ${param.parameter_name}: ${param.data_type}`)
      })
    }
    
    console.log('\n5. Testing other profile functions...')
    
    // Test get_user_profile
    try {
      const { data: getUserResult, error: getUserError } = await supabase.rpc('get_user_profile', {
        p_user_id: testUserId
      })
      
      if (getUserError) {
        console.log('   ❌ get_user_profile failed:', getUserError.message)
      } else {
        console.log('   ✅ get_user_profile works!')
      }
    } catch (err) {
      console.log('   ❌ get_user_profile exception:', err.message)
    }
    
    // Test get_profile_status
    try {
      const { data: statusResult, error: statusError } = await supabase.rpc('get_profile_status', {
        user_id: testUserId
      })
      
      if (statusError) {
        console.log('   ❌ get_profile_status failed:', statusError.message)
      } else {
        console.log('   ✅ get_profile_status works!')
      }
    } catch (err) {
      console.log('   ❌ get_profile_status exception:', err.message)
    }
    
    console.log('\n✅ Migration status check completed!')
    
  } catch (error) {
    console.error('❌ Migration check failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the check
checkMigrationStatus()
