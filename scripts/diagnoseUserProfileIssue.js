#!/usr/bin/env node

/**
 * Diagnose User Profile Issue Script
 * 
 * This script diagnoses the 406 error when fetching user profiles
 * by testing the exact same query and checking data formats.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('🔍 Diagnosing User Profile Issue')
  console.log('================================')
  
  try {
    const testUserId = '84674410-39c3-41f5-9ebb-5298484ec0fc' // Driver auth ID
    
    // Step 1: Test the exact same query that's failing
    console.log('\n📝 Testing exact AuthContext query...')
    console.log(`   User ID: ${testUserId}`)
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single()
    
    if (error) {
      console.log(`   ❌ Query failed: ${error.message}`)
      console.log(`   📋 Error details:`, error)
      
      // Try without .single() to see if that's the issue
      console.log('\n🔄 Trying without .single()...')
      
      const { data: dataArray, error: arrayError } = await supabase
        .from('users')
        .select('*')
        .eq('id', testUserId)
      
      if (arrayError) {
        console.log(`   ❌ Array query also failed: ${arrayError.message}`)
      } else {
        console.log(`   ✅ Array query succeeded, found ${dataArray.length} records`)
        if (dataArray.length > 0) {
          console.log(`   📋 First record:`, dataArray[0])
        }
      }
    } else {
      console.log(`   ✅ Query succeeded!`)
      console.log(`   📋 User data:`, data)
      
      // Step 2: Check the home_location_coords format
      console.log('\n📍 Analyzing home_location_coords format...')
      console.log(`   Raw value:`, data.home_location_coords)
      console.log(`   Type:`, typeof data.home_location_coords)
      
      if (data.home_location_coords) {
        console.log(`   JSON stringify:`, JSON.stringify(data.home_location_coords))
        
        // Test the parseLocationCoords function
        console.log('\n🧪 Testing parseLocationCoords function...')
        const parsed = parseLocationCoords(data.home_location_coords)
        console.log(`   Parsed result:`, parsed)
      }
    }
    
    // Step 3: Check if there are multiple users with same ID
    console.log('\n🔍 Checking for duplicate users...')
    
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', testUserId)
    
    if (allError) {
      console.log(`   ❌ Error checking duplicates: ${allError.message}`)
    } else {
      console.log(`   📊 Found ${allUsers.length} users with ID ${testUserId}`)
      allUsers.forEach((user, i) => {
        console.log(`      ${i + 1}. ${user.email} - "${user.full_name}"`)
      })
    }
    
    // Step 4: Test with different select fields
    console.log('\n🧪 Testing with specific field selection...')
    
    const { data: limitedData, error: limitedError } = await supabase
      .from('users')
      .select('id, email, full_name, default_role')
      .eq('id', testUserId)
      .single()
    
    if (limitedError) {
      console.log(`   ❌ Limited query failed: ${limitedError.message}`)
    } else {
      console.log(`   ✅ Limited query succeeded:`, limitedData)
    }
    
    // Step 5: Test with PostGIS field specifically
    console.log('\n🗺️  Testing PostGIS field specifically...')
    
    const { data: gisData, error: gisError } = await supabase
      .from('users')
      .select('id, email, home_location_coords')
      .eq('id', testUserId)
      .single()
    
    if (gisError) {
      console.log(`   ❌ PostGIS query failed: ${gisError.message}`)
    } else {
      console.log(`   ✅ PostGIS query succeeded:`, gisData)
    }
    
    // Step 6: Test using anon key instead of service role
    console.log('\n🔑 Testing with anon key...')
    
    const anonSupabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )
    
    const { data: anonData, error: anonError } = await anonSupabase
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single()
    
    if (anonError) {
      console.log(`   ❌ Anon query failed: ${anonError.message}`)
      console.log(`   📋 This might be the issue - RLS policy or permissions`)
    } else {
      console.log(`   ✅ Anon query succeeded:`, anonData)
    }
    
  } catch (error) {
    console.error('❌ Error in diagnosis:', error.message)
  }
}

// Copy of the parseLocationCoords function for testing
function parseLocationCoords(postgisPoint) {
  console.log(`   🔍 parseLocationCoords input:`, postgisPoint)
  console.log(`   🔍 Input type:`, typeof postgisPoint)
  
  if (typeof postgisPoint === 'string') {
    // Parse "POINT(lng lat)" format
    const match = postgisPoint.match(/POINT\(([^)]+)\)/)
    if (match) {
      const [lng, lat] = match[1].split(' ').map(Number)
      console.log(`   ✅ Parsed as string: [${lng}, ${lat}]`)
      return [lng, lat]
    } else {
      console.log(`   ❌ String format not recognized`)
    }
  } else if (postgisPoint && typeof postgisPoint === 'object') {
    console.log(`   🔍 Object structure:`, JSON.stringify(postgisPoint, null, 2))
    
    // Check if it's a PostGIS geometry object
    if (postgisPoint.coordinates && Array.isArray(postgisPoint.coordinates)) {
      const [lng, lat] = postgisPoint.coordinates
      console.log(`   ✅ Parsed as geometry object: [${lng}, ${lat}]`)
      return [lng, lat]
    }
  }
  
  // Fallback for other formats or if parsing fails
  console.log(`   ⚠️  Using fallback coordinates`)
  return [90.4125, 23.8103] // Default to Dhaka coordinates
}

// Run the script
main().catch(console.error)
