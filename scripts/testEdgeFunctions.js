#!/usr/bin/env node

/**
 * Test deployed Edge Functions
 * This script tests the deployed Edge Functions to ensure they're working correctly
 */

import { config } from 'dotenv'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

async function testEdgeFunction(functionName, payload = {}) {
  console.log(`\n🧪 Testing ${functionName}...`)
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(payload)
    })
    
    const result = await response.text()
    
    console.log(`   Status: ${response.status} ${response.statusText}`)
    console.log(`   Response: ${result.substring(0, 200)}${result.length > 200 ? '...' : ''}`)
    
    return {
      success: response.ok,
      status: response.status,
      response: result
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
    return {
      success: false,
      error: error.message
    }
  }
}

async function runTests() {
  console.log('🚀 Testing Deployed Edge Functions')
  console.log('=' .repeat(40))
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing environment variables')
    process.exit(1)
  }
  
  const tests = [
    {
      name: 'daily-matching',
      payload: { date: new Date().toISOString().split('T')[0], dryRun: true }
    },
    {
      name: 'scheduled-opt-ins',
      payload: { dryRun: true }
    },
    {
      name: 'cleanup-expired-data',
      payload: { dryRun: true }
    }
  ]
  
  const results = []
  
  for (const test of tests) {
    const result = await testEdgeFunction(test.name, test.payload)
    results.push({ ...test, ...result })
  }
  
  console.log('\n📊 Test Results Summary:')
  console.log('=' .repeat(40))
  
  let successCount = 0
  for (const result of results) {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${result.name}: ${result.success ? 'PASSED' : 'FAILED'}`)
    if (result.success) successCount++
  }
  
  console.log(`\n🎯 Overall: ${successCount}/${results.length} functions working correctly`)
  
  if (successCount === results.length) {
    console.log('🎉 All Edge Functions are deployed and working!')
  } else {
    console.log('⚠️  Some functions may need attention. Check the Supabase Dashboard for logs.')
  }
}

// Run the tests
runTests()
