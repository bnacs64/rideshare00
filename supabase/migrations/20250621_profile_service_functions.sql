-- Profile Service Functions Migration
-- This migration provides the database functions needed by the profileService

-- ============================================================================
-- 1. COMPLETE PROFILE CREATION FUNCTION
-- ============================================================================

-- Function to create a complete user profile with all validations and automatic setup
CREATE OR REPLACE FUNCTION create_complete_user_profile(
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
    user_data JSONB,
    pickup_location_id UUID,
    error_message TEXT
) AS $$
DECLARE
    created_user users%ROWTYPE;
    created_pickup_location pickup_locations%ROWTYPE;
    home_point GEOMETRY;
BEGIN
    -- Create the geometry point
    home_point := ST_SetSRID(ST_MakePoint(p_home_location_lng, p_home_location_lat), 4326);
    
    -- Validate input parameters
    IF p_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, NULL::UUID, 'User ID is required';
        RETURN;
    END IF;
    
    IF p_email IS NULL OR trim(p_email) = '' THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, NULL::UUID, 'Email is required';
        RETURN;
    END IF;
    
    IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, NULL::UUID, 'Full name is required';
        RETURN;
    END IF;
    
    -- Validate driver details if role is DRIVER
    IF p_default_role = 'DRIVER' THEN
        IF p_driver_details IS NULL OR p_driver_details = '{}' THEN
            RETURN QUERY SELECT FALSE, NULL::JSONB, NULL::UUID, 'Driver details are required for DRIVER role';
            RETURN;
        END IF;
        
        IF NOT (p_driver_details ? 'car_model') OR trim(p_driver_details->>'car_model') = '' THEN
            RETURN QUERY SELECT FALSE, NULL::JSONB, NULL::UUID, 'Car model is required in driver details';
            RETURN;
        END IF;
        
        IF NOT (p_driver_details ? 'capacity') OR 
           (p_driver_details->>'capacity')::INTEGER < 1 OR 
           (p_driver_details->>'capacity')::INTEGER > 8 THEN
            RETURN QUERY SELECT FALSE, NULL::JSONB, NULL::UUID, 'Capacity must be between 1 and 8 passengers';
            RETURN;
        END IF;
    END IF;
    
    BEGIN
        -- Insert or update user profile
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
            full_name = EXCLUDED.full_name,
            default_role = EXCLUDED.default_role,
            home_location_coords = EXCLUDED.home_location_coords,
            home_location_address = EXCLUDED.home_location_address,
            driver_details = EXCLUDED.driver_details,
            telegram_user_id = EXCLUDED.telegram_user_id,
            updated_at = NOW()
        RETURNING * INTO created_user;
        
        -- Get the created/updated pickup location (created by trigger)
        SELECT * INTO created_pickup_location
        FROM pickup_locations 
        WHERE user_id = p_user_id AND is_default = true AND name = 'Home'
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- Return success with user data
        RETURN QUERY SELECT 
            TRUE,
            jsonb_build_object(
                'id', created_user.id,
                'email', created_user.email,
                'full_name', created_user.full_name,
                'default_role', created_user.default_role,
                'home_location_coords', ARRAY[ST_X(created_user.home_location_coords), ST_Y(created_user.home_location_coords)],
                'home_location_address', created_user.home_location_address,
                'driver_details', created_user.driver_details,
                'telegram_user_id', created_user.telegram_user_id,
                'created_at', created_user.created_at,
                'updated_at', created_user.updated_at
            ),
            COALESCE(created_pickup_location.id, NULL::UUID),
            NULL::TEXT;
            
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, NULL::UUID, SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. PROFILE UPDATE FUNCTION
-- ============================================================================

-- Function to update user profile with validation
CREATE OR REPLACE FUNCTION update_user_profile(
    p_user_id UUID,
    p_full_name TEXT DEFAULT NULL,
    p_default_role user_role DEFAULT NULL,
    p_home_location_lng DOUBLE PRECISION DEFAULT NULL,
    p_home_location_lat DOUBLE PRECISION DEFAULT NULL,
    p_home_location_address TEXT DEFAULT NULL,
    p_driver_details JSONB DEFAULT NULL,
    p_telegram_user_id BIGINT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    user_data JSONB,
    error_message TEXT
) AS $$
DECLARE
    updated_user users%ROWTYPE;
    home_point GEOMETRY;
    existing_user users%ROWTYPE;
