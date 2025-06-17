#!/usr/bin/env node

/**
 * Debug Ride Creation Script
 * Test the specific ride creation step that's failing
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function debugRideCreation() {
  console.log('🔧 Debug Ride Creation')
  console.log('=' .repeat(30))
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const testDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  try {
    // Step 1: Create minimal test users
    console.log('👥 Creating minimal test users...')
    
    const timestamp = Date.now()
    const driverId = crypto.randomUUID()
    const riderId = crypto.randomUUID()
    
    // Create driver
    const { data: driver, error: driverError } = await supabase
      .from('users')
      .insert({
        id: driverId,
        email: `testdriver${timestamp}@northsouth.edu`,
        full_name: 'Test Driver',
        default_role: 'DRIVER',
        home_location_coords: `POINT(90.3742 23.7461)`,
        driver_details: {
          license_number: 'TEST123',
          car_model: 'Test Car',
          capacity: 3
        }
      })
      .select()
      .single()
    
    if (driverError) {
      console.log('❌ Driver creation failed:', driverError.message)
      return
    }
    console.log('✅ Driver created')
    
    // Create rider
    const { data: rider, error: riderError } = await supabase
      .from('users')
      .insert({
        id: riderId,
        email: `testrider${timestamp}@northsouth.edu`,
        full_name: 'Test Rider',
        default_role: 'RIDER',
        home_location_coords: `POINT(90.3756 23.7489)`
      })
      .select()
      .single()
    
    if (riderError) {
      console.log('❌ Rider creation failed:', riderError.message)
      return
    }
    console.log('✅ Rider created')
    
    // Step 2: Test direct ride creation
    console.log('\n🚗 Testing direct ride creation...')
    
    try {
      const { data: ride, error: rideError } = await supabase
        .from('matched_rides')
        .insert({
          commute_date: testDate,
          status: 'PENDING_CONFIRMATION',
          driver_user_id: driverId,
          estimated_cost_per_person: 100,
          estimated_total_time: 30,
          pickup_order: [riderId],
          route_optimization_data: {
            test: true,
            estimated_cost: 200,
            duration: 1800,
            waypoints: [
              { user_id: driverId, location: 'Driver pickup' },
              { user_id: riderId, location: 'Rider pickup' }
            ]
          },
          ai_confidence_score: 0.85,
          ai_reasoning: 'Test ride creation'
        })
        .select()
        .single()
      
      if (rideError) {
        console.log('❌ Direct ride creation failed:', rideError.message)
        console.log('   Error details:', JSON.stringify(rideError, null, 2))
        
        // Try with minimal data
        console.log('\n🔄 Trying with minimal data...')
        const { data: minimalRide, error: minimalError } = await supabase
          .from('matched_rides')
          .insert({
            commute_date: testDate,
            status: 'PROPOSED', // Use original ENUM value
            driver_user_id: driverId,
            estimated_cost_per_person: 100
          })
          .select()
          .single()
        
        if (minimalError) {
          console.log('❌ Minimal ride creation failed:', minimalError.message)
          console.log('   Error details:', JSON.stringify(minimalError, null, 2))
        } else {
          console.log('✅ Minimal ride created successfully!')
          console.log('   Ride ID:', minimalRide.id)
          
          // Test participant creation
          console.log('\n👥 Testing participant creation...')
          const { data: participant, error: participantError } = await supabase
            .from('ride_participants')
            .insert({
              matched_ride_id: minimalRide.id,
              user_id: riderId,
              status: 'PENDING_ACCEPTANCE'
            })
            .select()
            .single()
          
          if (participantError) {
            console.log('❌ Participant creation failed:', participantError.message)
          } else {
            console.log('✅ Participant created successfully!')
          }
        }
      } else {
        console.log('✅ Direct ride creation successful!')
        console.log('   Ride ID:', ride.id)
      }
    } catch (error) {
      console.log('❌ Exception during ride creation:', error.message)
    }
    
    // Step 3: Test the match-rides Edge Function directly
    console.log('\n🤖 Testing match-rides Edge Function directly...')
    
    // Create pickup locations and opt-ins first
    const { data: driverLocation } = await supabase
      .from('pickup_locations')
      .insert({
        user_id: driverId,
        name: 'Driver Location',
        description: 'Test driver location',
        coords: `POINT(90.3742 23.7461)`,
        is_default: true
      })
      .select()
      .single()
    
    const { data: riderLocation } = await supabase
      .from('pickup_locations')
      .insert({
        user_id: riderId,
        name: 'Rider Location',
        description: 'Test rider location',
        coords: `POINT(90.3756 23.7489)`,
        is_default: true
      })
      .select()
      .single()
    
    const { data: driverOptIn } = await supabase
      .from('daily_opt_ins')
      .insert({
        user_id: driverId,
        commute_date: testDate,
        time_window_start: '08:30',
        time_window_end: '09:30',
        pickup_location_id: driverLocation.id,
        status: 'PENDING_MATCH'
      })
      .select()
      .single()
    
    const { data: riderOptIn } = await supabase
      .from('daily_opt_ins')
      .insert({
        user_id: riderId,
        commute_date: testDate,
        time_window_start: '08:30',
        time_window_end: '09:30',
        pickup_location_id: riderLocation.id,
        status: 'PENDING_MATCH'
      })
      .select()
      .single()
    
    console.log('✅ Opt-ins created')
    
    // Call match-rides function
    const { data: matchResult, error: matchError } = await supabase.functions.invoke('match-rides', {
      body: {
        targetOptInId: driverOptIn.id,
        forceMatch: false
      }
    })
    
    if (matchError) {
      console.log('❌ Match-rides function failed:', matchError.message)
    } else {
      console.log('✅ Match-rides function completed')
      console.log('   Result:', JSON.stringify(matchResult, null, 2))
    }
    
    // Step 4: Check database schema
    console.log('\n📋 Checking database schema...')
    
    // Check matched_rides table structure
    const { data: rideColumns, error: rideSchemaError } = await supabase
      .rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'matched_rides'
          ORDER BY ordinal_position
        `
      })
    
    if (!rideSchemaError && rideColumns) {
      console.log('   matched_rides table structure:')
      rideColumns.forEach(col => {
        console.log(`     ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
    }
    
    // Check ENUM values
    const { data: enumValues, error: enumError } = await supabase
      .rpc('sql', {
        query: `
          SELECT enumlabel 
          FROM pg_enum 
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ride_status')
          ORDER BY enumsortorder
        `
      })
    
    if (!enumError && enumValues) {
      console.log('   ride_status ENUM values:')
      enumValues.forEach(val => {
        console.log(`     - ${val.enumlabel}`)
      })
    }
    
    // Cleanup
    console.log('\n🧹 Cleaning up...')
    await supabase.from('ride_participants').delete().in('user_id', [driverId, riderId])
    await supabase.from('matched_rides').delete().eq('driver_user_id', driverId)
    await supabase.from('daily_opt_ins').delete().in('user_id', [driverId, riderId])
    await supabase.from('pickup_locations').delete().in('user_id', [driverId, riderId])
    await supabase.from('users').delete().in('id', [driverId, riderId])
    console.log('✅ Cleanup completed')
    
    console.log('\n✅ Debug session completed!')
    
  } catch (error) {
    console.error('❌ Debug session failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the debug session
debugRideCreation()
