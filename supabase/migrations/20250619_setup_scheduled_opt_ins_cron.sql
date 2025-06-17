-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions for cron jobs
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create a function to call the scheduled opt-ins Edge Function
CREATE OR REPLACE FUNCTION trigger_scheduled_opt_ins()
RETURNS void AS $$
BEGIN
  -- Call the Edge Function to process scheduled opt-ins
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/scheduled-opt-ins',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'dryRun', false
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Schedule the function to run every day at 6 AM (Bangladesh time)
-- This will create daily opt-ins for the next business day
SELECT cron.schedule(
  'create-scheduled-opt-ins',
  '0 6 * * *', -- Every day at 6 AM
  'SELECT trigger_scheduled_opt_ins();'
);

-- Also schedule a backup run at 8 PM for any missed opt-ins
SELECT cron.schedule(
  'create-scheduled-opt-ins-backup',
  '0 20 * * *', -- Every day at 8 PM
  'SELECT trigger_scheduled_opt_ins();'
);

-- Create a function to manually trigger scheduled opt-ins (for testing)
CREATE OR REPLACE FUNCTION manual_trigger_scheduled_opt_ins(target_date text DEFAULT NULL, dry_run boolean DEFAULT false)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  response_status int;
  response_body text;
BEGIN
  -- Call the Edge Function with optional parameters
  SELECT status, content INTO response_status, response_body
  FROM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/scheduled-opt-ins',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'date', COALESCE(target_date, (CURRENT_DATE + INTERVAL '1 day')::text),
      'dryRun', dry_run
    )
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
END;
$$ LANGUAGE plpgsql;

-- Create a view to monitor scheduled opt-ins status
CREATE OR REPLACE VIEW scheduled_opt_ins_summary AS
SELECT 
  day_of_week,
  COUNT(*) as total_scheduled,
  COUNT(*) FILTER (WHERE is_active = true) as active_scheduled,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_scheduled,
  array_agg(DISTINCT u.full_name ORDER BY u.full_name) as users
FROM scheduled_opt_ins s
JOIN users u ON s.user_id = u.id
GROUP BY day_of_week
ORDER BY 
  CASE day_of_week
    WHEN 'MONDAY' THEN 1
    WHEN 'TUESDAY' THEN 2
    WHEN 'WEDNESDAY' THEN 3
    WHEN 'THURSDAY' THEN 4
    WHEN 'FRIDAY' THEN 5
    WHEN 'SATURDAY' THEN 6
    WHEN 'SUNDAY' THEN 7
  END;

-- Create a view to check recent automatic opt-in creation
CREATE OR REPLACE VIEW recent_automatic_opt_ins AS
SELECT 
  d.commute_date,
  COUNT(*) as total_created,
  COUNT(*) FILTER (WHERE d.status = 'PENDING_MATCH') as pending_match,
  COUNT(*) FILTER (WHERE d.status = 'MATCHED') as matched,
  COUNT(*) FILTER (WHERE d.status = 'CANCELLED') as cancelled,
  array_agg(DISTINCT u.full_name ORDER BY u.full_name) as users
FROM daily_opt_ins d
JOIN users u ON d.user_id = u.id
WHERE d.is_automatic = true
  AND d.commute_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY d.commute_date
ORDER BY d.commute_date DESC;

-- Grant permissions for the views
GRANT SELECT ON scheduled_opt_ins_summary TO authenticated;
GRANT SELECT ON recent_automatic_opt_ins TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION trigger_scheduled_opt_ins() IS 'Triggers the scheduled opt-ins Edge Function to create daily opt-ins from scheduled opt-ins';
COMMENT ON FUNCTION manual_trigger_scheduled_opt_ins(text, boolean) IS 'Manually trigger scheduled opt-ins creation for testing. Parameters: target_date (YYYY-MM-DD), dry_run (boolean)';
COMMENT ON VIEW scheduled_opt_ins_summary IS 'Summary of scheduled opt-ins by day of week';
COMMENT ON VIEW recent_automatic_opt_ins IS 'Summary of recently created automatic daily opt-ins';

-- Log the setup completion
DO $$
BEGIN
  RAISE NOTICE 'Scheduled opt-ins cron jobs have been set up successfully';
  RAISE NOTICE 'Daily execution at 6 AM and 8 PM Bangladesh time';
  RAISE NOTICE 'Use SELECT manual_trigger_scheduled_opt_ins() to test manually';
  RAISE NOTICE 'Use SELECT * FROM scheduled_opt_ins_summary to monitor status';
END $$;
