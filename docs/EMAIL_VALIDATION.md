# Email Validation Configuration

This document explains how to configure email domain validation for the NSU Commute application.

## Overview

By default, NSU Commute requires users to register with an NSU email address (`@northsouth.edu`). However, for development and testing purposes, you can bypass this validation to allow any email domain.

## Environment Variables

### `VITE_NSU_EMAIL_DOMAIN`
- **Description**: The required email domain for user registration
- **Default**: `@northsouth.edu`
- **Example**: `@akshathe.xyz` (for testing with custom domains)

### `VITE_BYPASS_EMAIL_VALIDATION`
- **Description**: Whether to bypass email domain validation
- **Default**: `false`
- **Values**: `true` | `false`
- **Purpose**: Allows any valid email format when set to `true`

## Configuration Examples

### Production Configuration
```env
VITE_NSU_EMAIL_DOMAIN=@northsouth.edu
VITE_BYPASS_EMAIL_VALIDATION=false
```

### Development/Testing Configuration
```env
VITE_NSU_EMAIL_DOMAIN=@akshathe.xyz
VITE_BYPASS_EMAIL_VALIDATION=true
```

## How It Works

### When `VITE_BYPASS_EMAIL_VALIDATION=false` (Production)
- Users must register with emails ending in `VITE_NSU_EMAIL_DOMAIN`
- Email validation is enforced at multiple levels:
  - Frontend form validation
  - Authentication context validation
  - Backend service validation
- Error messages guide users to use the correct domain

### When `VITE_BYPASS_EMAIL_VALIDATION=true` (Development)
- Any valid email format is accepted (e.g., `test@gmail.com`, `user@example.com`)
- Visual indicators show "Dev Mode" in the UI
- Console logs indicate when validation is bypassed
- Email field labels and placeholders adjust accordingly

## Visual Indicators

When bypass mode is enabled, the application shows:

1. **Header Badge**: "Dev Mode" badge in the navigation header
2. **Form Labels**: Email fields show "(Dev Mode: Any email accepted)"
3. **Placeholders**: Generic email placeholders like `your.email@example.com`
4. **Console Logs**: Debug messages indicating bypass status

## Security Considerations

⚠️ **Important**: Always ensure `VITE_BYPASS_EMAIL_VALIDATION=false` in production environments.

The bypass feature is intended only for:
- Local development
- Testing environments
- Demo purposes
- Custom domain testing

## Implementation Details

The email validation bypass is implemented across multiple layers:

### Frontend Components
- `RegisterPage.tsx`: Dynamic form labels and validation
- `LoginPage.tsx`: Adjusted placeholders and labels
- `HomePage.tsx`: Development mode indicator

### Services
- `userService.ts`: Email validation logic with bypass
- `AuthContext.tsx`: Authentication flow with bypass support

### Utilities
- `emailValidation.ts`: Centralized validation utilities

## Testing

To test the bypass functionality:

1. Set `VITE_BYPASS_EMAIL_VALIDATION=true` in your `.env` file
2. Restart the development server
3. Navigate to the registration page
4. Verify you can register with any email format (e.g., `test@gmail.com`)
5. Check for "Dev Mode" indicators in the UI

## Troubleshooting

### Bypass not working?
- Ensure the environment variable is set to exactly `true` (lowercase)
- Restart the development server after changing `.env`
- Check browser console for bypass confirmation logs

### Still seeing domain validation errors?
- Verify the `.env` file is in the project root
- Check that no cached environment variables are interfering
- Ensure you're not in production mode

## Related Files

- `.env.example` - Example environment configuration
- `src/utils/emailValidation.ts` - Email validation utilities
- `src/services/userService.ts` - User service with validation
- `src/contexts/AuthContext.tsx` - Authentication context
- `src/pages/RegisterPage.tsx` - Registration form
- `src/pages/LoginPage.tsx` - Login form
