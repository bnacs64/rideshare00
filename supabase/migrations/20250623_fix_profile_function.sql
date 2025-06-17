-- Fix Profile Function Migration
-- Fixes the ON CONFLICT issue in api_create_user_profile

-- Drop and recreate the function with the fix
DROP FUNCTION IF EXISTS api_create_user_profile CASCADE;

-- Create complete user profile (fixed version)
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
        
        -- Try to get existing default pickup location first
        SELECT * INTO created_pickup
        FROM pickup_locations 
        WHERE user_id = p_user_id AND is_default = true
        LIMIT 1;
        
        -- If no default pickup location exists, create one
        IF created_pickup IS NULL THEN
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
        ELSE
            -- Update existing default pickup location
            UPDATE pickup_locations SET
                coords = home_point,
                description = COALESCE(p_home_location_address, 'My home location'),
                updated_at = NOW()
            WHERE id = created_pickup.id
            RETURNING * INTO created_pickup;
        END IF;
        
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION api_create_user_profile TO authenticated, anon;

-- Add documentation
COMMENT ON FUNCTION api_create_user_profile IS 'Creates a complete user profile with automatic pickup location creation (fixed version)';
