-- NSU Commute Initial Schema Migration
-- This migration sets up the complete database schema for the NSU Commute application

-- Enable PostGIS extension for location data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('DRIVER', 'RIDER');
CREATE TYPE day_of_week AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');
CREATE TYPE opt_in_status AS ENUM ('PENDING_MATCH', 'MATCHED', 'CANCELLED');
CREATE TYPE ride_status AS ENUM ('PROPOSED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE participant_status AS ENUM ('PENDING_ACCEPTANCE', 'ACCEPTED', 'DECLINED');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    default_role user_role NOT NULL DEFAULT 'RIDER',
    home_location_coords GEOMETRY(POINT, 4326) NOT NULL,
    driver_details JSONB,
    telegram_user_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pickup locations table
CREATE TABLE pickup_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    coords GEOMETRY(POINT, 4326) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily opt-ins table
CREATE TABLE daily_opt_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    commute_date DATE NOT NULL,
    time_window_start TIME NOT NULL,
    time_window_end TIME NOT NULL,
    pickup_location_id UUID NOT NULL REFERENCES pickup_locations(id),
    status opt_in_status DEFAULT 'PENDING_MATCH',
    is_automatic BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled opt-ins table
CREATE TABLE scheduled_opt_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week day_of_week NOT NULL,
    start_time TIME NOT NULL,
    pickup_location_id UUID NOT NULL REFERENCES pickup_locations(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matched rides table
CREATE TABLE matched_rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES users(id),
    ride_date DATE NOT NULL,
    uber_api_route_data JSONB NOT NULL,
    cost_per_rider DECIMAL(10,2) NOT NULL,
    status ride_status DEFAULT 'PROPOSED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ride participants table
CREATE TABLE ride_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES matched_rides(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    status participant_status DEFAULT 'PENDING_ACCEPTANCE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ride_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_telegram_id ON users(telegram_user_id);
CREATE INDEX idx_pickup_locations_user_id ON pickup_locations(user_id);
CREATE INDEX idx_pickup_locations_default ON pickup_locations(user_id, is_default);
CREATE INDEX idx_daily_opt_ins_user_date ON daily_opt_ins(user_id, commute_date);
CREATE INDEX idx_daily_opt_ins_status_date ON daily_opt_ins(status, commute_date);
CREATE INDEX idx_scheduled_opt_ins_user_active ON scheduled_opt_ins(user_id, is_active);
CREATE INDEX idx_matched_rides_driver_date ON matched_rides(driver_id, ride_date);
CREATE INDEX idx_matched_rides_status ON matched_rides(status);
CREATE INDEX idx_ride_participants_ride_id ON ride_participants(ride_id);
CREATE INDEX idx_ride_participants_user_id ON ride_participants(user_id);

-- Spatial indexes for location queries
CREATE INDEX idx_users_location ON users USING GIST(home_location_coords);
CREATE INDEX idx_pickup_locations_coords ON pickup_locations USING GIST(coords);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pickup_locations_updated_at BEFORE UPDATE ON pickup_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_opt_ins_updated_at BEFORE UPDATE ON daily_opt_ins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_opt_ins_updated_at BEFORE UPDATE ON scheduled_opt_ins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matched_rides_updated_at BEFORE UPDATE ON matched_rides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ride_participants_updated_at BEFORE UPDATE ON ride_participants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_opt_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_opt_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE matched_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_participants ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Pickup locations policies
CREATE POLICY "Users can manage their own pickup locations" ON pickup_locations FOR ALL USING (auth.uid() = user_id);

-- Daily opt-ins policies
CREATE POLICY "Users can manage their own opt-ins" ON daily_opt_ins FOR ALL USING (auth.uid() = user_id);

-- Scheduled opt-ins policies
CREATE POLICY "Users can manage their own scheduled opt-ins" ON scheduled_opt_ins FOR ALL USING (auth.uid() = user_id);

-- Matched rides policies
CREATE POLICY "Users can view rides they're involved in" ON matched_rides FOR SELECT USING (
    auth.uid() = driver_id OR 
    auth.uid() IN (SELECT user_id FROM ride_participants WHERE ride_id = matched_rides.id)
);
CREATE POLICY "Drivers can update their rides" ON matched_rides FOR UPDATE USING (auth.uid() = driver_id);

-- Ride participants policies
CREATE POLICY "Users can view their own participation" ON ride_participants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own participation status" ON ride_participants FOR UPDATE USING (auth.uid() = user_id);

-- Functions for business logic

-- Function to ensure only one default pickup location per user
CREATE OR REPLACE FUNCTION ensure_single_default_pickup()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE pickup_locations 
        SET is_default = FALSE 
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_pickup_trigger
    BEFORE INSERT OR UPDATE ON pickup_locations
    FOR EACH ROW EXECUTE FUNCTION ensure_single_default_pickup();

-- Function to validate NSU email domain
CREATE OR REPLACE FUNCTION validate_nsu_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email NOT LIKE '%@northsouth.edu' THEN
        RAISE EXCEPTION 'Email must be from North South University domain (@northsouth.edu)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_nsu_email_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION validate_nsu_email();

-- Function to validate driver details when role is DRIVER
CREATE OR REPLACE FUNCTION validate_driver_details()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.default_role = 'DRIVER' AND (NEW.driver_details IS NULL OR NEW.driver_details = '{}') THEN
        RAISE EXCEPTION 'Driver details are required for users with DRIVER role';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_driver_details_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION validate_driver_details();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE users IS 'Stores user profiles and authentication data';
COMMENT ON TABLE pickup_locations IS 'User-defined pickup locations with coordinates';
COMMENT ON TABLE daily_opt_ins IS 'Daily ride opt-ins by users';
COMMENT ON TABLE scheduled_opt_ins IS 'Recurring weekly schedules for automatic opt-ins';
COMMENT ON TABLE matched_rides IS 'AI-generated ride matches with route data';
COMMENT ON TABLE ride_participants IS 'Users participating in each matched ride';
