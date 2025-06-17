-- Complete NSU Commute System Migration
-- This migration adds all the necessary features for the matching system

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Add missing columns to matched_rides table
DO $$
BEGIN
  -- Rename columns if they exist with old names
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matched_rides' AND column_name = 'driver_id') THEN
    ALTER TABLE matched_rides RENAME COLUMN driver_id TO driver_user_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matched_rides' AND column_name = 'ride_date') THEN
    ALTER TABLE matched_rides RENAME COLUMN ride_date TO commute_date;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matched_rides' AND column_name = 'uber_api_route_data') THEN
    ALTER TABLE matched_rides RENAME COLUMN uber_api_route_data TO route_optimization_data;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matched_rides' AND column_name = 'cost_per_rider') THEN
    ALTER TABLE matched_rides RENAME COLUMN cost_per_rider TO estimated_cost_per_person;
  END IF;
  
  -- Add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matched_rides' AND column_name = 'estimated_total_time') THEN
    ALTER TABLE matched_rides ADD COLUMN estimated_total_time INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matched_rides' AND column_name = 'pickup_order') THEN
    ALTER TABLE matched_rides ADD COLUMN pickup_order JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matched_rides' AND column_name = 'ai_confidence_score') THEN
    ALTER TABLE matched_rides ADD COLUMN ai_confidence_score DECIMAL(3,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matched_rides' AND column_name = 'ai_reasoning') THEN
    ALTER TABLE matched_rides ADD COLUMN ai_reasoning TEXT;
  END IF;
END $$;

-- Update ride_participants table
DO $$
BEGIN
  -- Rename ride_id to matched_ride_id if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ride_participants' AND column_name = 'ride_id') THEN
    ALTER TABLE ride_participants RENAME COLUMN ride_id TO matched_ride_id;
  END IF;
  
  -- Add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ride_participants' AND column_name = 'daily_opt_in_id') THEN
    ALTER TABLE ride_participants ADD COLUMN daily_opt_in_id UUID REFERENCES daily_opt_ins(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ride_participants' AND column_name = 'pickup_location_id') THEN
    ALTER TABLE ride_participants ADD COLUMN pickup_location_id UUID REFERENCES pickup_locations(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ride_participants' AND column_name = 'confirmation_deadline') THEN
    ALTER TABLE ride_participants ADD COLUMN confirmation_deadline TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create matching_schedules table
CREATE TABLE IF NOT EXISTS matching_schedules (
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

-- Create matching_jobs table
CREATE TABLE IF NOT EXISTS matching_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES matching_schedules(id),
    job_type TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    results JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_matching_schedules_active ON matching_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_matching_schedules_next_run ON matching_schedules(next_run);
CREATE INDEX IF NOT EXISTS idx_matching_jobs_schedule_id ON matching_jobs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_matching_jobs_status ON matching_jobs(status);
CREATE INDEX IF NOT EXISTS idx_matching_jobs_created_at ON matching_jobs(created_at);

-- Update constraints
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'ride_participants_ride_id_user_id_key') THEN
    ALTER TABLE ride_participants DROP CONSTRAINT ride_participants_ride_id_user_id_key;
  END IF;
  
  -- Add new constraint if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'ride_participants_matched_ride_id_user_id_key') THEN
    ALTER TABLE ride_participants ADD CONSTRAINT ride_participants_matched_ride_id_user_id_key 
        UNIQUE(matched_ride_id, user_id);
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE matching_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for matching_schedules
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matching_schedules' AND policyname = 'Users can view active schedules') THEN
    CREATE POLICY "Users can view active schedules" ON matching_schedules FOR SELECT
        USING (is_active = true);
  END IF;
END $$;

-- RLS policies for matching_jobs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matching_jobs' AND policyname = 'Users can view job history') THEN
    CREATE POLICY "Users can view job history" ON matching_jobs FOR SELECT
        USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matching_jobs' AND policyname = 'Users can create manual matching jobs') THEN
    CREATE POLICY "Users can create manual matching jobs" ON matching_jobs FOR INSERT 
        WITH CHECK (auth.uid() IS NOT NULL AND schedule_id IS NULL);
  END IF;
END $$;

-- Update RLS policies for matched_rides to use correct column names
DO $$
BEGIN
  -- Drop old policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matched_rides' AND policyname = 'Users can view rides they''re involved in') THEN
    DROP POLICY "Users can view rides they're involved in" ON matched_rides;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matched_rides' AND policyname = 'Drivers can update their rides') THEN
    DROP POLICY "Drivers can update their rides" ON matched_rides;
  END IF;
END $$;

-- Create new policies with correct column names
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matched_rides' AND policyname = 'Users can view rides they''re involved in') THEN
    CREATE POLICY "Users can view rides they're involved in" ON matched_rides FOR SELECT USING (
        auth.uid() = driver_user_id OR 
        auth.uid() IN (SELECT user_id FROM ride_participants WHERE matched_ride_id = matched_rides.id)
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matched_rides' AND policyname = 'Drivers can update their rides') THEN
    CREATE POLICY "Drivers can update their rides" ON matched_rides FOR UPDATE USING (auth.uid() = driver_user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matched_rides' AND policyname = 'System can create matched rides') THEN
    CREATE POLICY "System can create matched rides" ON matched_rides FOR INSERT WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ride_participants' AND policyname = 'System can create ride participants') THEN
    CREATE POLICY "System can create ride participants" ON ride_participants FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Grant permissions
GRANT ALL ON matching_schedules TO authenticated;
GRANT ALL ON matching_jobs TO authenticated;

-- Add triggers for updated_at
CREATE TRIGGER update_matching_schedules_updated_at 
    BEFORE UPDATE ON matching_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matching_jobs_updated_at 
    BEFORE UPDATE ON matching_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
