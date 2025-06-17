-- NSU Commute PWA - Production Cron Jobs Setup
-- This script sets up automated scheduling for the matching system

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable the http extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS http;

-- =============================================================================
-- CRON JOB CONFIGURATION
-- =============================================================================

-- Remove existing cron jobs if they exist
SELECT cron.unschedule('daily-matching-morning');
SELECT cron.unschedule('daily-matching-evening');
SELECT cron.unschedule('scheduled-opt-ins');
SELECT cron.unschedule('cleanup-expired-data');
SELECT cron.unschedule('retry-failed-matches');

-- =============================================================================
-- DAILY MATCHING JOBS
-- =============================================================================

-- Daily matching at 6:00 AM (Bangladesh Time - UTC+6, so 0:00 UTC)
SELECT cron.schedule(
    'daily-matching-morning',
    '0 0 * * *',
    $$
    SELECT net.http_post(
        url := 'https://fwshmucplaqqtpkzqbvb.supabase.co/functions/v1/daily-matching',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}',
        body := jsonb_build_object(
            'date', CURRENT_DATE::text,
            'dryRun', false,
            'source', 'cron-morning'
        )
    );
    $$
);

-- Daily matching at 6:00 PM (Bangladesh Time - UTC+6, so 12:00 UTC)
SELECT cron.schedule(
    'daily-matching-evening',
    '0 12 * * *',
    $$
    SELECT net.http_post(
        url := 'https://fwshmucplaqqtpkzqbvb.supabase.co/functions/v1/daily-matching',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}',
        body := jsonb_build_object(
            'date', CURRENT_DATE::text,
            'dryRun', false,
            'source', 'cron-evening'
        )
    );
    $$
);

-- =============================================================================
-- SCHEDULED OPT-INS JOB
-- =============================================================================

-- Process scheduled opt-ins daily at midnight (Bangladesh Time - UTC+6, so 18:00 UTC)
SELECT cron.schedule(
    'scheduled-opt-ins',
    '0 18 * * *',
    $$
    SELECT net.http_post(
        url := 'https://fwshmucplaqqtpkzqbvb.supabase.co/functions/v1/scheduled-opt-ins',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}',
        body := jsonb_build_object(
            'dryRun', false,
            'source', 'cron-scheduled'
        )
    );
    $$
);

-- =============================================================================
-- CLEANUP JOB
-- =============================================================================

-- Cleanup expired data daily at 2:00 AM (Bangladesh Time - UTC+6, so 20:00 UTC)
SELECT cron.schedule(
    'cleanup-expired-data',
    '0 20 * * *',
    $$
    SELECT net.http_post(
        url := 'https://fwshmucplaqqtpkzqbvb.supabase.co/functions/v1/cleanup-expired-data',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}',
        body := jsonb_build_object(
            'dryRun', false,
            'source', 'cron-cleanup'
        )
    );
    $$
);

-- =============================================================================
-- RETRY FAILED MATCHES JOB
-- =============================================================================

-- Retry failed matches every 4 hours
SELECT cron.schedule(
    'retry-failed-matches',
    '0 */4 * * *',
    $$
    SELECT net.http_post(
        url := 'https://fwshmucplaqqtpkzqbvb.supabase.co/functions/v1/retry-failed-matches',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}',
        body := jsonb_build_object(
            'dryRun', false,
            'source', 'cron-retry'
        )
    );
    $$
);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- View all scheduled cron jobs
SELECT 
    jobname,
    schedule,
    active,
    jobid
FROM cron.job 
WHERE jobname IN (
    'daily-matching-morning',
    'daily-matching-evening', 
    'scheduled-opt-ins',
    'cleanup-expired-data',
    'retry-failed-matches'
)
ORDER BY jobname;

-- =============================================================================
-- MONITORING QUERIES
-- =============================================================================

-- Check cron job run history (last 24 hours)
SELECT 
    j.jobname,
    r.start_time,
    r.end_time,
    r.return_message,
    r.status
FROM cron.job j
LEFT JOIN cron.job_run_details r ON j.jobid = r.jobid
WHERE j.jobname IN (
    'daily-matching-morning',
    'daily-matching-evening', 
    'scheduled-opt-ins',
    'cleanup-expired-data',
    'retry-failed-matches'
)
AND r.start_time > NOW() - INTERVAL '24 hours'
ORDER BY r.start_time DESC;

-- =============================================================================
-- NOTES
-- =============================================================================

/*
CRON SCHEDULE EXPLANATION:
- '0 0 * * *'   = Daily at 6:00 AM Bangladesh Time (00:00 UTC)
- '0 12 * * *'  = Daily at 6:00 PM Bangladesh Time (12:00 UTC)
- '0 18 * * *'  = Daily at 12:00 AM Bangladesh Time (18:00 UTC)
- '0 20 * * *'  = Daily at 2:00 AM Bangladesh Time (20:00 UTC)
- '0 */4 * * *' = Every 4 hours

TIMEZONE NOTES:
- Bangladesh is UTC+6
- All times are converted to UTC for cron scheduling
- Adjust times based on your target timezone

MONITORING:
- Check cron.job table for scheduled jobs
- Check cron.job_run_details for execution history
- Monitor Edge Function logs in Supabase Dashboard

TROUBLESHOOTING:
- If jobs fail, check the service_role_key setting
- Verify Edge Functions are deployed and accessible
- Check network connectivity from database to functions
*/
