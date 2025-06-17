-- CLEAN BACKEND FINAL MIGRATION
-- This migration resolves all schema inconsistencies and provides clean API functions
-- Applied after all existing migrations to avoid conflicts

-- ============================================================================
-- 1. CLEAN UP CONFLICTING FUNCTIONS
-- ============================================================================

-- Drop any existing conflicting functions
DROP FUNCTION IF EXISTS create_complete_user_profile CASCADE;
DROP FUNCTION IF EXISTS update_user_profile CASCADE;
DROP FUNCTION IF EXISTS get_user_profile CASCADE;
DROP FUNCTION IF EXISTS get_complete_user_profile CASCADE;

-- ============================================================================
-- 2. STANDARDIZE SCHEMA (SAFE UPDATES)
-- ============================================================================

-- Add missing columns to matched_rides if they don't exist
DO $$
BEGIN
  -- Add estimated_total_time if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'matched_rides' AND column_name = 'estimated_total_time') THEN
    ALTER TABLE matched_rides ADD COLUMN estimated_total_time INTEGER;
  END IF;
  
  -- Add pickup_order if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'matched_rides' AND column_name = 'pickup_order') THEN
    ALTER TABLE matched_rides ADD COLUMN pickup_order JSONB;
  END IF;
  
  -- Add ai_confidence_score if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'matched_rides' AND column_name = 'ai_confidence_score') THEN
    ALTER TABLE matched_rides ADD COLUMN ai_confidence_score DECIMAL(3,2);
  END IF;
  
  -- Add ai_reasoning if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'matched_rides' AND column_name = 'ai_reasoning') THEN
    ALTER TABLE matched_rides ADD COLUMN ai_reasoning TEXT;
  END IF;
  
  -- Make route_optimization_data nullable for easier ride creation
  BEGIN
    ALTER TABLE matched_rides ALTER COLUMN route_optimization_data DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    -- Column might not exist or already nullable
    NULL;
  END;
END $$;

-- Add missing columns to ride_participants if they don't exist
DO $$
BEGIN
  -- Add daily_opt_in_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ride_participants' AND column_name = 'daily_opt_in_id') THEN
    ALTER TABLE ride_participants ADD COLUMN daily_opt_in_id UUID REFERENCES daily_opt_ins(id);
  END IF;
  
  -- Add pickup_location_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ride_participants' AND column_name = 'pickup_location_id') THEN
    ALTER TABLE ride_participants ADD COLUMN pickup_location_id UUID REFERENCES pickup_locations(id);
  END IF;
  
  -- Add confirmation_deadline if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ride_participants' AND column_name = 'confirmation_deadline') THEN
    ALTER TABLE ride_participants ADD COLUMN confirmation_deadline TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- ============================================================================
-- 3. CREATE CLEAN API FUNCTIONS
-- ============================================================================

-- Create complete user profile (standardized interface)
CREATE OR REPLACE FUNCTION api_create_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_default_role user_role,
    p_home_location_lng DOUBLE PRECISION,
    p_home_location_lat DOUBLE PRECISION,
    p_home_location_address TEXT DEFAULT NULL,
    p_driver_details JSONB DEFAULT NULL,
    p_telegram_user_id BIGINT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    data JSONB,
    error_message TEXT
) AS $$
DECLARE
    created_user users%ROWTYPE;
    created_pickup pickup_locations%ROWTYPE;
    home_point GEOMETRY;
