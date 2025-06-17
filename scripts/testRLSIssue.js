#!/usr/bin/env node

/**
 * Test RLS Issue Script
 * 
 * This script tests if Row Level Security is blocking profile fetches.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function main() {
  console.log('🔐 Testing RLS Issue')
  console.log('====================')
  
  try {
    const testUserId = '84674410-39c3-41f5-9ebb-5298484ec0fc'
    
    // Test 1: Service role (should bypass RLS)
    console.log('\n🔧 Test 1: Service Role Query')
    
    const serviceSupabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { data: serviceUser, error: serviceError } = await serviceSupabase
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single()
    
    if (serviceError) {
      console.log(`   ❌ Service role query failed: ${serviceError.message}`)
    } else {
      console.log(`   ✅ Service role query succeeded: ${serviceUser.email}`)
    }
    
    // Test 2: Anon key (subject to RLS)
    console.log('\n🔓 Test 2: Anon Key Query')
    
    const anonSupabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )
    
    const { data: anonUser, error: anonError } = await anonSupabase
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single()
    
    if (anonError) {
      console.log(`   ❌ Anon key query failed: ${anonError.message}`)
      console.log(`   📋 This indicates RLS is blocking the query`)
    } else {
      console.log(`   ✅ Anon key query succeeded: ${anonUser.email}`)
    }
    
    // Test 3: Check RLS policies
    console.log('\n📋 Test 3: Check RLS Policies')
    
    const { data: policies, error: policiesError } = await serviceSupabase
      .rpc('exec_sql', {
        sql: `
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
          FROM pg_policies 
          WHERE tablename = 'users'
        `
      })
    
    if (policiesError) {
      console.log(`   ❌ Cannot check policies: ${policiesError.message}`)
    } else {
      console.log(`   📊 Found ${policies.length} RLS policies on users table:`)
      policies.forEach(policy => {
        console.log(`      • ${policy.policyname} (${policy.cmd}) - ${policy.permissive}`)
        console.log(`        Roles: ${policy.roles}`)
        console.log(`        Condition: ${policy.qual}`)
      })
    }
    
    // Test 4: Try authenticated query
    console.log('\n🔑 Test 4: Authenticated Query')
    
    // First, try to sign in
    const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
      email: 'driver.test@nsu.edu',
      password: 'TestPassword123!'
    })
    
    if (signInError) {
      console.log(`   ❌ Sign in failed: ${signInError.message}`)
    } else {
      console.log(`   ✅ Sign in succeeded: ${signInData.user.email}`)
      
      // Now try the query as authenticated user
      const { data: authUser, error: authError } = await anonSupabase
        .from('users')
        .select('*')
        .eq('id', testUserId)
        .single()
      
      if (authError) {
        console.log(`   ❌ Authenticated query failed: ${authError.message}`)
      } else {
        console.log(`   ✅ Authenticated query succeeded: ${authUser.email}`)
      }
      
      // Sign out
      await anonSupabase.auth.signOut()
    }
    
    // Test 5: Check if RLS is enabled
    console.log('\n🛡️  Test 5: Check RLS Status')
    
    const { data: rlsStatus, error: rlsError } = await serviceSupabase
      .rpc('exec_sql', {
        sql: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE tablename = 'users' AND schemaname = 'public'
        `
      })
    
    if (rlsError) {
      console.log(`   ❌ Cannot check RLS status: ${rlsError.message}`)
    } else {
      console.log(`   📊 RLS Status:`)
      rlsStatus.forEach(table => {
        console.log(`      Table: ${table.tablename}`)
        console.log(`      RLS Enabled: ${table.rowsecurity}`)
      })
    }
    
    console.log('\n💡 Summary:')
    console.log('If anon key queries fail but service role queries succeed,')
    console.log('then RLS policies are blocking unauthenticated access.')
    console.log('The frontend needs to authenticate first before fetching profiles.')
    
  } catch (error) {
    console.error('❌ Error in RLS test:', error.message)
  }
}

// Run the script
main().catch(console.error)
