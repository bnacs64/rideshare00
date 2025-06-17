#!/usr/bin/env node

/**
 * Database Check Script
 * Check what's actually in the database after tests
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkDatabase() {
  console.log('🔍 Database Check')
  console.log('=' .repeat(30))
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const testDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  try {
    // Check users
    console.log('\n👥 Users in database:')
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, default_role, home_location_coords, driver_details')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (userError) {
      console.log('❌ Error fetching users:', userError.message)
    } else {
      console.log(`   Found ${users.length} users:`)
      users.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.full_name} (${user.default_role}) - ${user.email}`)
        console.log(`      Home coords: ${JSON.stringify(user.home_location_coords)}`)
        if (user.driver_details) {
          console.log(`      Vehicle: ${user.driver_details.car_model || 'N/A'}`)
        }
      })
    }
    
    // Check pickup locations
    console.log('\n📍 Pickup locations:')
    const { data: locations, error: locationError } = await supabase
      .from('pickup_locations')
      .select('id, user_id, name, description, coords, is_default')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (locationError) {
      console.log('❌ Error fetching locations:', locationError.message)
    } else {
      console.log(`   Found ${locations.length} locations:`)
      locations.forEach((loc, i) => {
        console.log(`   ${i + 1}. ${loc.name} - ${loc.description}`)
        console.log(`      Coords: ${JSON.stringify(loc.coords)}`)
        console.log(`      User ID: ${loc.user_id}`)
      })
    }
    
    // Check opt-ins for test date
    console.log(`\n✋ Opt-ins for ${testDate}:`)
    const { data: optIns, error: optInError } = await supabase
      .from('daily_opt_ins')
      .select(`
        id, user_id, commute_date, time_window_start, time_window_end, status,
        user:users(full_name, default_role),
        pickup_location:pickup_locations(name, description)
      `)
      .eq('commute_date', testDate)
      .order('created_at', { ascending: false })
    
    if (optInError) {
      console.log('❌ Error fetching opt-ins:', optInError.message)
    } else {
      console.log(`   Found ${optIns.length} opt-ins:`)
      optIns.forEach((optIn, i) => {
        console.log(`   ${i + 1}. ${optIn.user?.full_name} (${optIn.user?.default_role})`)
        console.log(`      Time: ${optIn.time_window_start}-${optIn.time_window_end}`)
        console.log(`      Location: ${optIn.pickup_location?.name}`)
        console.log(`      Status: ${optIn.status}`)
      })
    }
    
    // Check matches for test date
    console.log(`\n🎯 Matches for ${testDate}:`)
    const { data: matches, error: matchError } = await supabase
      .from('matched_rides')
      .select(`
        id, driver_user_id, commute_date, status,
        estimated_cost_per_person, ai_confidence_score,
        driver:users!driver_user_id(full_name, email)
      `)
      .eq('commute_date', testDate)
      .order('created_at', { ascending: false })
    
    if (matchError) {
      console.log('❌ Error fetching matches:', matchError.message)
    } else {
      console.log(`   Found ${matches.length} matches:`)
      matches.forEach((match, i) => {
        console.log(`   ${i + 1}. Driver: ${match.driver?.full_name}`)
        console.log(`      Status: ${match.status}`)
        console.log(`      Cost: ৳${match.estimated_cost_per_person}`)
        console.log(`      Confidence: ${(match.ai_confidence_score * 100).toFixed(1)}%`)
      })
    }
    
    // Check ride participants
    console.log('\n👥 Ride participants:')
    const { data: participants, error: participantError } = await supabase
      .from('ride_participants')
      .select(`
        id, matched_ride_id, user_id, status,
        user:users(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (participantError) {
      console.log('❌ Error fetching participants:', participantError.message)
    } else {
      console.log(`   Found ${participants.length} participants:`)
      participants.forEach((participant, i) => {
        console.log(`   ${i + 1}. ${participant.user?.full_name}`)
        console.log(`      Ride ID: ${participant.matched_ride_id}`)
        console.log(`      Status: ${participant.status}`)
      })
    }
    
    // Summary
    console.log('\n📊 Summary:')
    console.log(`   Users: ${users?.length || 0}`)
    console.log(`   Locations: ${locations?.length || 0}`)
    console.log(`   Opt-ins for ${testDate}: ${optIns?.length || 0}`)
    console.log(`   Matches for ${testDate}: ${matches?.length || 0}`)
    console.log(`   Participants: ${participants?.length || 0}`)
    
    // Check if we have the right conditions for matching
    if (optIns && optIns.length > 0) {
      const drivers = optIns.filter(o => o.user?.default_role === 'DRIVER')
      const riders = optIns.filter(o => o.user?.default_role === 'RIDER')
      
      console.log('\n🔍 Matching Analysis:')
      console.log(`   Drivers available: ${drivers.length}`)
      console.log(`   Riders available: ${riders.length}`)
      
      if (drivers.length > 0 && riders.length > 0) {
        console.log('   ✅ Conditions for matching are met')
        
        // Check time overlaps
        const timeOverlaps = []
        drivers.forEach(driver => {
          riders.forEach(rider => {
            if (driver.time_window_start === rider.time_window_start && 
                driver.time_window_end === rider.time_window_end) {
              timeOverlaps.push(`${driver.user.full_name} ↔ ${rider.user.full_name}`)
            }
          })
        })
        
        if (timeOverlaps.length > 0) {
          console.log('   ✅ Time window overlaps found:')
          timeOverlaps.forEach(overlap => console.log(`      ${overlap}`))
        } else {
          console.log('   ⚠️  No time window overlaps found')
        }
      } else {
        console.log('   ❌ Insufficient users for matching')
      }
    }
    
    console.log('\n✅ Database check completed!')
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the check
checkDatabase()
