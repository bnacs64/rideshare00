-- Add Matching System Tables and Fix Schema Inconsistencies
-- This migration adds the missing tables for the AI matching system and fixes schema issues

-- First, let's add the missing status types
DO $$
BEGIN
    -- Add PENDING_CONFIRMATION to ride_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PENDING_CONFIRMATION' AND enumtypid = 'ride_status'::regtype) THEN
        ALTER TYPE ride_status ADD VALUE 'PENDING_CONFIRMATION';
    END IF;
END $$;

-- Create job_status type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
        CREATE TYPE job_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
    END IF;
END $$;

-- Create participant_status_new type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'participant_status_new') THEN
        CREATE TYPE participant_status_new AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'NO_RESPONSE');
    END IF;
END $$;

-- Update matched_rides table to match the code expectations
ALTER TABLE matched_rides 
  RENAME COLUMN driver_id TO driver_user_id;

ALTER TABLE matched_rides 
  RENAME COLUMN ride_date TO commute_date;

ALTER TABLE matched_rides 
  RENAME COLUMN uber_api_route_data TO route_optimization_data;

ALTER TABLE matched_rides 
  RENAME COLUMN cost_per_rider TO estimated_cost_per_person;

-- Add missing columns to matched_rides
ALTER TABLE matched_rides 
  ADD COLUMN IF NOT EXISTS estimated_total_time INTEGER,
  ADD COLUMN IF NOT EXISTS pickup_order TEXT[],
  ADD COLUMN IF NOT EXISTS ai_confidence_score INTEGER,
  ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;

-- Update ride_participants table to match code expectations
ALTER TABLE ride_participants 
  RENAME COLUMN ride_id TO matched_ride_id;

-- Add missing columns to ride_participants
ALTER TABLE ride_participants 
  ADD COLUMN IF NOT EXISTS daily_opt_in_id UUID REFERENCES daily_opt_ins(id),
  ADD COLUMN IF NOT EXISTS pickup_location_id UUID REFERENCES pickup_locations(id),
  ADD COLUMN IF NOT EXISTS confirmation_deadline TIMESTAMP WITH TIME ZONE;

-- Drop the old constraint and add new one
ALTER TABLE ride_participants 
  DROP CONSTRAINT IF EXISTS ride_participants_ride_id_user_id_key;

ALTER TABLE ride_participants 
  ADD CONSTRAINT ride_participants_matched_ride_id_user_id_key UNIQUE(matched_ride_id, user_id);

-- Create matching_schedules table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'matching_schedules') THEN
        CREATE TABLE matching_schedules (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            cron_expression TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            last_run TIMESTAMP WITH TIME ZONE,
            next_run TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- Create matching_jobs table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'matching_jobs') THEN
        CREATE TABLE matching_jobs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            schedule_id UUID REFERENCES matching_schedules(id) ON DELETE SET NULL,
            job_type TEXT NOT NULL,
            status job_status DEFAULT 'PENDING',
            started_at TIMESTAMP WITH TIME ZONE,
            completed_at TIMESTAMP WITH TIME ZONE,
            results JSONB,
            error_message TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- Add indexes for the new tables
CREATE INDEX IF NOT EXISTS idx_matching_schedules_active ON matching_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_matching_schedules_next_run ON matching_schedules(next_run) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_matching_jobs_schedule_id ON matching_jobs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_matching_jobs_status ON matching_jobs(status);
CREATE INDEX IF NOT EXISTS idx_matching_jobs_created_at ON matching_jobs(created_at);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_matching_schedules_updated_at 
    BEFORE UPDATE ON matching_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matching_jobs_updated_at 
    BEFORE UPDATE ON matching_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE matching_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for matching_schedules (admin only for now)
CREATE POLICY "Admin can manage matching schedules" ON matching_schedules FOR ALL 
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view active schedules" ON matching_schedules FOR SELECT 
    USING (is_active = true);

-- RLS policies for matching_jobs (admin only for now)
CREATE POLICY "Admin can manage matching jobs" ON matching_jobs FOR ALL 
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view job history" ON matching_jobs FOR SELECT 
    USING (true); -- Allow all authenticated users to view job history

-- Update the ride_participants foreign key references
ALTER TABLE ride_participants 
    DROP CONSTRAINT IF EXISTS ride_participants_ride_id_fkey;

ALTER TABLE ride_participants 
    ADD CONSTRAINT ride_participants_matched_ride_id_fkey 
    FOREIGN KEY (matched_ride_id) REFERENCES matched_rides(id) ON DELETE CASCADE;

-- Fix the indexes that reference old column names
DROP INDEX IF EXISTS idx_matched_rides_driver_date;
DROP INDEX IF EXISTS idx_ride_participants_ride_id;

