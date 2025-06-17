#!/usr/bin/env node

/**
 * Fix Database Schema Script
 * Apply database fixes directly via SQL
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function fixDatabase() {
  console.log('🔧 Fixing Database Schema')
  console.log('=' .repeat(30))
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    console.log('1. Adding PENDING_CONFIRMATION to ride_status ENUM...')
    
    // Add PENDING_CONFIRMATION to ride_status ENUM
    const { error: enumError } = await supabase.rpc('sql', {
      query: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'PENDING_CONFIRMATION' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ride_status')
          ) THEN
            ALTER TYPE ride_status ADD VALUE 'PENDING_CONFIRMATION';
          END IF;
        END $$;
      `
    })
    
    if (enumError) {
      console.log('❌ ENUM update failed:', enumError.message)
    } else {
      console.log('✅ ENUM updated successfully')
    }
    
    console.log('\n2. Making uber_api_route_data nullable...')
    
    // Make uber_api_route_data nullable
    const { error: nullableError } = await supabase.rpc('sql', {
      query: `
        ALTER TABLE matched_rides ALTER COLUMN uber_api_route_data DROP NOT NULL;
      `
    })
    
    if (nullableError) {
      console.log('❌ Nullable update failed:', nullableError.message)
    } else {
      console.log('✅ Column made nullable')
    }
    
    console.log('\n3. Adding PENDING to participant_status ENUM...')
    
    // Add PENDING to participant_status ENUM
    const { error: participantEnumError } = await supabase.rpc('sql', {
      query: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'PENDING' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'participant_status')
          ) THEN
            ALTER TYPE participant_status ADD VALUE 'PENDING';
          END IF;
        END $$;
      `
    })
    
    if (participantEnumError) {
      console.log('❌ Participant ENUM update failed:', participantEnumError.message)
    } else {
      console.log('✅ Participant ENUM updated successfully')
    }
    
    console.log('\n4. Testing ride creation...')
    
    // Test ride creation
    const testDriverId = crypto.randomUUID()
    const testDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Create test user
    const { data: testUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: testDriverId,
        email: `testfix${Date.now()}@northsouth.edu`,
        full_name: 'Test Fix User',
        default_role: 'DRIVER',
        home_location_coords: `POINT(90.3742 23.7461)`,
        driver_details: { license_number: 'TEST123', car_model: 'Test Car', capacity: 3 }
      })
      .select()
      .single()
    
    if (userError) {
      console.log('❌ Test user creation failed:', userError.message)
      return
    }
    
    console.log('✅ Test user created')
    
    // Test ride creation with PROPOSED status
    const { data: testRide, error: rideError } = await supabase
      .from('matched_rides')
      .insert({
        driver_id: testDriverId,
        ride_date: testDate,
        status: 'PROPOSED',
        cost_per_rider: 100,
        uber_api_route_data: {
          test: true,
          estimated_cost_per_person: 100,
          estimated_total_time: 30,
          pickup_order: [testDriverId]
        }
      })
      .select()
      .single()
    
    if (rideError) {
      console.log('❌ Test ride creation failed:', rideError.message)
      console.log('   Error details:', JSON.stringify(rideError, null, 2))
    } else {
      console.log('✅ Test ride created successfully!')
      console.log('   Ride ID:', testRide.id)
      
      // Test participant creation
      const { data: testParticipant, error: participantError } = await supabase
        .from('ride_participants')
        .insert({
          ride_id: testRide.id,
          user_id: testDriverId,
          status: 'PENDING_ACCEPTANCE'
        })
        .select()
        .single()
      
      if (participantError) {
        console.log('❌ Test participant creation failed:', participantError.message)
      } else {
        console.log('✅ Test participant created successfully!')
      }
    }
    
    // Cleanup test data
    console.log('\n5. Cleaning up test data...')
    await supabase.from('ride_participants').delete().eq('user_id', testDriverId)
    await supabase.from('matched_rides').delete().eq('driver_id', testDriverId)
    await supabase.from('users').delete().eq('id', testDriverId)
    console.log('✅ Test data cleaned up')
    
    console.log('\n6. Checking current ENUM values...')
    
    // Check ride_status ENUM values
    const { data: rideStatuses } = await supabase.rpc('sql', {
      query: `
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ride_status')
        ORDER BY enumsortorder
      `
    })
    
    console.log('   ride_status ENUM values:')
    rideStatuses?.forEach(status => {
      console.log(`     - ${status.enumlabel}`)
    })
    
    // Check participant_status ENUM values
    const { data: participantStatuses } = await supabase.rpc('sql', {
      query: `
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'participant_status')
        ORDER BY enumsortorder
      `
    })
    
    console.log('   participant_status ENUM values:')
    participantStatuses?.forEach(status => {
      console.log(`     - ${status.enumlabel}`)
    })
    
    console.log('\n✅ Database schema fixes completed!')
    
  } catch (error) {
    console.error('❌ Database fix failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the fix
fixDatabase()