BEGIN
    -- Input validation
    IF p_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, 'User ID is required';
        RETURN;
    END IF;
    
    IF p_email IS NULL OR trim(p_email) = '' THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, 'Email is required';
        RETURN;
    END IF;
    
    IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, 'Full name is required';
        RETURN;
    END IF;
    
    -- Create geometry point
    home_point := ST_SetSRID(ST_MakePoint(p_home_location_lng, p_home_location_lat), 4326);
    
    BEGIN
        -- Insert user profile
        INSERT INTO users (
            id,
            email,
            full_name,
            default_role,
            home_location_coords,
            home_location_address,
            driver_details,
            telegram_user_id
        ) VALUES (
            p_user_id,
            p_email,
            p_full_name,
            p_default_role,
            home_point,
            p_home_location_address,
            p_driver_details,
            p_telegram_user_id
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            default_role = EXCLUDED.default_role,
            home_location_coords = EXCLUDED.home_location_coords,
            home_location_address = EXCLUDED.home_location_address,
            driver_details = EXCLUDED.driver_details,
            telegram_user_id = EXCLUDED.telegram_user_id,
            updated_at = NOW()
        RETURNING * INTO created_user;
        
        -- Create default pickup location
        INSERT INTO pickup_locations (
            user_id,
            name,
            description,
            coords,
            is_default
        ) VALUES (
            p_user_id,
            'Home',
            COALESCE(p_home_location_address, 'My home location'),
            home_point,
            true
        )
        RETURNING * INTO created_pickup;
        
        -- Return success with standardized data format
        RETURN QUERY SELECT 
            TRUE,
            jsonb_build_object(
                'user', jsonb_build_object(
                    'id', created_user.id,
                    'email', created_user.email,
                    'full_name', created_user.full_name,
                    'default_role', created_user.default_role,
                    'home_location_coords', ARRAY[ST_X(created_user.home_location_coords), ST_Y(created_user.home_location_coords)], -- [lng, lat]
                    'home_location_address', created_user.home_location_address,
                    'driver_details', created_user.driver_details,
                    'telegram_user_id', created_user.telegram_user_id,
                    'created_at', created_user.created_at,
                    'updated_at', created_user.updated_at
                ),
                'pickup_location_id', COALESCE(created_pickup.id, NULL)
            ),
            NULL::TEXT;
            
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user profile with pickup locations
CREATE OR REPLACE FUNCTION api_get_user_profile(p_user_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    data JSONB,
    error_message TEXT
) AS $$
DECLARE
    user_record users%ROWTYPE;
    pickup_locations_json JSONB;
BEGIN
    -- Get user record
    SELECT * INTO user_record FROM users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, 'User not found';
        RETURN;
    END IF;
    
    -- Get pickup locations as JSON
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', pl.id,
                'name', pl.name,
                'description', pl.description,
                'coords', ARRAY[ST_Y(pl.coords), ST_X(pl.coords)], -- [lat, lng] for frontend display
                'is_default', pl.is_default,
                'created_at', pl.created_at,
                'updated_at', pl.updated_at
            )
        ),
        '[]'::jsonb
    ) INTO pickup_locations_json
    FROM pickup_locations pl
    WHERE pl.user_id = p_user_id;
    
    -- Return user with pickup locations
    RETURN QUERY SELECT 
        TRUE,
        jsonb_build_object(
            'profile', jsonb_build_object(
                'id', user_record.id,
                'email', user_record.email,
                'full_name', user_record.full_name,
                'default_role', user_record.default_role,
                'home_location_coords', ARRAY[ST_X(user_record.home_location_coords), ST_Y(user_record.home_location_coords)], -- [lng, lat]
                'home_location_address', user_record.home_location_address,
                'driver_details', user_record.driver_details,
                'telegram_user_id', user_record.telegram_user_id,
                'created_at', user_record.created_at,
                'updated_at', user_record.updated_at
            ),
            'pickup_locations', pickup_locations_json
        ),
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get profile completion status
CREATE OR REPLACE FUNCTION api_get_profile_status(p_user_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    data JSONB,
    error_message TEXT
) AS $$
DECLARE
    user_record users%ROWTYPE;
    missing_fields TEXT[] := '{}';
    pickup_count INTEGER := 0;
    has_default BOOLEAN := FALSE;
    is_complete BOOLEAN := TRUE;
BEGIN
    -- Get user record
    SELECT * INTO user_record FROM users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, 'User not found';
        RETURN;
    END IF;
    
    -- Check required fields
    IF user_record.full_name IS NULL OR trim(user_record.full_name) = '' THEN
        missing_fields := array_append(missing_fields, 'full_name');
        is_complete := FALSE;
    END IF;
    
    IF user_record.home_location_coords IS NULL THEN
        missing_fields := array_append(missing_fields, 'home_location');
        is_complete := FALSE;
    END IF;
    
    -- Check driver details if needed
    IF user_record.default_role = 'DRIVER' THEN
        IF user_record.driver_details IS NULL OR user_record.driver_details = '{}' THEN
            missing_fields := array_append(missing_fields, 'driver_details');
            is_complete := FALSE;
        END IF;
    END IF;
    
    -- Check pickup locations
    SELECT COUNT(*), BOOL_OR(pl.is_default) 
    INTO pickup_count, has_default
    FROM pickup_locations pl 
    WHERE pl.user_id = user_record.id;
    
    IF pickup_count = 0 THEN
        missing_fields := array_append(missing_fields, 'pickup_locations');
        is_complete := FALSE;
    END IF;
    
    -- Return status
    RETURN QUERY SELECT 
        TRUE,
        jsonb_build_object(
            'is_complete', is_complete,
            'missing_fields', to_jsonb(missing_fields),
            'pickup_location_count', pickup_count,
            'has_default_pickup', COALESCE(has_default, FALSE)
        ),
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION api_create_user_profile TO authenticated, anon;
GRANT EXECUTE ON FUNCTION api_get_user_profile TO authenticated, anon;
GRANT EXECUTE ON FUNCTION api_get_profile_status TO authenticated, anon;

-- Add documentation comments
COMMENT ON FUNCTION api_create_user_profile IS 'Creates a complete user profile with automatic pickup location creation';
COMMENT ON FUNCTION api_get_user_profile IS 'Retrieves user profile with all pickup locations';
COMMENT ON FUNCTION api_get_profile_status IS 'Returns profile completion status for UI display';
