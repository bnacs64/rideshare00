# Database Migration Instructions

## Prerequisites
- Supabase CLI installed
- Supabase project created
- Environment variables set in `.env`

## Running the Migration

1. **Initialize Supabase (if not already done)**:
   ```bash
   supabase init
   ```

2. **Link to your Supabase project**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Push the migration to your Supabase project**:
   ```bash
   supabase db push
   ```

   Or if you want to apply the specific migration:
   ```bash
   supabase migration up
   ```

## Alternative: Manual Migration

If you prefer to run the migration manually:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase/migrations/20250616_initial_schema.sql`
4. Execute the SQL

## Verification

After running the migration, verify that the following tables exist:
- `users`
- `pickup_locations`
- `daily_opt_ins`
- `scheduled_opt_ins`
- `matched_rides`
- `ride_participants`

You can check this in the Supabase dashboard under "Table Editor" or by running:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

## Troubleshooting

If you encounter issues:

1. **PostGIS Extension Error**: Make sure PostGIS is enabled in your Supabase project
2. **Permission Errors**: Ensure your Supabase CLI is properly authenticated
3. **RLS Policies**: The migration includes Row Level Security policies that should work with Supabase Auth

## Next Steps

After the migration is successful:
1. Update your `.env` file with the correct Supabase URL and anon key
2. Test the application by registering a new user
3. Verify that profile creation and pickup location management work correctly