CREATE INDEX IF NOT EXISTS idx_matched_rides_driver_date ON matched_rides(driver_user_id, commute_date);
CREATE INDEX IF NOT EXISTS idx_ride_participants_matched_ride_id ON ride_participants(matched_ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_participants_daily_opt_in_id ON ride_participants(daily_opt_in_id);

-- Update RLS policies to use correct column names
DROP POLICY IF EXISTS "Users can view rides they're involved in" ON matched_rides;
DROP POLICY IF EXISTS "Drivers can update their rides" ON matched_rides;

CREATE POLICY "Users can view rides they're involved in" ON matched_rides FOR SELECT USING (
    auth.uid() = driver_user_id OR 
    auth.uid() IN (SELECT user_id FROM ride_participants WHERE matched_ride_id = matched_rides.id)
);

CREATE POLICY "Drivers can update their rides" ON matched_rides FOR UPDATE USING (auth.uid() = driver_user_id);

CREATE POLICY "System can create matched rides" ON matched_rides FOR INSERT WITH CHECK (true);

-- Allow system to create ride participants
CREATE POLICY "System can create ride participants" ON ride_participants FOR INSERT WITH CHECK (true);

-- Grant permissions for new tables
GRANT ALL ON matching_schedules TO authenticated;
GRANT ALL ON matching_jobs TO authenticated;

-- Insert default matching schedules
INSERT INTO matching_schedules (name, description, cron_expression, is_active) VALUES
    ('morning-matching', 'Run matching every morning at 6 AM for today and tomorrow', '0 6 * * *', true),
    ('evening-matching', 'Run matching every evening at 8 PM for tomorrow', '0 20 * * *', true),
    ('hourly-optimization', 'Optimize existing matches every hour during peak times', '0 6-22 * * *', false)
ON CONFLICT (name) DO NOTHING;

-- Comments for new tables
COMMENT ON TABLE matching_schedules IS 'Scheduled background matching jobs configuration';
COMMENT ON TABLE matching_jobs IS 'History and status of matching job executions';

-- Function to automatically trigger matching when opt-in is created
CREATE OR REPLACE FUNCTION trigger_auto_matching()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger for new opt-ins with PENDING_MATCH status
    IF NEW.status = 'PENDING_MATCH' THEN
        -- This would call the Edge Function in a real implementation
        -- For now, we'll just log it
        RAISE NOTICE 'Auto-matching triggered for opt-in %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-matching
DROP TRIGGER IF EXISTS auto_match_on_opt_in_created ON daily_opt_ins;
CREATE TRIGGER auto_match_on_opt_in_created
    AFTER INSERT ON daily_opt_ins
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_matching();

-- Function to clean up old matching jobs (keep last 1000 records)
CREATE OR REPLACE FUNCTION cleanup_old_matching_jobs()
RETURNS void AS $$
BEGIN
    DELETE FROM matching_jobs 
    WHERE id NOT IN (
        SELECT id FROM matching_jobs 
        ORDER BY created_at DESC 
        LIMIT 1000
    );
END;
$$ LANGUAGE plpgsql;

-- Create a function to get matching statistics
CREATE OR REPLACE FUNCTION get_matching_stats(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    total_jobs BIGINT,
    successful_jobs BIGINT,
    failed_jobs BIGINT,
    total_rides_created BIGINT,
    confirmed_rides BIGINT,
    cancelled_rides BIGINT,
    average_confidence NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM matching_jobs WHERE created_at >= NOW() - INTERVAL '1 day' * days_back) as total_jobs,
        (SELECT COUNT(*) FROM matching_jobs WHERE status = 'COMPLETED' AND created_at >= NOW() - INTERVAL '1 day' * days_back) as successful_jobs,
        (SELECT COUNT(*) FROM matching_jobs WHERE status = 'FAILED' AND created_at >= NOW() - INTERVAL '1 day' * days_back) as failed_jobs,
        (SELECT COUNT(*) FROM matched_rides WHERE created_at >= NOW() - INTERVAL '1 day' * days_back) as total_rides_created,
        (SELECT COUNT(*) FROM matched_rides WHERE status = 'CONFIRMED' AND created_at >= NOW() - INTERVAL '1 day' * days_back) as confirmed_rides,
        (SELECT COUNT(*) FROM matched_rides WHERE status = 'CANCELLED' AND created_at >= NOW() - INTERVAL '1 day' * days_back) as cancelled_rides,
        (SELECT AVG(ai_confidence_score) FROM matched_rides WHERE ai_confidence_score IS NOT NULL AND created_at >= NOW() - INTERVAL '1 day' * days_back) as average_confidence;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_matching_stats(INTEGER) TO authenticated;
