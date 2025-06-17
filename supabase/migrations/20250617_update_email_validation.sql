-- Update email validation to allow test domains
-- This migration updates the email validation trigger to allow @nsu.edu and other test domains

-- Drop the existing trigger
DROP TRIGGER IF EXISTS validate_nsu_email_trigger ON users;

-- Update the validation function to allow test domains
CREATE OR REPLACE FUNCTION validate_nsu_email_with_bypass()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is a service role operation (bypass for admin operations)
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Allow approved domains for development/testing
    IF NEW.email ILIKE '%@northsouth.edu' OR 
       NEW.email ILIKE '%@nsu.edu' OR
       NEW.email ILIKE '%@akshathe.xyz' OR 
       NEW.email ILIKE '%@example.com' OR 
       NEW.email ILIKE '%@test.com' OR 
       NEW.email ILIKE '%@localhost' OR
       NEW.email ILIKE '%@dev.local' THEN
        RETURN NEW;
    END IF;
    
    -- Reject other domains
    RAISE EXCEPTION 'Email must be from North South University domain (@northsouth.edu) or approved testing domain';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the new trigger with the updated function
CREATE TRIGGER validate_nsu_email_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION validate_nsu_email_with_bypass();

-- Add a comment for documentation
COMMENT ON FUNCTION validate_nsu_email_with_bypass() IS 'Validates email domains, allowing NSU domain and approved testing domains';
