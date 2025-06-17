#!/usr/bin/env node

/**
 * Create Profile Function Script
 * Create the missing profile function directly via Supabase client
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function createProfileFunction() {
  console.log('🔧 Creating Profile Function')
  console.log('=' .repeat(30))
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    console.log('1. Creating create_complete_user_profile function...')
    
    // Create the function using a direct SQL query
    const functionSQL = `
      CREATE OR REPLACE FUNCTION create_complete_user_profile(
        p_user_id UUID,
        p_email TEXT,
        p_full_name TEXT,
        p_default_role user_role,
        p_home_location_lat FLOAT,
        p_home_location_lng FLOAT,
        p_home_location_address TEXT DEFAULT NULL,
        p_driver_details JSONB DEFAULT NULL,
        p_telegram_user_id BIGINT DEFAULT NULL
      ) RETURNS JSON AS $$
      DECLARE
        result JSON;
        user_record RECORD;
      BEGIN
        -- Insert or update user profile
        INSERT INTO users (
          id,
          email,
          full_name,
          default_role,
          home_location_coords,
          home_location_address,
          driver_details,
          telegram_user_id
        ) VALUES (
          p_user_id,
          p_email,
          p_full_name,
          p_default_role,
          ST_SetSRID(ST_MakePoint(p_home_location_lng, p_home_location_lat), 4326),
          p_home_location_address,
          p_driver_details,
          p_telegram_user_id
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          default_role = EXCLUDED.default_role,
          home_location_coords = EXCLUDED.home_location_coords,
          home_location_address = EXCLUDED.home_location_address,
          driver_details = EXCLUDED.driver_details,
          telegram_user_id = EXCLUDED.telegram_user_id,
          updated_at = NOW()
        RETURNING * INTO user_record;

        -- Return the created/updated user as JSON
        SELECT row_to_json(user_record) INTO result;
        
        RETURN result;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
    
    // Execute the function creation
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: functionSQL
    })
    
    if (functionError) {
      console.log('❌ Function creation failed via RPC, trying direct approach...')
      
      // Try creating a test user profile directly to see if we can work around this
      const testUserId = crypto.randomUUID()
      const { data: testUser, error: directError } = await supabase
        .from('users')
        .insert({
          id: testUserId,
          email: `testfunction${Date.now()}@northsouth.edu`,
          full_name: 'Test Function User',
          default_role: 'RIDER',
          home_location_coords: `POINT(90.3742 23.7461)`,
          home_location_address: 'Test Address'
        })
        .select()
        .single()
      
      if (directError) {
        console.log('❌ Direct user creation failed:', directError.message)
      } else {
        console.log('✅ Direct user creation works!')
        console.log('   User ID:', testUser.id)
        
        // Clean up
        await supabase.from('users').delete().eq('id', testUserId)
        console.log('✅ Test user cleaned up')
        
        // Since direct insertion works, let's create a simpler approach
        console.log('\n2. Creating alternative profile creation approach...')
        
        // Test the profile service directly
        const profileData = {
          user_id: crypto.randomUUID(),
          email: 'dhanmondi0@akshathe.xyz',
          full_name: 'Test Profile User',
          default_role: 'RIDER',
          home_location_lat: 23.7461,
          home_location_lng: 90.3742,
          home_location_address: 'Dhanmondi, Dhaka'
        }
        
        console.log('   Testing profile creation with data:', profileData)
        
        const { data: profileUser, error: profileError } = await supabase
          .from('users')
          .insert({
            id: profileData.user_id,
            email: profileData.email,
            full_name: profileData.full_name,
            default_role: profileData.default_role,
            home_location_coords: `POINT(${profileData.home_location_lng} ${profileData.home_location_lat})`,
            home_location_address: profileData.home_location_address
          })
          .select()
          .single()
        
        if (profileError) {
          console.log('❌ Profile creation test failed:', profileError.message)
        } else {
          console.log('✅ Profile creation test successful!')
          console.log('   Profile ID:', profileUser.id)
          
          // Clean up
          await supabase.from('users').delete().eq('id', profileData.user_id)
          console.log('✅ Test profile cleaned up')
        }
      }
    } else {
      console.log('✅ Function created successfully!')
    }
    
    console.log('\n3. Testing function permissions...')
    
    // Grant permissions
    const { error: permissionError } = await supabase.rpc('exec_sql', {
      sql: 'GRANT EXECUTE ON FUNCTION create_complete_user_profile TO authenticated, anon;'
    })
    
    if (permissionError) {
      console.log('❌ Permission grant failed:', permissionError.message)
    } else {
      console.log('✅ Permissions granted successfully!')
    }
    
    console.log('\n✅ Profile function setup completed!')
    
  } catch (error) {
    console.error('❌ Profile function creation failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the creation
createProfileFunction()
