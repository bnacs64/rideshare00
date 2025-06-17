#!/usr/bin/env node

/**
 * Test User Registration Script
 * Test the complete user registration flow
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function testUserRegistration() {
  console.log('🧪 Testing User Registration Flow')
  console.log('=' .repeat(40))
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const timestamp = Date.now()
    const testEmail = `dhanmondi${timestamp}@akshathe.xyz`
    const testUserId = crypto.randomUUID()
    
    console.log('1. Testing auth user creation...')
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'test123456',
      email_confirm: true,
      user_metadata: { full_name: 'Test Registration User' }
    })
    
    if (authError) {
      console.log('❌ Auth user creation failed:', authError.message)
      return
    }
    
    console.log('✅ Auth user created:', authData.user.id)
    const userId = authData.user.id
    
    console.log('\n2. Testing profile creation...')
    
    // Test profile creation using the same approach as the web app
    const profileData = {
      id: userId,
      email: testEmail,
      full_name: 'Test Registration User',
      default_role: 'RIDER',
      home_location_coords: [90.3742, 23.7461], // [lng, lat]
      home_location_address: 'Dhanmondi, Dhaka',
      driver_details: null,
      telegram_user_id: null
    }
    
    console.log('   Profile data:', profileData)
    
    // Try direct database insertion (same as the fixed profile service)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: profileData.id,
        email: profileData.email,
        full_name: profileData.full_name,
        default_role: profileData.default_role,
        home_location_coords: `POINT(${profileData.home_location_coords[0]} ${profileData.home_location_coords[1]})`,
        home_location_address: profileData.home_location_address,
        driver_details: profileData.driver_details,
        telegram_user_id: profileData.telegram_user_id
      })
      .select()
      .single()

    if (userError) {
      console.log('❌ Profile creation failed:', userError.message)
      console.log('   Error details:', JSON.stringify(userError, null, 2))
    } else {
      console.log('✅ Profile created successfully!')
      console.log('   Profile ID:', userData.id)
      console.log('   Profile data:', userData)
    }
    
    console.log('\n3. Testing profile retrieval...')
    
    // Test profile retrieval
    const { data: retrievedProfile, error: retrieveError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (retrieveError) {
      console.log('❌ Profile retrieval failed:', retrieveError.message)
    } else {
      console.log('✅ Profile retrieved successfully!')
      console.log('   Retrieved profile:', {
        id: retrievedProfile.id,
        email: retrievedProfile.email,
        full_name: retrievedProfile.full_name,
        default_role: retrievedProfile.default_role
      })
    }
    
    console.log('\n4. Testing pickup location creation...')
    
    // Test pickup location creation
    const { data: locationData, error: locationError } = await supabase
      .from('pickup_locations')
      .insert({
        user_id: userId,
        name: 'Home',
        description: 'Dhanmondi area, Dhaka',
        coords: `POINT(${profileData.home_location_coords[0]} ${profileData.home_location_coords[1]})`,
        is_default: true
      })
      .select()
      .single()

    if (locationError) {
      console.log('❌ Pickup location creation failed:', locationError.message)
    } else {
      console.log('✅ Pickup location created successfully!')
      console.log('   Location ID:', locationData.id)
    }
    
    console.log('\n5. Testing complete profile retrieval...')
    
    // Test complete profile with locations
    const { data: completeProfile, error: completeError } = await supabase
      .from('users')
      .select(`
        *,
        pickup_locations (*)
      `)
      .eq('id', userId)
      .single()

    if (completeError) {
      console.log('❌ Complete profile retrieval failed:', completeError.message)
    } else {
      console.log('✅ Complete profile retrieved successfully!')
      console.log('   Profile:', {
        id: completeProfile.id,
        email: completeProfile.email,
        full_name: completeProfile.full_name,
        pickup_locations_count: completeProfile.pickup_locations?.length || 0
      })
    }
    
    // Cleanup
    console.log('\n6. Cleaning up test data...')
    
    if (locationData) {
      await supabase.from('pickup_locations').delete().eq('id', locationData.id)
    }
    
    if (userData) {
      await supabase.from('users').delete().eq('id', userId)
    }
    
    await supabase.auth.admin.deleteUser(userId)
    
    console.log('✅ Test data cleaned up')
    
    console.log('\n🎉 User registration flow test completed successfully!')
    
  } catch (error) {
    console.error('❌ Registration test failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the test
testUserRegistration()
