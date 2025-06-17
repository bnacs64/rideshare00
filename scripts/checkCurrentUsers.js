#!/usr/bin/env node

/**
 * Check Current Users Script
 * 
 * This script checks what users currently exist in the database
 * and compares with auth users to identify the sync issue.
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
  console.log('🔍 Checking Current Users')
  console.log('========================')
  
  try {
    // Step 1: Get all database users
    console.log('\n📋 Database users:')
    
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('id, email, full_name, default_role')
      .order('created_at')
    
    if (dbError) {
      console.log(`   ❌ Error fetching database users: ${dbError.message}`)
    } else {
      console.log(`   📊 Found ${dbUsers.length} database users:`)
      dbUsers.forEach((user, i) => {
        console.log(`      ${i + 1}. ${user.email} - "${user.full_name}" (${user.default_role})`)
        console.log(`         ID: ${user.id}`)
      })
    }
    
    // Step 2: Get all auth users
    console.log('\n🔑 Auth users:')
    
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.log(`   ❌ Error fetching auth users: ${authError.message}`)
    } else {
      console.log(`   📊 Found ${authUsers.length} auth users:`)
      authUsers.forEach((user, i) => {
        console.log(`      ${i + 1}. ${user.email}`)
        console.log(`         ID: ${user.id}`)
        console.log(`         Created: ${user.created_at}`)
      })
    }
    
    // Step 3: Check sync status
    console.log('\n🔄 Sync status:')
    
    const testEmails = [
      'driver.test@nsu.edu',
      'rider1.test@nsu.edu',
      'rider2.test@nsu.edu'
    ]
    
    for (const email of testEmails) {
      console.log(`\n   👤 ${email}:`)
      
      // Find auth user
      const authUser = authUsers?.find(u => u.email === email)
      if (authUser) {
        console.log(`      🔑 Auth ID: ${authUser.id}`)
      } else {
        console.log(`      ❌ No auth user found`)
        continue
      }
      
      // Find database user by email
      const dbUserByEmail = dbUsers?.find(u => u.email === email)
      if (dbUserByEmail) {
        console.log(`      📋 DB ID (by email): ${dbUserByEmail.id}`)
        console.log(`      📋 Full name: "${dbUserByEmail.full_name}"`)
      } else {
        console.log(`      ❌ No database user found by email`)
      }
      
      // Find database user by auth ID
      const dbUserByAuthId = dbUsers?.find(u => u.id === authUser.id)
      if (dbUserByAuthId) {
        console.log(`      ✅ DB user found by auth ID: "${dbUserByAuthId.full_name}"`)
      } else {
        console.log(`      ❌ No database user found by auth ID`)
      }
      
      // Determine sync status
      if (authUser && dbUserByAuthId) {
        console.log(`      ✅ SYNCED - AuthContext will work`)
      } else if (authUser && dbUserByEmail) {
        console.log(`      ⚠️  ID MISMATCH - AuthContext will fail`)
      } else if (authUser) {
        console.log(`      ❌ MISSING DB USER - AuthContext will fail`)
      } else {
        console.log(`      ❌ MISSING AUTH USER - Login will fail`)
      }
    }
    
    // Step 4: Provide fix recommendations
    console.log('\n💡 Fix recommendations:')
    
    const missingDbUsers = testEmails.filter(email => {
      const authUser = authUsers?.find(u => u.email === email)
      const dbUserByAuthId = dbUsers?.find(u => u.id === authUser?.id)
      return authUser && !dbUserByAuthId
    })
    
    if (missingDbUsers.length > 0) {
      console.log(`   🔧 Need to create database users for: ${missingDbUsers.join(', ')}`)
      console.log(`   📝 Run: node scripts/createMissingDbUsers.js`)
    }
    
    const mismatchedUsers = testEmails.filter(email => {
      const authUser = authUsers?.find(u => u.email === email)
      const dbUserByEmail = dbUsers?.find(u => u.email === email)
      const dbUserByAuthId = dbUsers?.find(u => u.id === authUser?.id)
      return authUser && dbUserByEmail && !dbUserByAuthId
    })
    
    if (mismatchedUsers.length > 0) {
      console.log(`   🔧 Need to fix ID mismatch for: ${mismatchedUsers.join(', ')}`)
      console.log(`   📝 Run: node scripts/fixUserIdMismatch.js`)
    }
    
    if (missingDbUsers.length === 0 && mismatchedUsers.length === 0) {
      console.log(`   ✅ All users are properly synced!`)
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message)
  }
}

// Run the script
main().catch(console.error)
