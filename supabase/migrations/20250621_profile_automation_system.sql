-- Profile Automation System Migration
-- This migration implements comprehensive database triggers and functions for profile operations
-- to separate UI logic from backend logic and ensure data consistency

-- ============================================================================
-- 1. AUTOMATIC DEFAULT PICKUP LOCATION CREATION
-- ============================================================================

-- Function to automatically create a default pickup location when a user profile is created
CREATE OR REPLACE FUNCTION create_default_pickup_location()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create default pickup location for new user profiles
    IF TG_OP = 'INSERT' THEN
        -- Create a default pickup location based on the user's home location
        INSERT INTO pickup_locations (
            user_id,
            name,
            description,
            coords,
            is_default
        ) VALUES (
            NEW.id,
            'Home',
            COALESCE(NEW.home_location_address, 'My home location'),
            NEW.home_location_coords,
            true
        );
        
        -- Log the creation
        RAISE NOTICE 'Created default pickup location for user %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic default pickup location creation
DROP TRIGGER IF EXISTS create_default_pickup_location_trigger ON users;
CREATE TRIGGER create_default_pickup_location_trigger
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_default_pickup_location();

-- ============================================================================
-- 2. PROFILE VALIDATION TRIGGERS
-- ============================================================================

-- Enhanced function to validate user profile data
CREATE OR REPLACE FUNCTION validate_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate full name
    IF NEW.full_name IS NULL OR trim(NEW.full_name) = '' THEN
        RAISE EXCEPTION 'Full name is required and cannot be empty';
    END IF;
    
    -- Validate home location coordinates
    IF NEW.home_location_coords IS NULL THEN
        RAISE EXCEPTION 'Home location coordinates are required';
    END IF;
    
    -- Validate coordinates are within reasonable bounds (basic sanity check)
    DECLARE
        lat DOUBLE PRECISION;
        lng DOUBLE PRECISION;
    BEGIN
        lat := ST_Y(NEW.home_location_coords);
        lng := ST_X(NEW.home_location_coords);
        
        IF lat < -90 OR lat > 90 THEN
            RAISE EXCEPTION 'Invalid latitude: % (must be between -90 and 90)', lat;
        END IF;
        
        IF lng < -180 OR lng > 180 THEN
            RAISE EXCEPTION 'Invalid longitude: % (must be between -180 and 180)', lng;
        END IF;
    END;
    
    -- Validate driver details if role is DRIVER
    IF NEW.default_role = 'DRIVER' THEN
        IF NEW.driver_details IS NULL OR NEW.driver_details = '{}' THEN
            RAISE EXCEPTION 'Driver details are required for users with DRIVER role';
        END IF;
        
        -- Validate driver details structure
        IF NOT (NEW.driver_details ? 'car_model') OR 
           trim(NEW.driver_details->>'car_model') = '' THEN
            RAISE EXCEPTION 'Car model is required in driver details';
        END IF;
        
        IF NOT (NEW.driver_details ? 'capacity') OR 
           (NEW.driver_details->>'capacity')::INTEGER < 1 OR 
           (NEW.driver_details->>'capacity')::INTEGER > 8 THEN
            RAISE EXCEPTION 'Capacity must be between 1 and 8 passengers';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile validation
DROP TRIGGER IF EXISTS validate_user_profile_trigger ON users;
CREATE TRIGGER validate_user_profile_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION validate_user_profile();

-- ============================================================================
-- 3. PICKUP LOCATION MANAGEMENT TRIGGERS
-- ============================================================================

-- Enhanced function to validate pickup location data
CREATE OR REPLACE FUNCTION validate_pickup_location()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate required fields
    IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
        RAISE EXCEPTION 'Pickup location name is required and cannot be empty';
    END IF;
    
    IF NEW.description IS NULL OR trim(NEW.description) = '' THEN
        RAISE EXCEPTION 'Pickup location description is required and cannot be empty';
    END IF;
    
    IF NEW.coords IS NULL THEN
        RAISE EXCEPTION 'Pickup location coordinates are required';
    END IF;
    
    -- Validate coordinates are within reasonable bounds
    DECLARE
        lat DOUBLE PRECISION;
        lng DOUBLE PRECISION;
    BEGIN
        lat := ST_Y(NEW.coords);
        lng := ST_X(NEW.coords);
        
        IF lat < -90 OR lat > 90 THEN
            RAISE EXCEPTION 'Invalid latitude: % (must be between -90 and 90)', lat;
        END IF;
        
        IF lng < -180 OR lng > 180 THEN
            RAISE EXCEPTION 'Invalid longitude: % (must be between -180 and 180)', lng;
        END IF;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for pickup location validation
