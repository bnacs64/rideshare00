-- Setup notification triggers for real-time ride notifications

-- Create a function to send notifications via Edge Function
CREATE OR REPLACE FUNCTION send_ride_notification(
  ride_id uuid,
  notification_type text,
  cancellation_reason text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Call the send-notifications Edge Function
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'ride_id', ride_id,
      'type', notification_type,
      'cancellation_reason', cancellation_reason
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Function to handle matched ride status changes
CREATE OR REPLACE FUNCTION handle_matched_ride_status_change()
RETURNS trigger AS $$
BEGIN
  -- Only process status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'CONFIRMED' THEN
        -- Send confirmation notifications
        PERFORM send_ride_notification(NEW.id, 'CONFIRMATION');
      WHEN 'CANCELLED' THEN
        -- Send cancellation notifications
        PERFORM send_ride_notification(NEW.id, 'CANCELLATION', 'Ride was cancelled');
      ELSE
        -- No notification needed for other status changes
        NULL;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new matched rides (send match notifications)
CREATE OR REPLACE FUNCTION handle_new_matched_ride()
RETURNS trigger AS $$
BEGIN
  -- Send match notification for new rides
  IF NEW.status = 'PENDING_CONFIRMATION' THEN
    PERFORM send_ride_notification(NEW.id, 'MATCH');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to schedule pickup reminders
CREATE OR REPLACE FUNCTION schedule_pickup_reminders()
RETURNS void AS $$
DECLARE
  ride_record RECORD;
  reminder_time timestamp;
BEGIN
  -- Find rides that need pickup reminders (15 minutes before pickup time)
  -- This is a simplified version - in practice, you'd calculate actual pickup times
  FOR ride_record IN
    SELECT id, commute_date
    FROM matched_rides
    WHERE status = 'CONFIRMED'
      AND commute_date = CURRENT_DATE + INTERVAL '1 day'
      -- Add more specific time conditions based on your pickup time calculation
  LOOP
    -- Send pickup reminder
    PERFORM send_ride_notification(ride_record.id, 'REMINDER');
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for matched rides
DROP TRIGGER IF EXISTS trigger_matched_ride_status_change ON matched_rides;
CREATE TRIGGER trigger_matched_ride_status_change
  AFTER UPDATE ON matched_rides
  FOR EACH ROW
  EXECUTE FUNCTION handle_matched_ride_status_change();

DROP TRIGGER IF EXISTS trigger_new_matched_ride ON matched_rides;
CREATE TRIGGER trigger_new_matched_ride
  AFTER INSERT ON matched_rides
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_matched_ride();

-- Schedule pickup reminders to run daily at 7:30 AM (30 minutes before typical 8 AM pickup)
-- Note: This will be handled by the comprehensive cron jobs migration
DO $$
BEGIN
  -- Only schedule if cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'send-pickup-reminders',
      '30 7 * * *', -- Every day at 7:30 AM
      'SELECT schedule_pickup_reminders();'
    );
    RAISE NOTICE 'Pickup reminders scheduled successfully';
  ELSE
    RAISE NOTICE 'pg_cron extension not available, skipping pickup reminder scheduling';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule pickup reminders: %', SQLERRM;
END $$;

-- Create a function to manually trigger notifications (for testing)
CREATE OR REPLACE FUNCTION manual_send_notification(
  ride_id uuid,
  notification_type text,
  cancellation_reason text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  response_status int;
  response_body text;
BEGIN
  -- Call the Edge Function directly
  SELECT status, content INTO response_status, response_body
  FROM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'ride_id', ride_id,
      'type', notification_type,
      'cancellation_reason', cancellation_reason
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

-- Create a view to monitor notification activity
CREATE OR REPLACE VIEW notification_activity AS
SELECT 
  mr.id as ride_id,
  mr.commute_date,
  mr.status as ride_status,
  mr.created_at as ride_created,
  mr.updated_at as ride_updated,
  COUNT(rp.user_id) as participant_count,
  COUNT(rp.user_id) FILTER (WHERE u.telegram_user_id IS NOT NULL) as telegram_enabled_count,
  array_agg(u.full_name ORDER BY u.full_name) as participants,
  array_agg(u.telegram_user_id ORDER BY u.full_name) FILTER (WHERE u.telegram_user_id IS NOT NULL) as telegram_ids
FROM matched_rides mr
LEFT JOIN ride_participants rp ON mr.id = rp.matched_ride_id
LEFT JOIN users u ON rp.user_id = u.id
WHERE mr.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY mr.id, mr.commute_date, mr.status, mr.created_at, mr.updated_at
ORDER BY mr.created_at DESC;

-- Grant permissions
GRANT SELECT ON notification_activity TO authenticated;
GRANT EXECUTE ON FUNCTION manual_send_notification(uuid, text, text) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION send_ride_notification(uuid, text, text) IS 'Sends ride notifications via Telegram using Edge Function';
COMMENT ON FUNCTION handle_matched_ride_status_change() IS 'Trigger function for matched ride status changes';
COMMENT ON FUNCTION handle_new_matched_ride() IS 'Trigger function for new matched rides';
COMMENT ON FUNCTION schedule_pickup_reminders() IS 'Scheduled function to send pickup reminders';
COMMENT ON FUNCTION manual_send_notification(uuid, text, text) IS 'Manually trigger notifications for testing';
COMMENT ON VIEW notification_activity IS 'Monitor recent notification activity and Telegram integration status';

-- Log the setup completion
DO $$
BEGIN
  RAISE NOTICE 'Notification triggers and functions have been set up successfully';
  RAISE NOTICE 'Real-time notifications will be sent for ride status changes';
  RAISE NOTICE 'Pickup reminders scheduled for daily execution at 7:30 AM';
  RAISE NOTICE 'Use SELECT manual_send_notification(ride_id, type) to test manually';
  RAISE NOTICE 'Use SELECT * FROM notification_activity to monitor activity';
END $$;
