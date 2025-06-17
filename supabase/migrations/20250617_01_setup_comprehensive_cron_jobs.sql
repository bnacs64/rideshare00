-- Comprehensive cron job setup for NSU Commute automation

-- Enable the pg_cron extension if not already enabled
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  RAISE NOTICE 'pg_cron extension enabled successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not enable pg_cron extension: %', SQLERRM;
    RAISE NOTICE 'Cron jobs will not be available. This is normal for some hosting environments.';
END $$;

-- Grant necessary permissions for cron jobs (if extension is available)
DO $$
BEGIN
  GRANT USAGE ON SCHEMA cron TO postgres;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not grant cron permissions: %', SQLERRM;
END $$;

-- Add retry_count and last_retry_at columns to daily_opt_ins if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_opt_ins' AND column_name = 'retry_count') THEN
    ALTER TABLE daily_opt_ins ADD COLUMN retry_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_opt_ins' AND column_name = 'last_retry_at') THEN
    ALTER TABLE daily_opt_ins ADD COLUMN last_retry_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Function to call Edge Functions safely
CREATE OR REPLACE FUNCTION call_edge_function(
  function_name text,
  request_body jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  response_status int;
  response_body text;
BEGIN
  -- Call the Edge Function
  SELECT status, content INTO response_status, response_body
  FROM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := request_body
  );

  -- Parse the response
  IF response_status = 200 THEN
    result := response_body::jsonb;
  ELSE
    result := jsonb_build_object(
      'success', false,
      'error', 'HTTP request failed',
      'status', response_status,
      'body', response_body
    );
  END IF;

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Function call failed',
      'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Function to create scheduled opt-ins for the next business day
CREATE OR REPLACE FUNCTION daily_create_scheduled_opt_ins()
RETURNS void AS $$
BEGIN
  PERFORM call_edge_function('scheduled-opt-ins', jsonb_build_object('dryRun', false));
END;
$$ LANGUAGE plpgsql;

-- Function to run daily matching
CREATE OR REPLACE FUNCTION daily_run_matching()
RETURNS void AS $$
BEGIN
  PERFORM call_edge_function('daily-matching', jsonb_build_object(
    'date', CURRENT_DATE::text,
    'dryRun', false
  ));
END;
$$ LANGUAGE plpgsql;

-- Function to retry failed matches
CREATE OR REPLACE FUNCTION daily_retry_failed_matches()
RETURNS void AS $$
BEGIN
  PERFORM call_edge_function('retry-failed-matches', jsonb_build_object(
    'date', CURRENT_DATE::text,
    'dryRun', false,
    'maxRetries', 3
  ));
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired data
CREATE OR REPLACE FUNCTION weekly_cleanup_expired_data()
RETURNS void AS $$
BEGIN
  PERFORM call_edge_function('cleanup-expired-data', jsonb_build_object(
    'dryRun', false,
    'daysToKeep', 30
  ));
END;
$$ LANGUAGE plpgsql;

-- Function to send pickup reminders
CREATE OR REPLACE FUNCTION send_pickup_reminders()
RETURNS void AS $$
DECLARE
  ride_record RECORD;
