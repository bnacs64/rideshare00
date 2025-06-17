#!/usr/bin/env node

/**
 * Check Auth Users Script
 * 
 * This script checks if test users exist in Supabase Auth
 * and creates them if they don't exist.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TEST_USERS = [
  {
    email: 'driver.test@nsu.edu',
    password: 'TestPassword123!',
    full_name: 'Ahmed Rahman (Test Driver)',
    default_role: 'DRIVER'
  },
  {
    email: 'rider1.test@nsu.edu',
    password: 'TestPassword123!',
    full_name: 'Student 1 (Test Rider)',
    default_role: 'RIDER'
  },
  {
    email: 'rider2.test@nsu.edu',
    password: 'TestPassword123!',
    full_name: 'Student 2 (Test Rider)',
    default_role: 'RIDER'
  },
  {
    email: 'gulshan0@akshathe.xyz',
    password: 'TestPassword123!',
    full_name: 'gulshan0',
    default_role: 'RIDER'
  },
  {
    email: 'dhanmondi0@akshathe.xyz',
    password: 'TestPassword123!',
    full_name: 'dhanmondi0',
    default_role: 'RIDER'
  }
]

async function main() {
  console.log('🔍 Checking Supabase Auth Users')
  console.log('================================')
  
  try {
    for (const testUser of TEST_USERS) {
      await checkAndCreateAuthUser(testUser)
    }
    
    console.log('\n✅ All auth users checked and created if needed')
    console.log('\n🎯 You can now login with these credentials:')
    TEST_USERS.forEach(user => {
      console.log(`   • ${user.email} / ${user.password}`)
    })
    
  } catch (error) {
    console.error('❌ Error checking auth users:', error.message)
  }
}

async function checkAndCreateAuthUser(testUser) {
  console.log(`\n👤 Checking auth user: ${testUser.email}`)
  
  try {
    // Try to sign in to check if user exists
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    })
    
    if (signInData.user) {
      console.log(`   ✅ Auth user exists: ${signInData.user.id}`)
      
      // Sign out immediately
      await supabase.auth.signOut()
      
      return
    }
    
    if (signInError) {
      console.log(`   ⚠️  Sign in failed: ${signInError.message}`)
      
      // If it's invalid credentials, the user might exist but password is wrong
      if (signInError.message.includes('Invalid login credentials')) {
        console.log(`   🔄 User exists but password might be wrong, trying to update...`)
        
        // Try to get user by email using admin API
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
        
        if (listError) {
          console.log(`   ❌ Error listing users: ${listError.message}`)
        } else {
          const existingUser = users.find(u => u.email === testUser.email)
          if (existingUser) {
            console.log(`   🔄 Updating password for existing user...`)
            
            const { error: updateError } = await supabase.auth.admin.updateUserById(
              existingUser.id,
              { password: testUser.password }
            )
            
            if (updateError) {
              console.log(`   ❌ Error updating password: ${updateError.message}`)
            } else {
              console.log(`   ✅ Password updated successfully`)
            }
            return
          }
        }
      }
      
      // User doesn't exist, create them
      console.log(`   🔄 Creating new auth user...`)
      
      const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: testUser.full_name,
          default_role: testUser.default_role
        }
      })
      
      if (signUpError) {
        console.log(`   ❌ Error creating auth user: ${signUpError.message}`)
      } else {
        console.log(`   ✅ Auth user created: ${signUpData.user.id}`)
        
        // Update the database user record with the correct auth ID
        const { error: updateDbError } = await supabase
          .from('users')
          .update({ id: signUpData.user.id })
          .eq('email', testUser.email)
        
        if (updateDbError) {
          console.log(`   ⚠️  Warning: Could not update database user ID: ${updateDbError.message}`)
        } else {
          console.log(`   ✅ Database user ID updated`)
        }
      }
    }
    
  } catch (error) {
    console.error(`   ❌ Exception checking user ${testUser.email}:`, error.message)
  }
}

// Run the script
main().catch(console.error)
