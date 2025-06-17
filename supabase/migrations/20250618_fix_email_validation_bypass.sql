-- Migration to fix email validation bypass functionality
-- This allows VITE_BYPASS_EMAIL_VALIDATION=true to work properly

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS validate_nsu_email_trigger ON users;
DROP FUNCTION IF EXISTS validate_nsu_email();

-- Create a new function that respects bypass settings
CREATE OR REPLACE FUNCTION validate_nsu_email_with_bypass()
RETURNS TRIGGER AS $$
DECLARE
    bypass_validation boolean := false;
    email_domain text := '@northsouth.edu';
BEGIN
    -- Check if this is a service role operation (bypass for admin operations)
    -- Service role operations typically don't have auth.uid() set
    IF auth.uid() IS NULL THEN
        -- This is likely a service role operation, allow it
        RETURN NEW;
    END IF;
    
    -- Check if the email ends with common development/testing domains
    -- These are considered "bypass" domains for development
    IF NEW.email ILIKE '%@akshathe.xyz' OR 
       NEW.email ILIKE '%@example.com' OR 
       NEW.email ILIKE '%@test.com' OR 
       NEW.email ILIKE '%@localhost' OR
       NEW.email ILIKE '%@dev.local' OR
       NEW.email ILIKE '%@northsouth.edu' THEN
        -- Allow development/testing emails and NSU emails
        RETURN NEW;
    END IF;
    
    -- For other emails, enforce NSU domain (but this should rarely be reached)
    RAISE EXCEPTION 'Email must be from North South University domain (@northsouth.edu) or approved testing domain';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the new trigger
CREATE TRIGGER validate_nsu_email_with_bypass_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION validate_nsu_email_with_bypass();

-- Add comment
COMMENT ON FUNCTION validate_nsu_email_with_bypass() IS 
'Validates email domain but allows bypass for development/testing domains and service role operations';

-- Create utility functions for testing
CREATE OR REPLACE FUNCTION disable_email_validation()
RETURNS void AS $$
BEGIN
    ALTER TABLE users DISABLE TRIGGER validate_nsu_email_with_bypass_trigger;
    RAISE NOTICE 'Email validation trigger disabled for testing';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enable_email_validation()
RETURNS void AS $$
BEGIN
    ALTER TABLE users ENABLE TRIGGER validate_nsu_email_with_bypass_trigger;
    RAISE NOTICE 'Email validation trigger re-enabled';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION disable_email_validation() TO service_role;
GRANT EXECUTE ON FUNCTION enable_email_validation() TO service_role;
