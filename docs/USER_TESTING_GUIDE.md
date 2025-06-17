# User Testing Guide

This guide explains how to programmatically create users and test the signup flow for the NSU Commute application.

## Overview

The testing suite provides multiple ways to test user creation and authentication:

1. **Web UI Testing** - Interactive testing through the browser
2. **Command Line Testing** - Programmatic testing via Node.js scripts
3. **Frontend Testing Utilities** - Reusable functions for component testing

## Web UI Testing

### Accessing the Testing Page

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Navigate to: `http://localhost:3001/testing`

3. The testing page provides buttons for:
   - **Run Diagnostics** - Test Supabase connection and database access
   - **Test Single User** - Create and test one user
   - **Test Multiple Users** - Create and test multiple users in parallel
   - **Stress Test** - Rapidly create multiple users to test system limits
   - **Run All Tests** - Comprehensive test suite
   - **Cleanup Test Users** - Remove all test users from the system

### Test Users

The system uses predefined test users with various domains to test bypass functionality:

**NSU Domain Users:**
- `test1@northsouth.edu` - RIDER role
- `test2@northsouth.edu` - DRIVER role with vehicle details
- `test3@northsouth.edu` - RIDER role

**Bypass Testing Domains** (automatically allowed by database trigger):
- `@akshathe.xyz` - Custom testing domain
- `@example.com` - Standard testing domain
- `@test.com` - Testing domain
- `@localhost` - Local development
- `@dev.local` - Development domain

All test users use the password: `TestPassword123!`

**Note:** The database now has built-in bypass functionality that allows service role operations and specific testing domains, making `VITE_BYPASS_EMAIL_VALIDATION=true` work properly at both frontend and database levels.

## Command Line Testing

### Running Tests

Execute the command line test suite:

```bash
# Run the full test suite
pnpm test:users

# Or run directly with Node.js
node scripts/testUserCreation.js
```

### What Gets Tested

The command line script tests:

1. **Connection Test** - Verifies Supabase connectivity
2. **User Creation** - Creates auth users and profiles
3. **Authentication** - Tests signin functionality
4. **Profile Retrieval** - Verifies profile data persistence
5. **Cleanup** - Removes test users after testing

### Sample Output

```
🧪 NSU Commute User Creation Test Suite
=====================================

🔍 Testing Supabase connection...
✅ Supabase connection successful

🚀 Creating test user: cmdtest1@akshathe.xyz
📝 Step 1: Creating auth user...
✅ Auth user created: cmdtest1@akshathe.xyz
📝 Step 2: Creating user profile...
✅ User profile created successfully

🔐 Testing signin for: cmdtest1@akshathe.xyz
✅ Signin successful: cmdtest1@akshathe.xyz
✅ Profile fetch successful: Command Line Test User 1

📊 Test Results Summary:
========================
Total tests: 2
Passed: 2
Failed: 0
Success rate: 100.0%
1. cmdtest1@akshathe.xyz: ✅ PASS (1234ms)
2. cmdtest2@akshathe.xyz: ✅ PASS (1456ms)

🧹 Cleaning up test users...
🗑️ Deleted user: cmdtest1@akshathe.xyz
🗑️ Deleted user: cmdtest2@akshathe.xyz

✅ Test suite completed!
```

## Frontend Testing Utilities

### Available Functions

Import testing utilities in your components:

```typescript
import { 
  createTestUser, 
  testUserSignIn, 
  testFetchUserProfile,
  cleanupTestUsers,
  TEST_USERS 
} from '../utils/userTestingUtils'

import { 
  testCompleteSignupFlow,
  testMultipleUsersSignupFlow,
  stressTestSignupFlow 
} from '../utils/signupFlowTester'
```

### Example Usage

```typescript
// Create a single test user
const result = await createTestUser(TEST_USERS[0])
if (result.success) {
  console.log('User created:', result.data.authUser.email)
} else {
  console.error('Creation failed:', result.error)
}

// Test complete signup flow
const flowResult = await testCompleteSignupFlow(TEST_USERS[0])
console.log('Signup flow:', flowResult.success ? 'PASSED' : 'FAILED')

// Test multiple users in parallel
const multiResults = await testMultipleUsersSignupFlow(TEST_USERS)
const successCount = multiResults.filter(r => r.success).length
console.log(`${successCount}/${multiResults.length} users created successfully`)
```

## Troubleshooting

### Common Issues

#### Timeout Errors

If you see timeout errors:

1. **Check Internet Connection** - Ensure stable connectivity
2. **Verify Supabase Status** - Check if Supabase services are operational
3. **Increase Timeouts** - Modify timeout values in the testing utilities
4. **Run Diagnostics** - Use the diagnostics function to check connection health

#### Database Errors

For database-related issues:

1. **Check Schema** - Ensure the `users` table exists with correct columns
2. **Verify RLS Policies** - Ensure Row Level Security allows user creation
3. **Service Role Key** - Verify the service role key has proper permissions
4. **Duplicate Keys** - Check for existing users with the same email

#### Authentication Errors

For auth-related problems:

1. **Email Confirmations** - Ensure email confirmations are disabled in Supabase
2. **Domain Validation** - Check if `VITE_BYPASS_EMAIL_VALIDATION=true` is set
3. **Signup Settings** - Verify auth settings allow new user signups
4. **Environment Variables** - Ensure all required env vars are set correctly

### Environment Variables

Required environment variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Development Configuration
VITE_BYPASS_EMAIL_VALIDATION=true
VITE_NSU_EMAIL_DOMAIN=@akshathe.xyz
```

### Debugging Tips

1. **Enable Console Logging** - Check browser console for detailed error messages
2. **Check Network Tab** - Monitor network requests for failed API calls
3. **Supabase Dashboard** - Use Supabase dashboard to verify user creation
4. **Database Logs** - Check Supabase logs for database-level errors

## Best Practices

### Test Data Management

1. **Use Consistent Test Data** - Use predefined test users for reproducible results
2. **Clean Up After Tests** - Always clean up test users to avoid conflicts
3. **Separate Test Environment** - Use a separate Supabase project for testing if possible

### Performance Testing

1. **Start Small** - Begin with single user tests before stress testing
2. **Monitor Resources** - Watch for memory leaks during stress tests
3. **Gradual Load Increase** - Increase load gradually to find breaking points

### Security Considerations

1. **Test Credentials** - Use dedicated test credentials, not production data
2. **Environment Isolation** - Keep test environment separate from production
3. **Cleanup Sensitive Data** - Ensure test data doesn't contain real user information

## Integration with CI/CD

To integrate testing into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run User Creation Tests
  run: |
    npm install
    npm run test:users
  env:
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

## Support

If you encounter issues with the testing suite:

1. Check the console logs for detailed error messages
2. Verify all environment variables are correctly set
3. Ensure Supabase project is properly configured
4. Review the troubleshooting section above
5. Check Supabase dashboard for any service issues
