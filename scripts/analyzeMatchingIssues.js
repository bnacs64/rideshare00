#!/usr/bin/env node

/**
 * Matching Issues Analysis Script
 * 
 * This script analyzes why ride matching might not be working as expected
 * and provides detailed diagnostics for debugging.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TEST_DATE = '2025-06-18'

async function main() {
  console.log('🔍 Analyzing Ride Matching Issues')
  console.log('==================================')
  
  try {
    // Step 1: Check database schema
    await checkDatabaseSchema()
    
    // Step 2: Analyze opt-ins
    await analyzeOptIns()
    
    // Step 3: Check matching logic
    await checkMatchingLogic()
    
    // Step 4: Test Edge Functions
    await testEdgeFunctions()
    
    // Step 5: Provide recommendations
    await provideRecommendations()
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message)
  }
}

async function checkDatabaseSchema() {
  console.log('\n📋 1. Database Schema Check')
  console.log('===========================')
  
  // Check matched_rides table structure
  const { data: rideColumns, error: rideError } = await supabase
    .rpc('exec_sql', {
      sql: `SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'matched_rides' AND table_schema = 'public'
            ORDER BY ordinal_position`
    })
  
  if (rideError) {
    console.log('   ❌ Cannot check matched_rides schema:', rideError.message)
  } else {
    console.log('   ✅ matched_rides table structure:')
    rideColumns.forEach(col => {
      console.log(`      ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })
  }
  
  // Check for required columns
  const requiredColumns = [
    'driver_user_id', 'commute_date', 'route_optimization_data',
    'estimated_cost_per_person', 'status'
  ]
  
  const existingColumns = rideColumns?.map(col => col.column_name) || []
  const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))
  
  if (missingColumns.length > 0) {
    console.log('   ❌ Missing required columns:', missingColumns.join(', '))
  } else {
    console.log('   ✅ All required columns present')
  }
}

async function analyzeOptIns() {
  console.log('\n✋ 2. Opt-ins Analysis')
  console.log('=====================')
  
  // Get all opt-ins for test date
  const { data: optIns, error: optInsError } = await supabase
    .from('daily_opt_ins')
    .select(`
      id, user_id, commute_date, time_window_start, time_window_end, status,
      users (full_name, default_role, driver_details),
      pickup_locations (name, coords)
    `)
    .eq('commute_date', TEST_DATE)
    .order('created_at')
  
  if (optInsError) {
    console.log('   ❌ Error fetching opt-ins:', optInsError.message)
    return
  }
  
  console.log(`   📊 Found ${optIns.length} opt-ins for ${TEST_DATE}:`)
  
  const drivers = optIns.filter(opt => opt.users.default_role === 'DRIVER')
  const riders = optIns.filter(opt => opt.users.default_role === 'RIDER')
  
  console.log(`   🚗 Drivers: ${drivers.length}`)
  drivers.forEach((driver, i) => {
    console.log(`      ${i + 1}. ${driver.users.full_name}`)
    console.log(`         Time: ${driver.time_window_start} - ${driver.time_window_end}`)
    console.log(`         Status: ${driver.status}`)
    console.log(`         Car capacity: ${driver.users.driver_details?.capacity || 'Not set'}`)
  })
  
  console.log(`   🎒 Riders: ${riders.length}`)
  riders.forEach((rider, i) => {
    console.log(`      ${i + 1}. ${rider.users.full_name}`)
    console.log(`         Time: ${rider.time_window_start} - ${rider.time_window_end}`)
    console.log(`         Status: ${rider.status}`)
  })
  
  // Check time overlaps
  console.log('\n   ⏰ Time Window Analysis:')
  drivers.forEach(driver => {
    const driverStart = driver.time_window_start
    const driverEnd = driver.time_window_end
    
    console.log(`   Driver ${driver.users.full_name} (${driverStart} - ${driverEnd}):`)
    
    riders.forEach(rider => {
      const riderStart = rider.time_window_start
      const riderEnd = rider.time_window_end
      
      const overlap = calculateTimeOverlap(driverStart, driverEnd, riderStart, riderEnd)
      const overlapMinutes = overlap > 0 ? Math.round(overlap / 60000) : 0
      
      console.log(`      ↔ ${rider.users.full_name} (${riderStart} - ${riderEnd}): ${overlapMinutes} min overlap`)
    })
  })
}

async function checkMatchingLogic() {
  console.log('\n🤖 3. Matching Logic Check')
  console.log('==========================')
  
  // Check existing matches
  const { data: matches, error: matchError } = await supabase
    .from('matched_rides')
    .select(`
      id, driver_user_id, commute_date, status, ai_confidence_score,
      estimated_cost_per_person, estimated_total_time,
      driver:users!driver_user_id(full_name),
      participants:ride_participants(
        user_id,
        status,
        user:users(full_name, default_role)
      )
    `)
    .eq('commute_date', TEST_DATE)
    .order('created_at', { ascending: false })
  
  if (matchError) {
    console.log('   ❌ Error fetching matches:', matchError.message)
    return
  }
  
  console.log(`   📊 Found ${matches.length} matches for ${TEST_DATE}:`)
  
  matches.forEach((match, i) => {
    console.log(`   ${i + 1}. Match ID: ${match.id}`)
    console.log(`      Driver: ${match.driver.full_name}`)
    console.log(`      Status: ${match.status}`)
    console.log(`      Confidence: ${(match.ai_confidence_score * 100).toFixed(1)}%`)
    console.log(`      Cost per person: ৳${match.estimated_cost_per_person}`)
    console.log(`      Participants (${match.participants.length}):`)
    
    match.participants.forEach(participant => {
      console.log(`         - ${participant.user.full_name} (${participant.user.default_role}) - ${participant.status}`)
    })
  })
  
  // Check for unmatched opt-ins
  const { data: unmatchedOptIns, error: unmatchedError } = await supabase
    .from('daily_opt_ins')
    .select(`
      id, users(full_name, default_role),
      time_window_start, time_window_end
    `)
    .eq('commute_date', TEST_DATE)
    .eq('status', 'PENDING_MATCH')
  
  if (!unmatchedError && unmatchedOptIns.length > 0) {
    console.log(`\n   ⚠️  Unmatched opt-ins (${unmatchedOptIns.length}):`)
    unmatchedOptIns.forEach(optIn => {
      console.log(`      - ${optIn.users.full_name} (${optIn.users.default_role})`)
      console.log(`        Time: ${optIn.time_window_start} - ${optIn.time_window_end}`)
    })
  }
}

async function testEdgeFunctions() {
  console.log('\n🔧 4. Edge Functions Test')
  console.log('=========================')
  
  // Test match-rides function
  console.log('   Testing match-rides function...')
  
  const { data: pendingOptIns } = await supabase
    .from('daily_opt_ins')
    .select('id')
    .eq('commute_date', TEST_DATE)
    .eq('status', 'PENDING_MATCH')
    .limit(1)
  
  if (pendingOptIns && pendingOptIns.length > 0) {
    const testOptInId = pendingOptIns[0].id
    
    try {
      const { data, error } = await supabase.functions.invoke('match-rides', {
        body: {
          targetOptInId: testOptInId,
          forceMatch: true
        }
      })
      
      if (error) {
        console.log('   ❌ match-rides function error:', error.message)
      } else {
        console.log('   ✅ match-rides function working')
        console.log(`      Matches found: ${data.matches?.length || 0}`)
        console.log(`      Good matches: ${data.goodMatches || 0}`)
      }
    } catch (error) {
      console.log('   ❌ match-rides function failed:', error.message)
    }
  } else {
    console.log('   ⚠️  No pending opt-ins to test with')
  }
  
  // Test daily-matching function
  console.log('\n   Testing daily-matching function...')
  
  try {
    const { data, error } = await supabase.functions.invoke('daily-matching', {
      body: {
        date: TEST_DATE,
        dryRun: true
      }
    })
    
    if (error) {
      console.log('   ❌ daily-matching function error:', error.message)
    } else {
      console.log('   ✅ daily-matching function working')
      console.log(`      Total opt-ins: ${data.totalOptIns || 0}`)
      console.log(`      Processed: ${data.optInsProcessed || 0}`)
      console.log(`      Matches created: ${data.matchesCreated || 0}`)
    }
  } catch (error) {
    console.log('   ❌ daily-matching function failed:', error.message)
  }
}

async function provideRecommendations() {
  console.log('\n💡 5. Recommendations')
  console.log('=====================')
  
  console.log('   Based on the analysis, here are the key issues and solutions:')
  
  console.log('\n   🔧 Technical Issues:')
  console.log('   • Schema mismatch: Some queries use old column names')
  console.log('   • Edge Functions: May have deployment or configuration issues')
  console.log('   • Matching Algorithm: May be too strict with confidence thresholds')
  
  console.log('\n   🎯 Immediate Fixes:')
  console.log('   1. Update all queries to use new schema column names')
  console.log('   2. Lower confidence threshold for testing (from 70% to 50%)')
  console.log('   3. Ensure Edge Functions are properly deployed')
  console.log('   4. Add more detailed logging to matching functions')
  
  console.log('\n   🧪 Testing Steps:')
  console.log('   1. Run the test scenario script again')
  console.log('   2. Check the UI for ride proposals')
  console.log('   3. Test manual matching triggers')
  console.log('   4. Verify notification systems')
  
  console.log('\n   📱 UI Testing:')
  console.log('   • Login as driver.test@nsu.edu to see driver view')
  console.log('   • Login as rider1.test@nsu.edu to see rider view')
  console.log('   • Check Dashboard → My Rides for proposals')
  console.log('   • Test accepting/declining rides')
}

function calculateTimeOverlap(start1, end1, start2, end2) {
  const startTime1 = new Date(`2000-01-01T${start1}`)
  const endTime1 = new Date(`2000-01-01T${end1}`)
  const startTime2 = new Date(`2000-01-01T${start2}`)
  const endTime2 = new Date(`2000-01-01T${end2}`)
  
  const overlapStart = new Date(Math.max(startTime1.getTime(), startTime2.getTime()))
  const overlapEnd = new Date(Math.min(endTime1.getTime(), endTime2.getTime()))
  
  return Math.max(0, overlapEnd.getTime() - overlapStart.getTime())
}

// Run the analysis
main().catch(console.error)