BEGIN
  -- Find confirmed rides for tomorrow that need reminders
  FOR ride_record IN
    SELECT 
      mr.id,
      mr.commute_date,
      COUNT(rp.user_id) as participant_count
    FROM matched_rides mr
    JOIN ride_participants rp ON mr.id = rp.matched_ride_id
    WHERE mr.status = 'CONFIRMED'
      AND mr.commute_date = CURRENT_DATE + INTERVAL '1 day'
    GROUP BY mr.id, mr.commute_date
    HAVING COUNT(rp.user_id) > 0
  LOOP
    -- Send pickup reminder notifications
    PERFORM call_edge_function('send-notifications', jsonb_build_object(
      'ride_id', ride_record.id,
      'type', 'REMINDER'
    ));
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Remove existing cron jobs to avoid duplicates (safe unschedule)
DO $$
BEGIN
  -- Safely unschedule existing jobs if they exist
  PERFORM cron.unschedule('create-scheduled-opt-ins') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'create-scheduled-opt-ins');
  PERFORM cron.unschedule('create-scheduled-opt-ins-backup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'create-scheduled-opt-ins-backup');
  PERFORM cron.unschedule('daily-matching') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-matching');
  PERFORM cron.unschedule('retry-failed-matches') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retry-failed-matches');
  PERFORM cron.unschedule('retry-failed-matches-morning') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retry-failed-matches-morning');
  PERFORM cron.unschedule('retry-failed-matches-afternoon') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retry-failed-matches-afternoon');
  PERFORM cron.unschedule('send-pickup-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-pickup-reminders');
  PERFORM cron.unschedule('weekly-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-cleanup');
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if cron extension is not available or jobs don't exist
    RAISE NOTICE 'Note: Some cron jobs could not be unscheduled (this is normal for first-time setup)';
END $$;

-- Schedule cron jobs with error handling
DO $$
BEGIN
  -- Schedule: Create scheduled opt-ins every day at 6 AM (Bangladesh time)
  PERFORM cron.schedule(
    'create-scheduled-opt-ins',
    '0 6 * * *', -- Every day at 6 AM
    'SELECT daily_create_scheduled_opt_ins();'
  );

  -- Schedule: Run daily matching at 7 AM (after opt-ins are created)
  PERFORM cron.schedule(
    'daily-matching',
    '0 7 * * *', -- Every day at 7 AM
    'SELECT daily_run_matching();'
  );

  -- Schedule: Retry failed matches at 9 AM and 3 PM
  PERFORM cron.schedule(
    'retry-failed-matches-morning',
    '0 9 * * *', -- Every day at 9 AM
    'SELECT daily_retry_failed_matches();'
  );

  PERFORM cron.schedule(
    'retry-failed-matches-afternoon',
    '0 15 * * *', -- Every day at 3 PM
    'SELECT daily_retry_failed_matches();'
  );

  -- Schedule: Send pickup reminders at 7:30 AM (30 minutes before typical 8 AM pickup)
  PERFORM cron.schedule(
    'send-pickup-reminders',
    '30 7 * * *', -- Every day at 7:30 AM
    'SELECT send_pickup_reminders();'
  );

  -- Schedule: Weekly cleanup on Sundays at 2 AM
  PERFORM cron.schedule(
    'weekly-cleanup',
    '0 2 * * 0', -- Every Sunday at 2 AM
    'SELECT weekly_cleanup_expired_data();'
  );

  RAISE NOTICE 'All cron jobs scheduled successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error scheduling cron jobs: %', SQLERRM;
    RAISE NOTICE 'This is normal if pg_cron extension is not available in your environment';
END $$;

-- Create a view to monitor cron job status
CREATE OR REPLACE VIEW cron_job_status AS
SELECT 
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobid
FROM cron.job
WHERE database = current_database()
ORDER BY jobname;

-- Create a function to manually trigger any scheduled function
CREATE OR REPLACE FUNCTION manual_trigger_scheduled_function(
  function_type text,
  parameters jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb AS $$
BEGIN
  CASE function_type
    WHEN 'scheduled-opt-ins' THEN
      RETURN call_edge_function('scheduled-opt-ins', parameters);
    WHEN 'daily-matching' THEN
      RETURN call_edge_function('daily-matching', parameters);
    WHEN 'retry-failed-matches' THEN
      RETURN call_edge_function('retry-failed-matches', parameters);
    WHEN 'cleanup-expired-data' THEN
      RETURN call_edge_function('cleanup-expired-data', parameters);
    WHEN 'send-notifications' THEN
      RETURN call_edge_function('send-notifications', parameters);
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Unknown function type',
        'available_types', ARRAY['scheduled-opt-ins', 'daily-matching', 'retry-failed-matches', 'cleanup-expired-data', 'send-notifications']
      );
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create a view to monitor system health
CREATE OR REPLACE VIEW system_health_status AS
SELECT
  'Daily Opt-ins' as component,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'PENDING_MATCH') as pending_count,
  COUNT(*) FILTER (WHERE status = 'MATCHED') as matched_count,
  COUNT(*) FILTER (WHERE status = 'CANCELLED') as failed_count,
  COUNT(*) FILTER (WHERE retry_count > 0) as retried_count
FROM daily_opt_ins
WHERE commute_date >= CURRENT_DATE - INTERVAL '7 days'

UNION ALL

SELECT 
  'Matched Rides' as component,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'PENDING_CONFIRMATION') as pending_count,
  COUNT(*) FILTER (WHERE status = 'CONFIRMED') as matched_count,
  COUNT(*) FILTER (WHERE status = 'CANCELLED') as failed_count,
  0 as retried_count
FROM matched_rides
WHERE commute_date >= CURRENT_DATE - INTERVAL '7 days'

UNION ALL

SELECT 
  'Scheduled Opt-ins' as component,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE is_active = true) as pending_count,
  0 as matched_count,
  COUNT(*) FILTER (WHERE is_active = false) as failed_count,
  0 as retried_count
FROM scheduled_opt_ins;

-- Grant permissions
GRANT SELECT ON cron_job_status TO authenticated;
GRANT SELECT ON system_health_status TO authenticated;
GRANT EXECUTE ON FUNCTION manual_trigger_scheduled_function(text, jsonb) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION daily_create_scheduled_opt_ins() IS 'Creates daily opt-ins from scheduled opt-ins for the next business day';
COMMENT ON FUNCTION daily_run_matching() IS 'Runs AI matching for all pending opt-ins for the current date';
COMMENT ON FUNCTION daily_retry_failed_matches() IS 'Retries matching for failed opt-ins with exponential backoff';
COMMENT ON FUNCTION weekly_cleanup_expired_data() IS 'Cleans up old and expired data to maintain database performance';
COMMENT ON FUNCTION send_pickup_reminders() IS 'Sends pickup reminder notifications for confirmed rides';
COMMENT ON FUNCTION manual_trigger_scheduled_function(text, jsonb) IS 'Manually trigger any scheduled function for testing';
COMMENT ON VIEW cron_job_status IS 'Monitor the status of all scheduled cron jobs';
COMMENT ON VIEW system_health_status IS 'Monitor the overall health of the ride-sharing system';

-- Log the setup completion
DO $$
BEGIN
  RAISE NOTICE 'Comprehensive cron job system has been set up successfully';
  RAISE NOTICE 'Scheduled functions:';
  RAISE NOTICE '  - Create scheduled opt-ins: Daily at 6 AM';
  RAISE NOTICE '  - Run daily matching: Daily at 7 AM';
  RAISE NOTICE '  - Retry failed matches: Daily at 9 AM and 3 PM';
  RAISE NOTICE '  - Send pickup reminders: Daily at 7:30 AM';
  RAISE NOTICE '  - Weekly cleanup: Sundays at 2 AM';
  RAISE NOTICE 'Use SELECT * FROM cron_job_status to monitor jobs';
  RAISE NOTICE 'Use SELECT * FROM system_health_status to check system health';
  RAISE NOTICE 'Use SELECT manual_trigger_scheduled_function(type, params) to test manually';
END $$;
