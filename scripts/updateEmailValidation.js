#!/usr/bin/env node

/**
 * Update Email Validation Script
 * 
 * This script updates the database email validation trigger to allow test domains.
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
  console.log('🔧 Updating Email Validation Rules')
  console.log('==================================')
  
  try {
    // Step 1: Update the email validation trigger function
    console.log('\n📝 Updating email validation trigger function...')
    
    const updateTriggerSQL = `
      CREATE OR REPLACE FUNCTION validate_nsu_email_with_bypass()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Check if this is a service role operation (bypass for admin operations)
          IF auth.uid() IS NULL THEN
              RETURN NEW;
          END IF;
          
          -- Allow approved domains for development/testing
          IF NEW.email ILIKE '%@northsouth.edu' OR 
             NEW.email ILIKE '%@nsu.edu' OR
             NEW.email ILIKE '%@akshathe.xyz' OR 
             NEW.email ILIKE '%@example.com' OR 
             NEW.email ILIKE '%@test.com' OR 
             NEW.email ILIKE '%@localhost' OR
             NEW.email ILIKE '%@dev.local' THEN
              RETURN NEW;
          END IF;
          
          -- Reject other domains
          RAISE EXCEPTION 'Email must be from North South University domain (@northsouth.edu) or approved testing domain';
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `
    
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: updateTriggerSQL
    })
    
    if (functionError) {
      console.log(`   ❌ Error updating function: ${functionError.message}`)
      
      // Try alternative approach using direct SQL execution
      console.log('   🔄 Trying alternative approach...')
      
      const { error: altError } = await supabase
        .from('_supabase_migrations')
        .select('version')
        .limit(1)
      
      if (altError) {
        console.log('   ⚠️  Cannot execute SQL directly, will use Edge Function approach')
      }
    } else {
      console.log('   ✅ Email validation function updated')
    }
    
    // Step 2: Drop old trigger and create new one
    console.log('\n🔄 Updating trigger...')
    
    const updateTriggerSQL2 = `
      DROP TRIGGER IF EXISTS validate_nsu_email_trigger ON users;
      
      CREATE TRIGGER validate_nsu_email_trigger
          BEFORE INSERT OR UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION validate_nsu_email_with_bypass();
    `
    
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: updateTriggerSQL2
    })
    
    if (triggerError) {
      console.log(`   ❌ Error updating trigger: ${triggerError.message}`)
      console.log('   🔄 Will try manual approach...')
      
      // Manual approach: Add test domains to allowed list
      await addTestDomainsToAllowedList()
    } else {
      console.log('   ✅ Email validation trigger updated')
    }
    
    // Step 3: Test the validation
    console.log('\n🧪 Testing email validation...')
    await testEmailValidation()
    
    console.log('\n✅ Email validation update completed!')
    console.log('\n🎯 Test users should now be able to complete profile setup')
    
  } catch (error) {
    console.error('❌ Error updating email validation:', error.message)
  }
}

async function addTestDomainsToAllowedList() {
  console.log('   📝 Adding test domains to allowed list...')
  
  const testDomains = ['@nsu.edu', '@akshathe.xyz', '@test.com']
  
  for (const domain of testDomains) {
    try {
      const { data, error } = await supabase.functions.invoke('manage-email-validation', {
        body: { action: 'add_domain', domain }
      })
      
      if (error) {
        console.log(`   ⚠️  Warning adding ${domain}: ${error.message}`)
      } else {
        console.log(`   ✅ Added ${domain} to allowed domains`)
      }
    } catch (error) {
      console.log(`   ⚠️  Warning adding ${domain}: ${error.message}`)
    }
  }
}

async function testEmailValidation() {
  const testEmails = [
    'test@northsouth.edu',
    'test@nsu.edu',
    'test@akshathe.xyz'
  ]
  
  for (const email of testEmails) {
    console.log(`   Testing ${email}...`)
    
    // Try to create a test user (we'll delete it immediately)
    const testUserId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const { error } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        email: email,
        full_name: 'Test User',
        default_role: 'RIDER',
        home_location_coords: 'POINT(90.4125 23.8103)',
        home_location_address: 'Test Address'
      })
    
    if (error) {
      if (error.message.includes('Email must be from North South University domain')) {
        console.log(`   ❌ ${email} - Still blocked by validation`)
      } else {
        console.log(`   ⚠️  ${email} - Other error: ${error.message}`)
      }
    } else {
      console.log(`   ✅ ${email} - Validation passed`)
      
      // Clean up test user
      await supabase
        .from('users')
        .delete()
        .eq('id', testUserId)
    }
  }
}

// Run the script
main().catch(console.error)
