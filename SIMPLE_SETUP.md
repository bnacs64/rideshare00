# Simple Setup Instructions

Since you're having issues with the Supabase CLI, let's use the manual approach:

## Step 1: Run the Database Migration Manually

1. **Go to your Supabase Dashboard**:
   - Visit https://supabase.com/dashboard
   - Select your project: `fwshmucplaqqtpkzqbvb`

2. **Open SQL Editor**:
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste the Migration**:
   - Copy the entire contents of `supabase/migrations/20250616_initial_schema.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

## Step 2: Verify Your Environment Variables

Make sure your `.env` file has the correct values:

```env
VITE_SUPABASE_URL=https://fwshmucplaqqtpkzqbvb.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-from-dashboard
VITE_NSU_EMAIL_DOMAIN=@northsouth.edu
VITE_APP_URL=http://localhost:3000
```

To get your anon key:
1. Go to your Supabase dashboard
2. Click "Settings" → "API"
3. Copy the "anon public" key

## Step 3: Test the Application

1. **Restart the dev server** (if needed):
   ```bash
   npm run dev
   ```

2. **Open browser**: http://localhost:3000

3. **Check browser console** (F12):
   - Should see: "✅ Supabase connection test passed"
   - No JavaScript errors

4. **Test registration**:
   - Click "Get Started"
   - Use email: `test@northsouth.edu`
   - Password: `password123`
   - Complete profile setup

## Step 4: Verify Database Tables

After running the migration, check in Supabase Dashboard → Table Editor:

You should see these tables:
- ✅ users
- ✅ pickup_locations  
- ✅ daily_opt_ins
- ✅ scheduled_opt_ins
- ✅ matched_rides
- ✅ ride_participants

## Troubleshooting

### If you see "Missing Supabase environment variables":
1. Check your `.env` file
2. Restart the dev server: `Ctrl+C` then `npm run dev`

### If you see "Supabase connection test failed":
1. Verify your Supabase URL and anon key
2. Make sure the migration ran successfully
3. Check if PostGIS extension is enabled

### If registration fails:
1. Make sure you're using `@northsouth.edu` email
2. Check browser console for errors
3. Verify the `users` table exists

## Alternative: Use Supabase Dashboard SQL Editor

If the CLI continues to have issues, you can manage everything through the dashboard:

1. **For migrations**: Use SQL Editor
2. **For monitoring**: Use Table Editor and Logs
3. **For auth settings**: Use Authentication settings

This approach works just as well and is often easier for development!
