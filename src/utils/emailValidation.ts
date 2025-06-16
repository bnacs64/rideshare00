/**
 * Email validation utilities for NSU Commute
 * Handles both production NSU email validation and development bypass
 */

export interface EmailValidationConfig {
  bypassValidation: boolean
  emailDomain: string
  isDevelopment: boolean
}

/**
 * Get email validation configuration from environment variables
 */
export function getEmailValidationConfig(): EmailValidationConfig {
  const bypassValidation = import.meta.env.VITE_BYPASS_EMAIL_VALIDATION === 'true'
  const emailDomain = import.meta.env.VITE_NSU_EMAIL_DOMAIN || '@northsouth.edu'
  const isDevelopment = import.meta.env.DEV || false

  return {
    bypassValidation,
    emailDomain,
    isDevelopment
  }
}

/**
 * Validate email based on current configuration
 */
export function validateEmail(email: string): { isValid: boolean; message?: string } {
  const config = getEmailValidationConfig()
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      message: 'Please enter a valid email address'
    }
  }

  // If bypass is enabled, accept any valid email format
  if (config.bypassValidation) {
    console.log('🔓 Email domain validation bypassed for development/testing')
    return { isValid: true }
  }

  // Check domain requirement
  if (!email.toLowerCase().endsWith(config.emailDomain.toLowerCase())) {
    return {
      isValid: false,
      message: `Please use your NSU email address (${config.emailDomain})`
    }
  }

  return { isValid: true }
}

/**
 * Get appropriate email placeholder text
 */
export function getEmailPlaceholder(): string {
  const config = getEmailValidationConfig()
  
  if (config.bypassValidation) {
    return 'your.email@example.com'
  }
  
  return `your.email${config.emailDomain}`
}

/**
 * Get appropriate email field label
 */
export function getEmailLabel(): string {
  const config = getEmailValidationConfig()
  
  if (config.bypassValidation) {
    return 'Email Address'
  }
  
  return 'NSU Email Address'
}

/**
 * Get development mode indicator text
 */
export function getDevModeIndicator(): string | null {
  const config = getEmailValidationConfig()
  
  if (config.bypassValidation) {
    return '(Dev Mode: Any email accepted)'
  }
  
  return null
}