DROP TRIGGER IF EXISTS validate_pickup_location_trigger ON pickup_locations;
CREATE TRIGGER validate_pickup_location_trigger
    BEFORE INSERT OR UPDATE ON pickup_locations
    FOR EACH ROW EXECUTE FUNCTION validate_pickup_location();

-- ============================================================================
-- 4. AUTOMATIC HOME LOCATION SYNC
-- ============================================================================

-- Function to automatically update default pickup location when home location changes
CREATE OR REPLACE FUNCTION sync_home_location_to_default_pickup()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if home location coordinates have changed
    IF TG_OP = 'UPDATE' AND 
       (OLD.home_location_coords IS DISTINCT FROM NEW.home_location_coords OR
        OLD.home_location_address IS DISTINCT FROM NEW.home_location_address) THEN
        
        -- Update the default pickup location to match new home location
        UPDATE pickup_locations 
        SET 
            coords = NEW.home_location_coords,
            description = COALESCE(NEW.home_location_address, 'My home location'),
            updated_at = NOW()
        WHERE 
            user_id = NEW.id 
            AND is_default = true 
            AND name = 'Home';
        
        -- Log the sync
        RAISE NOTICE 'Synced home location to default pickup location for user %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for home location sync
DROP TRIGGER IF EXISTS sync_home_location_trigger ON users;
CREATE TRIGGER sync_home_location_trigger
    AFTER UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION sync_home_location_to_default_pickup();

-- ============================================================================
-- 5. PROFILE COMPLETION STATUS FUNCTION
-- ============================================================================

-- Function to check if a user profile is complete
CREATE OR REPLACE FUNCTION is_profile_complete(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_record users%ROWTYPE;
    pickup_count INTEGER;
BEGIN
    -- Get user record
    SELECT * INTO user_record FROM users WHERE id = user_id;
    
    -- Check if user exists
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check required profile fields
    IF user_record.full_name IS NULL OR 
       trim(user_record.full_name) = '' OR
       user_record.home_location_coords IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user has at least one pickup location
    SELECT COUNT(*) INTO pickup_count 
    FROM pickup_locations 
    WHERE user_id = user_record.id;
    
    IF pickup_count = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Check driver-specific requirements
    IF user_record.default_role = 'DRIVER' THEN
        IF user_record.driver_details IS NULL OR 
           user_record.driver_details = '{}' OR
           NOT (user_record.driver_details ? 'car_model') OR
           NOT (user_record.driver_details ? 'capacity') THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get user profile completion status
CREATE OR REPLACE FUNCTION get_profile_status(user_id UUID)
RETURNS TABLE(
    is_complete BOOLEAN,
    missing_fields TEXT[],
    pickup_location_count INTEGER,
    has_default_pickup BOOLEAN
) AS $$
DECLARE
    user_record users%ROWTYPE;
    missing TEXT[] := '{}';
    pickup_count INTEGER := 0;
    has_default BOOLEAN := FALSE;
BEGIN
    -- Get user record
    SELECT * INTO user_record FROM users WHERE id = user_id;
    
    -- Check if user exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, ARRAY['User not found'], 0, FALSE;
        RETURN;
    END IF;
    
    -- Check required fields
    IF user_record.full_name IS NULL OR trim(user_record.full_name) = '' THEN
        missing := array_append(missing, 'full_name');
    END IF;
    
    IF user_record.home_location_coords IS NULL THEN
        missing := array_append(missing, 'home_location');
    END IF;
    
    -- Check driver details if needed
    IF user_record.default_role = 'DRIVER' THEN
        IF user_record.driver_details IS NULL OR user_record.driver_details = '{}' THEN
            missing := array_append(missing, 'driver_details');
        END IF;
    END IF;
    
    -- Check pickup locations
    SELECT COUNT(*), BOOL_OR(pl.is_default) 
    INTO pickup_count, has_default
    FROM pickup_locations pl 
    WHERE pl.user_id = user_record.id;
    
    IF pickup_count = 0 THEN
        missing := array_append(missing, 'pickup_locations');
    END IF;
    
    RETURN QUERY SELECT 
        array_length(missing, 1) IS NULL, 
        missing, 
        pickup_count, 
        COALESCE(has_default, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_profile_complete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_profile_status(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION create_default_pickup_location() IS 'Automatically creates a default pickup location when a user profile is created';
COMMENT ON FUNCTION validate_user_profile() IS 'Validates user profile data including coordinates and driver details';
COMMENT ON FUNCTION validate_pickup_location() IS 'Validates pickup location data including coordinates';
COMMENT ON FUNCTION sync_home_location_to_default_pickup() IS 'Syncs home location changes to the default pickup location';
COMMENT ON FUNCTION is_profile_complete(UUID) IS 'Checks if a user profile is complete with all required data';
COMMENT ON FUNCTION get_profile_status(UUID) IS 'Returns detailed profile completion status for UI display';
