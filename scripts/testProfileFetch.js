#!/usr/bin/env node

/**
 * Test Profile Fetch Script
 * 
 * This script tests the exact profile fetching logic that AuthContext uses.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY // Use anon key like the frontend
)

async function main() {
  console.log('🧪 Testing Profile Fetch')
  console.log('========================')
  
  try {
    // Test with the driver user ID
    const testUserId = '84674410-39c3-41f5-9ebb-5298484ec0fc'
    
    console.log(`\n📝 Testing profile fetch for user: ${testUserId}`)
    
    // Test the exact query that userService.getUserProfile uses
    const startTime = Date.now()
    
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        default_role,
        home_location_coords,
        home_location_address,
        driver_details,
        telegram_user_id,
        created_at,
        updated_at
      `)
      .eq('id', testUserId)
      .single()
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`\n⏱️  Query duration: ${duration}ms`)
    
    if (error) {
      console.log(`❌ Query failed: ${error.message}`)
      console.log(`📋 Error code: ${error.code}`)
      console.log(`📋 Error details:`, error)
    } else {
      console.log(`✅ Query succeeded!`)
      console.log(`📋 User data:`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Full Name: "${user.full_name}"`)
      console.log(`   Role: ${user.default_role}`)
      console.log(`   Home Address: "${user.home_location_address}"`)
      console.log(`   Home Coords: ${user.home_location_coords}`)
      console.log(`   Driver Details: ${user.driver_details ? JSON.stringify(user.driver_details) : 'null'}`)
    }
    
    // Test with timeout like AuthContext does
    console.log(`\n🕐 Testing with 8-second timeout...`)
    
    const profilePromise = supabase
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single()
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Profile fetch timeout')), 8000)
    )
    
    try {
      const startTime2 = Date.now()
      const result = await Promise.race([profilePromise, timeoutPromise])
      const endTime2 = Date.now()
      const duration2 = endTime2 - startTime2
      
      console.log(`✅ Timeout test succeeded in ${duration2}ms`)
      console.log(`📋 User: ${result.data.email}`)
    } catch (timeoutError) {
      console.log(`❌ Timeout test failed: ${timeoutError.message}`)
    }
    
    // Test authentication state
    console.log(`\n🔐 Testing authentication state...`)
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log(`❌ Session error: ${sessionError.message}`)
    } else if (session) {
      console.log(`✅ Session found: ${session.user.email}`)
    } else {
      console.log(`ℹ️  No active session`)
    }
    
  } catch (error) {
    console.error('❌ Error in profile fetch test:', error.message)
  }
}

// Run the script
main().catch(console.error)
