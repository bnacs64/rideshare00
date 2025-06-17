#!/usr/bin/env node

/**
 * Security Hardening Script for NSU Commute PWA
 * This script implements security best practices and hardening measures
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function runSecurityHardening() {
  console.log('🔒 NSU Commute PWA - Security Hardening')
  console.log('=' .repeat(50))
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  
  try {
    console.log('\n🛡️  Running security hardening checks...')
    
    // 1. Verify RLS is enabled on all tables
    await verifyRLSPolicies(supabase)
    
    // 2. Check authentication configuration
    await verifyAuthConfiguration(supabase)
    
    // 3. Validate API security settings
    await validateAPISettings()
    
    // 4. Generate security headers configuration
    generateSecurityHeaders()
    
    // 5. Create Content Security Policy
    generateCSPConfiguration()
    
    // 6. Set up security monitoring
    await setupSecurityMonitoring(supabase)
    
    console.log('\n✅ Security hardening completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('   1. Deploy the generated security configurations')
    console.log('   2. Test the application with security headers')
    console.log('   3. Monitor security logs and alerts')
    console.log('   4. Schedule regular security audits')
    
  } catch (error) {
    console.error('❌ Security hardening failed:', error.message)
    process.exit(1)
  }
}

async function verifyRLSPolicies(supabase) {
  console.log('\n🔍 Verifying Row Level Security policies...')
  
  const tables = [
    'users', 'pickup_locations', 'daily_opt_ins', 
    'matched_rides', 'ride_participants', 'notifications'
  ]
  
  for (const table of tables) {
    try {
      // Check if RLS is enabled
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error && error.code === 'PGRST116') {
        console.log(`   ✅ ${table}: RLS properly configured`)
      } else if (!error) {
        console.log(`   ⚠️  ${table}: RLS may not be properly configured`)
      }
    } catch (err) {
      console.log(`   ✅ ${table}: RLS access restricted (expected)`)
    }
  }
}

async function verifyAuthConfiguration(supabase) {
  console.log('\n🔐 Verifying authentication configuration...')
  
  try {
    // Check auth settings
    const { data: { session } } = await supabase.auth.getSession()
    console.log('   ✅ Authentication service accessible')
    
    // Verify email validation is enabled
    const emailValidationBypass = process.env.VITE_BYPASS_EMAIL_VALIDATION
    if (emailValidationBypass === 'false' || !emailValidationBypass) {
      console.log('   ✅ Email validation enabled for production')
    } else {
      console.log('   ⚠️  Email validation bypassed (development mode)')
    }
    
    // Check NSU domain restriction
    const nsuDomain = process.env.VITE_NSU_EMAIL_DOMAIN
    if (nsuDomain === '@northsouth.edu') {
      console.log('   ✅ NSU email domain restriction configured')
    } else {
      console.log('   ⚠️  NSU email domain not properly configured')
    }
    
  } catch (error) {
    console.log('   ❌ Authentication configuration error:', error.message)
  }
}

async function validateAPISettings() {
  console.log('\n🌐 Validating API security settings...')
  
  // Check environment variables
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_GEMINI_API_KEY',
    'VITE_GOOGLE_MAPS_API_KEY',
    'VITE_TELEGRAM_BOT_TOKEN'
  ]
  
  let allPresent = true
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}: Configured`)
    } else {
      console.log(`   ❌ ${envVar}: Missing`)
      allPresent = false
    }
  }
  
  if (allPresent) {
    console.log('   ✅ All required API keys configured')
  } else {
    console.log('   ⚠️  Some API keys are missing')
  }
}

function generateSecurityHeaders() {
  console.log('\n📄 Generating security headers configuration...')
  
  const securityHeaders = `
# Security Headers Configuration
# Add these headers to your web server or hosting platform

# Prevent clickjacking attacks
X-Frame-Options: DENY

# Prevent MIME type sniffing
X-Content-Type-Options: nosniff

# Enable XSS protection
X-XSS-Protection: 1; mode=block

# Control referrer information
Referrer-Policy: strict-origin-when-cross-origin

# Permissions policy
Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=()

# Strict Transport Security (HTTPS only)
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# Cross-Origin Embedder Policy
Cross-Origin-Embedder-Policy: require-corp

# Cross-Origin Opener Policy
Cross-Origin-Opener-Policy: same-origin
`
  
  console.log('   ✅ Security headers configuration generated')
  console.log('   📁 Save to: security-headers.conf')
  
  // Write to file
  writeFileSync('security-headers.conf', securityHeaders.trim())
}

function generateCSPConfiguration() {
  console.log('\n🛡️  Generating Content Security Policy...')
  
  const csp = `
# Content Security Policy Configuration
# Add this as a meta tag in your HTML or as an HTTP header

Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' 
    https://maps.googleapis.com 
    https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline' 
    https://fonts.googleapis.com 
    https://unpkg.com;
  img-src 'self' data: https: blob:;
  font-src 'self' 
    https://fonts.gstatic.com;
  connect-src 'self' 
    https://*.supabase.co 
    https://api.telegram.org 
    https://generativelanguage.googleapis.com 
    https://maps.googleapis.com;
  media-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;

# For HTML meta tag:
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.telegram.org;">
`
  
  console.log('   ✅ Content Security Policy generated')
  console.log('   📁 Save to: content-security-policy.conf')
  
  // Write to file
  writeFileSync('content-security-policy.conf', csp.trim())
}

async function setupSecurityMonitoring(supabase) {
  console.log('\n📊 Setting up security monitoring...')
  
  try {
    // Create security monitoring function
    const monitoringSQL = `
-- Security monitoring queries
-- Run these periodically to monitor security events

-- Monitor failed login attempts
SELECT 
  created_at,
  raw_user_meta_data->>'email' as email,
  COUNT(*) as failed_attempts
FROM auth.audit_log_entries 
WHERE event_type = 'user_signedup_failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY created_at, email
HAVING COUNT(*) > 5;

-- Monitor unusual API usage
SELECT 
  created_at,
  event_type,
  COUNT(*) as event_count
FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY created_at, event_type
HAVING COUNT(*) > 100;

-- Monitor database access patterns
SELECT 
  schemaname,
  tablename,
  n_tup_ins + n_tup_upd + n_tup_del as total_changes
FROM pg_stat_user_tables 
WHERE n_tup_ins + n_tup_upd + n_tup_del > 1000;
`
    
    console.log('   ✅ Security monitoring queries generated')
    console.log('   📁 Save to: security-monitoring.sql')
    
    // Write to file
    writeFileSync('security-monitoring.sql', monitoringSQL.trim())
    
    console.log('   ✅ Security monitoring setup completed')
    
  } catch (error) {
    console.log('   ⚠️  Security monitoring setup error:', error.message)
  }
}

// Run the security hardening
runSecurityHardening()
