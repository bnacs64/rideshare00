-- Fix RLS policy for matching_jobs to allow manual job creation
-- This script adds the missing policy to allow authenticated users to create manual matching jobs

DO $$
BEGIN
  -- Allow authenticated users to create manual matching jobs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matching_jobs' AND policyname = 'Users can create manual matching jobs') THEN
    CREATE POLICY "Users can create manual matching jobs" ON matching_jobs FOR INSERT 
        WITH CHECK (auth.uid() IS NOT NULL AND schedule_id IS NULL);
    RAISE NOTICE 'Added policy: Users can create manual matching jobs';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can create manual matching jobs';
  END IF;
END $$;
