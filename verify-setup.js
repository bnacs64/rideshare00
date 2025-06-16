// Simple verification script to test Supabase connection
// Run with: node verify-setup.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('🔍 Verifying NSU Commute Setup...\n')

// Check environment variables
console.log('📋 Environment Variables:')
console.log(`   VITE_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
console.log(`   VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`)

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('\n❌ Missing environment variables. Please check your .env file.')
  process.exit(1)
}

// Test Supabase connection
const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('\n🔗 Testing Supabase Connection...')

try {
  // Test basic connection
  const { error } = await supabase.auth.getSession()
  
  if (error) {
    console.log(`❌ Connection failed: ${error.message}`)
    process.exit(1)
  }
  
  console.log('✅ Supabase connection successful!')
  
  // Test database tables
  console.log('\n📊 Checking Database Tables...')
  
  const tables = ['users', 'pickup_locations', 'daily_opt_ins', 'scheduled_opt_ins', 'matched_rides', 'ride_participants']
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1)
      if (error) {
        console.log(`❌ Table '${table}': ${error.message}`)
      } else {
        console.log(`✅ Table '${table}': OK`)
      }
    } catch (err) {
      console.log(`❌ Table '${table}': ${err.message}`)
    }
  }
  
  console.log('\n🎉 Setup verification complete!')
  console.log('\n📝 Next steps:')
  console.log('   1. Start the dev server: npm run dev')
  console.log('   2. Open http://localhost:3000')
  console.log('   3. Test user registration with @northsouth.edu email')
  
} catch (error) {
  console.log(`❌ Verification failed: ${error.message}`)
  process.exit(1)
}