BEGIN
    -- Get current user data
    SELECT * INTO existing_user FROM users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, 'User not found';
        RETURN;
    END IF;
    
    -- Create geometry point if coordinates provided
    IF p_home_location_lng IS NOT NULL AND p_home_location_lat IS NOT NULL THEN
        home_point := ST_SetSRID(ST_MakePoint(p_home_location_lng, p_home_location_lat), 4326);
    END IF;
    
    -- Validate driver details if role is being changed to DRIVER or if updating driver details
    IF (p_default_role = 'DRIVER' OR (p_default_role IS NULL AND existing_user.default_role = 'DRIVER')) THEN
        DECLARE
            final_driver_details JSONB;
        BEGIN
            -- Use provided driver details or keep existing ones
            final_driver_details := COALESCE(p_driver_details, existing_user.driver_details);
            
            IF final_driver_details IS NULL OR final_driver_details = '{}' THEN
                RETURN QUERY SELECT FALSE, NULL::JSONB, 'Driver details are required for DRIVER role';
                RETURN;
            END IF;
            
            IF NOT (final_driver_details ? 'car_model') OR trim(final_driver_details->>'car_model') = '' THEN
                RETURN QUERY SELECT FALSE, NULL::JSONB, 'Car model is required in driver details';
                RETURN;
            END IF;
            
            IF NOT (final_driver_details ? 'capacity') OR 
               (final_driver_details->>'capacity')::INTEGER < 1 OR 
               (final_driver_details->>'capacity')::INTEGER > 8 THEN
                RETURN QUERY SELECT FALSE, NULL::JSONB, 'Capacity must be between 1 and 8 passengers';
                RETURN;
            END IF;
        END;
    END IF;
    
    BEGIN
        -- Update user profile (only update provided fields)
        UPDATE users SET
            full_name = COALESCE(p_full_name, full_name),
            default_role = COALESCE(p_default_role, default_role),
            home_location_coords = COALESCE(home_point, home_location_coords),
            home_location_address = COALESCE(p_home_location_address, home_location_address),
            driver_details = COALESCE(p_driver_details, driver_details),
            telegram_user_id = COALESCE(p_telegram_user_id, telegram_user_id),
            updated_at = NOW()
        WHERE id = p_user_id
        RETURNING * INTO updated_user;
        
        -- Return success with updated user data
        RETURN QUERY SELECT 
            TRUE,
            jsonb_build_object(
                'id', updated_user.id,
                'email', updated_user.email,
                'full_name', updated_user.full_name,
                'default_role', updated_user.default_role,
                'home_location_coords', ARRAY[ST_X(updated_user.home_location_coords), ST_Y(updated_user.home_location_coords)],
                'home_location_address', updated_user.home_location_address,
                'driver_details', updated_user.driver_details,
                'telegram_user_id', updated_user.telegram_user_id,
                'created_at', updated_user.created_at,
                'updated_at', updated_user.updated_at
            ),
            NULL::TEXT;
            
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. PICKUP LOCATION MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to add a pickup location with validation
CREATE OR REPLACE FUNCTION add_pickup_location(
    p_user_id UUID,
    p_name TEXT,
    p_description TEXT,
    p_location_lng DOUBLE PRECISION,
    p_location_lat DOUBLE PRECISION,
    p_is_default BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    success BOOLEAN,
    pickup_location_data JSONB,
    error_message TEXT
) AS $$
DECLARE
    created_location pickup_locations%ROWTYPE;
    location_point GEOMETRY;
BEGIN
    -- Validate input
    IF p_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, 'User ID is required';
        RETURN;
    END IF;
    
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, 'Location name is required';
        RETURN;
    END IF;
    
    IF p_description IS NULL OR trim(p_description) = '' THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, 'Location description is required';
        RETURN;
    END IF;
    
    -- Create geometry point
    location_point := ST_SetSRID(ST_MakePoint(p_location_lng, p_location_lat), 4326);
    
    BEGIN
        -- Insert pickup location
        INSERT INTO pickup_locations (
            user_id,
            name,
            description,
            coords,
            is_default
        ) VALUES (
            p_user_id,
            p_name,
            p_description,
            location_point,
            p_is_default
        )
        RETURNING * INTO created_location;
        
        -- Return success with location data
        RETURN QUERY SELECT 
            TRUE,
            jsonb_build_object(
                'id', created_location.id,
                'user_id', created_location.user_id,
                'name', created_location.name,
                'description', created_location.description,
                'coords', ARRAY[ST_Y(created_location.coords), ST_X(created_location.coords)], -- Return as [lat, lng]
                'is_default', created_location.is_default,
                'created_at', created_location.created_at,
                'updated_at', created_location.updated_at
            ),
            NULL::TEXT;
            
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_complete_user_profile(UUID, TEXT, TEXT, user_role, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, JSONB, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, TEXT, user_role, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, JSONB, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_pickup_location(UUID, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION create_complete_user_profile(UUID, TEXT, TEXT, user_role, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, JSONB, BIGINT) IS 'Creates a complete user profile with validation and automatic pickup location creation';
COMMENT ON FUNCTION update_user_profile(UUID, TEXT, user_role, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, JSONB, BIGINT) IS 'Updates user profile with validation, only updating provided fields';
COMMENT ON FUNCTION add_pickup_location(UUID, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) IS 'Adds a new pickup location with validation';
