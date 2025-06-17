#!/usr/bin/env node

/**
 * Setup Cron Jobs for NSU Commute PWA
 * This script sets up automated scheduling using Supabase's pg_cron extension
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function setupCronJobs() {
  console.log('⏰ Setting up Cron Jobs for NSU Commute PWA')
  console.log('=' .repeat(50))
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables')
    console.error('   SUPABASE_URL:', !!SUPABASE_URL)
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY)
    process.exit(1)
  }
  
  // Create Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  
  try {
    console.log('\n🔧 Setting up cron jobs...')
    
    // Note: pg_cron jobs need to be set up directly in the database
    // This script will create the necessary SQL commands
    
    const cronJobs = [
      {
        name: 'daily-matching-morning',
        schedule: '0 0 * * *', // 6 AM Bangladesh Time (0 UTC)
        description: 'Daily matching at 6:00 AM Bangladesh Time'
      },
      {
        name: 'daily-matching-evening', 
        schedule: '0 12 * * *', // 6 PM Bangladesh Time (12 UTC)
        description: 'Daily matching at 6:00 PM Bangladesh Time'
      },
      {
        name: 'scheduled-opt-ins',
        schedule: '0 18 * * *', // 12 AM Bangladesh Time (18 UTC)
        description: 'Process scheduled opt-ins at midnight Bangladesh Time'
      },
      {
        name: 'cleanup-expired-data',
        schedule: '0 20 * * *', // 2 AM Bangladesh Time (20 UTC)
        description: 'Cleanup expired data at 2:00 AM Bangladesh Time'
      },
      {
        name: 'retry-failed-matches',
        schedule: '0 */4 * * *', // Every 4 hours
        description: 'Retry failed matches every 4 hours'
      }
    ]
    
    console.log('\n📋 Cron Jobs to be configured:')
    cronJobs.forEach(job => {
      console.log(`   • ${job.name}: ${job.schedule} - ${job.description}`)
    })
    
    console.log('\n⚠️  MANUAL SETUP REQUIRED:')
    console.log('Due to security restrictions, cron jobs must be set up manually in the Supabase Dashboard.')
    console.log('\n📝 Steps to complete setup:')
    console.log('1. Go to Supabase Dashboard > SQL Editor')
    console.log('2. Run the following SQL commands:')
    console.log('\n' + '='.repeat(80))
    
    // Generate SQL commands
    const sqlCommands = `
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing jobs if they exist
SELECT cron.unschedule('daily-matching-morning');
SELECT cron.unschedule('daily-matching-evening');
SELECT cron.unschedule('scheduled-opt-ins');
SELECT cron.unschedule('cleanup-expired-data');
SELECT cron.unschedule('retry-failed-matches');

-- Daily matching at 6:00 AM Bangladesh Time (0:00 UTC)
SELECT cron.schedule(
    'daily-matching-morning',
    '0 0 * * *',
    'SELECT net.http_post(
        url := ''${SUPABASE_URL}/functions/v1/daily-matching'',
        headers := ''{"Content-Type": "application/json", "Authorization": "Bearer ${SUPABASE_SERVICE_ROLE_KEY}"}'',
        body := ''{"date": "'' || CURRENT_DATE::text || ''", "dryRun": false, "source": "cron-morning"}''
    );'
);

-- Daily matching at 6:00 PM Bangladesh Time (12:00 UTC)
SELECT cron.schedule(
    'daily-matching-evening',
    '0 12 * * *',
    'SELECT net.http_post(
        url := ''${SUPABASE_URL}/functions/v1/daily-matching'',
        headers := ''{"Content-Type": "application/json", "Authorization": "Bearer ${SUPABASE_SERVICE_ROLE_KEY}"}'',
        body := ''{"date": "'' || CURRENT_DATE::text || ''", "dryRun": false, "source": "cron-evening"}''
    );'
);

-- Process scheduled opt-ins at midnight Bangladesh Time (18:00 UTC)
SELECT cron.schedule(
    'scheduled-opt-ins',
    '0 18 * * *',
    'SELECT net.http_post(
        url := ''${SUPABASE_URL}/functions/v1/scheduled-opt-ins'',
        headers := ''{"Content-Type": "application/json", "Authorization": "Bearer ${SUPABASE_SERVICE_ROLE_KEY}"}'',
        body := ''{"dryRun": false, "source": "cron-scheduled"}''
    );'
);

-- Cleanup expired data at 2:00 AM Bangladesh Time (20:00 UTC)
SELECT cron.schedule(
    'cleanup-expired-data',
    '0 20 * * *',
    'SELECT net.http_post(
        url := ''${SUPABASE_URL}/functions/v1/cleanup-expired-data'',
        headers := ''{"Content-Type": "application/json", "Authorization": "Bearer ${SUPABASE_SERVICE_ROLE_KEY}"}'',
        body := ''{"dryRun": false, "source": "cron-cleanup"}''
    );'
);

-- Retry failed matches every 4 hours
SELECT cron.schedule(
    'retry-failed-matches',
    '0 */4 * * *',
    'SELECT net.http_post(
        url := ''${SUPABASE_URL}/functions/v1/retry-failed-matches'',
        headers := ''{"Content-Type": "application/json", "Authorization": "Bearer ${SUPABASE_SERVICE_ROLE_KEY}"}'',
        body := ''{"dryRun": false, "source": "cron-retry"}''
    );'
);

-- View all scheduled jobs
SELECT jobname, schedule, active FROM cron.job 
WHERE jobname LIKE '%matching%' OR jobname LIKE '%opt-ins%' OR jobname LIKE '%cleanup%' OR jobname LIKE '%retry%'
ORDER BY jobname;
`
    
    console.log(sqlCommands)
    console.log('='.repeat(80))
    
    console.log('\n3. After running the SQL, verify the jobs are scheduled:')
    console.log('   SELECT jobname, schedule, active FROM cron.job;')
    
    console.log('\n✅ Cron job setup instructions generated successfully!')
    console.log('\n📊 Expected Schedule:')
    console.log('   • Morning matching: 6:00 AM Bangladesh Time (daily)')
    console.log('   • Evening matching: 6:00 PM Bangladesh Time (daily)')
    console.log('   • Scheduled opt-ins: 12:00 AM Bangladesh Time (daily)')
    console.log('   • Data cleanup: 2:00 AM Bangladesh Time (daily)')
    console.log('   • Retry failed matches: Every 4 hours')
    
  } catch (error) {
    console.error('❌ Error setting up cron jobs:', error.message)
    process.exit(1)
  }
}

// Run the setup
setupCronJobs()
