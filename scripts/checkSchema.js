#!/usr/bin/env node

/**
 * Check Database Schema Script
 * Check the actual database schema to understand the current state
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkSchema() {
  console.log('🔍 Database Schema Check')
  console.log('=' .repeat(30))
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    console.log('1. Checking matched_rides table structure...')
    
    // Get table structure using information_schema
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'matched_rides')
      .order('ordinal_position')
    
    if (columnsError) {
      console.log('❌ Error fetching columns:', columnsError.message)
    } else {
      console.log('   matched_rides table columns:')
      columns?.forEach(col => {
        console.log(`     ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
    }
    
    console.log('\n2. Checking ride_participants table structure...')
    
    const { data: participantColumns, error: participantError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'ride_participants')
      .order('ordinal_position')
    
    if (participantError) {
      console.log('❌ Error fetching participant columns:', participantError.message)
    } else {
      console.log('   ride_participants table columns:')
      participantColumns?.forEach(col => {
        console.log(`     ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
    }
    
    console.log('\n3. Checking ENUM types...')
    
    // Check ride_status ENUM
    const { data: rideStatuses, error: rideStatusError } = await supabase
      .from('pg_enum')
      .select('enumlabel')
      .eq('enumtypid', supabase.rpc('get_enum_oid', { enum_name: 'ride_status' }))
    
    if (!rideStatusError && rideStatuses) {
      console.log('   ride_status ENUM values:')
      rideStatuses.forEach(status => {
        console.log(`     - ${status.enumlabel}`)
      })
    } else {
      console.log('   ❌ Could not fetch ride_status ENUM values')
    }
    
    console.log('\n4. Testing simple queries...')
    
    // Test simple select on matched_rides
    const { data: rides, error: ridesError } = await supabase
      .from('matched_rides')
      .select('*')
      .limit(1)
    
    if (ridesError) {
      console.log('❌ Error querying matched_rides:', ridesError.message)
    } else {
      console.log('✅ matched_rides table accessible')
      if (rides && rides.length > 0) {
        console.log('   Sample ride structure:', Object.keys(rides[0]))
      }
    }
    
    // Test simple select on ride_participants
    const { data: participants, error: participantsError } = await supabase
      .from('ride_participants')
      .select('*')
      .limit(1)
    
    if (participantsError) {
      console.log('❌ Error querying ride_participants:', participantsError.message)
    } else {
      console.log('✅ ride_participants table accessible')
      if (participants && participants.length > 0) {
        console.log('   Sample participant structure:', Object.keys(participants[0]))
      }
    }
    
    console.log('\n5. Testing ride creation with minimal data...')
    
    // Create a test user first
    const testUserId = crypto.randomUUID()
    const testDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const { data: testUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        email: `testschema${Date.now()}@northsouth.edu`,
        full_name: 'Test Schema User',
        default_role: 'DRIVER',
        home_location_coords: `POINT(90.3742 23.7461)`,
        driver_details: { license_number: 'TEST123', car_model: 'Test Car', capacity: 3 }
      })
      .select()
      .single()
    
    if (userError) {
      console.log('❌ Test user creation failed:', userError.message)
    } else {
      console.log('✅ Test user created')
      
      // Try different ride creation approaches
      console.log('   Trying ride creation with original schema...')
      
      const { data: ride1, error: ride1Error } = await supabase
        .from('matched_rides')
        .insert({
          driver_id: testUserId,
          ride_date: testDate,
          uber_api_route_data: { test: true },
          cost_per_rider: 100,
          status: 'PROPOSED'
        })
        .select()
        .single()
      
      if (ride1Error) {
        console.log('❌ Original schema ride creation failed:', ride1Error.message)
        
        console.log('   Trying ride creation with new schema...')
        const { data: ride2, error: ride2Error } = await supabase
          .from('matched_rides')
          .insert({
            driver_user_id: testUserId,
            commute_date: testDate,
            route_optimization_data: { test: true },
            estimated_cost_per_person: 100,
            status: 'PROPOSED'
          })
          .select()
          .single()
        
        if (ride2Error) {
          console.log('❌ New schema ride creation failed:', ride2Error.message)
        } else {
          console.log('✅ New schema ride creation successful!')
          console.log('   Ride ID:', ride2.id)
          
          // Clean up
          await supabase.from('matched_rides').delete().eq('id', ride2.id)
        }
      } else {
        console.log('✅ Original schema ride creation successful!')
        console.log('   Ride ID:', ride1.id)
        
        // Clean up
        await supabase.from('matched_rides').delete().eq('id', ride1.id)
      }
      
      // Clean up test user
      await supabase.from('users').delete().eq('id', testUserId)
      console.log('✅ Test data cleaned up')
    }
    
    console.log('\n✅ Schema check completed!')
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the check
checkSchema()
