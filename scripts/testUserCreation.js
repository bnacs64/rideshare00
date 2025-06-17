#!/usr/bin/env node

/**
 * Command-line script to test user creation programmatically
 * This script can be run independently of the React app to test backend functionality
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('- VITE_SUPABASE_URL:', !!supabaseUrl)
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test user data - testing different domains to verify bypass functionality
const TEST_USERS = [
  {
    email: 'cmdtest1@northsouth.edu',
    password: 'TestPassword123!',
    fullName: 'Command Line Test User 1 (NSU)',
    defaultRole: 'RIDER',
    homeLocationCoords: [90.4125, 23.8103],
    homeLocationAddress: 'Dhaka, Bangladesh'
  },
  {
    email: 'cmdtest2@akshathe.xyz',
    password: 'TestPassword123!',
    fullName: 'Command Line Test User 2 (Bypass Domain)',
    defaultRole: 'DRIVER',
    homeLocationCoords: [90.4125, 23.8103],
    homeLocationAddress: 'Dhaka, Bangladesh',
    driverDetails: {
      license_number: 'CMD123456789',
      vehicle_make: 'Toyota',
      vehicle_model: 'Corolla',
      vehicle_year: 2020,
      vehicle_color: 'White',
      vehicle_plate: 'CMD-1234',
      max_passengers: 4
    }
  },
  {
    email: 'cmdtest3@example.com',
    password: 'TestPassword123!',
    fullName: 'Command Line Test User 3 (Example Domain)',
    defaultRole: 'RIDER',
    homeLocationCoords: [90.4125, 23.8103],
    homeLocationAddress: 'Dhaka, Bangladesh'
  }
]

/**
 * Test Supabase connection
 */
async function testConnection() {
  console.log('🔍 Testing Supabase connection...')
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Connection test failed:', error.message)
      return false
    }
    
    console.log('✅ Supabase connection successful')
    return true
  } catch (error) {
    console.error('❌ Connection test error:', error.message)
    return false
  }
}

/**
 * Create a test user programmatically
 */
async function createTestUser(testUser) {
  const startTime = Date.now()

  try {
    console.log(`\n🚀 Creating test user: ${testUser.email}`)

    // Create admin client for all operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Step 1: Create auth user using admin API
    console.log('📝 Step 1: Creating auth user...')
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true // Auto-confirm email for testing
    })

    if (authError) {
      console.error('❌ Auth user creation failed:', authError.message)
      return { success: false, error: authError.message, duration: Date.now() - startTime }
    }

    console.log('✅ Auth user created:', authData.user.email)
    
    // Step 2: Create user profile using service role
    console.log('📝 Step 2: Creating user profile...')

    const profileData = {
      id: authData.user.id,
      email: authData.user.email,
      full_name: testUser.fullName,
      default_role: testUser.defaultRole,
      home_location_coords: `POINT(${testUser.homeLocationCoords[0]} ${testUser.homeLocationCoords[1]})`,
      home_location_address: testUser.homeLocationAddress,
      driver_details: testUser.driverDetails || null,
      telegram_user_id: null
    }

    const { data: profileResult, error: profileError } = await adminClient
      .from('users')
      .insert(profileData)
      .select()
      .single()
    
    if (profileError) {
      console.error('❌ Profile creation failed:', profileError.message)

      // Cleanup: delete the auth user if profile creation failed
      await adminClient.auth.admin.deleteUser(authData.user.id)

      return { success: false, error: profileError.message, duration: Date.now() - startTime }
    }
    
    console.log('✅ User profile created successfully')
    
    return {
      success: true,
      data: {
        authUser: authData.user,
        profile: profileResult
      },
      duration: Date.now() - startTime
    }
    
  } catch (error) {
    console.error('💥 Test user creation failed:', error.message)
    return { success: false, error: error.message, duration: Date.now() - startTime }
  }
}

/**
 * Test user signin
 */
async function testUserSignIn(email, password) {
  console.log(`\n🔐 Testing signin for: ${email}`)
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      console.error('❌ Signin failed:', error.message)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Signin successful:', data.user?.email)
    
    // Test profile fetch using admin client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError.message)
      return { success: false, error: profileError.message }
    }
    
    console.log('✅ Profile fetch successful:', profile.full_name)
    
    return { success: true, data: { user: data.user, profile } }
    
  } catch (error) {
    console.error('💥 Signin test failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Cleanup test users
 */
async function cleanupTestUsers(emails) {
  console.log('\n🧹 Cleaning up test users...')

  // Create admin client for cleanup operations
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  for (const email of emails) {
    try {
      // Get user by email
      const { data: users, error: listError } = await adminClient.auth.admin.listUsers()

      if (listError) {
        console.error(`❌ Failed to list users: ${listError.message}`)
        continue
      }

      const user = users.users.find(u => u.email === email)

      if (user) {
        // Delete from users table using admin client
        await adminClient
          .from('users')
          .delete()
          .eq('id', user.id)

        // Delete auth user
        await adminClient.auth.admin.deleteUser(user.id)

        console.log(`🗑️ Deleted user: ${email}`)
      } else {
        console.log(`⚠️ User not found: ${email}`)
      }

    } catch (error) {
      console.warn(`⚠️ Could not cleanup user ${email}:`, error.message)
    }
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 NSU Commute User Creation Test Suite')
  console.log('=====================================\n')
  
  // Test connection
  const connectionOk = await testConnection()
  if (!connectionOk) {
    console.error('❌ Connection test failed. Exiting.')
    process.exit(1)
  }
  
  const results = []
  
  // Test user creation
  for (const testUser of TEST_USERS) {
    const result = await createTestUser(testUser)
    results.push({ user: testUser.email, ...result })
    
    if (result.success) {
      // Test signin
      const signinResult = await testUserSignIn(testUser.email, testUser.password)
      if (!signinResult.success) {
        console.error(`❌ Signin test failed for ${testUser.email}`)
      }
    }
  }
  
  // Print summary
  console.log('\n📊 Test Results Summary:')
  console.log('========================')
  
  const successCount = results.filter(r => r.success).length
  const totalCount = results.length
  
  console.log(`Total tests: ${totalCount}`)
  console.log(`Passed: ${successCount}`)
  console.log(`Failed: ${totalCount - successCount}`)
  console.log(`Success rate: ${((successCount / totalCount) * 100).toFixed(1)}%`)
  
  results.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    const duration = result.duration ? `(${result.duration}ms)` : ''
    console.log(`${index + 1}. ${result.user}: ${status} ${duration}`)
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  })
  
  // Cleanup
  const testEmails = TEST_USERS.map(u => u.email)
  await cleanupTestUsers(testEmails)
  
  console.log('\n✅ Test suite completed!')
}

// Run the tests
console.log('Script starting...')
console.log('import.meta.url:', import.meta.url)
console.log('process.argv[1]:', process.argv[1])

// Always run tests for now
runTests().catch(error => {
  console.error('💥 Test suite failed:', error)
  process.exit(1)
})

export {
  testConnection,
  createTestUser,
  testUserSignIn,
  cleanupTestUsers,
  runTests
}
