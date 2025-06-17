import { supabase } from '../services/supabase'

export interface EmailValidationStatus {
  bypass_enabled: boolean
  allowed_domains: string[]
  updated_at?: string
}

export interface EmailValidationResponse {
  success: boolean
  message?: string
  error?: string
  bypass_enabled?: boolean
  allowed_domains?: string[]
}

/**
 * Email Validation Manager
 * Provides utilities to manage email domain validation at the database level
 */
export class EmailValidationManager {
  private static readonly FUNCTION_URL = '/functions/v1/manage-email-validation'

  /**
   * Enable email validation bypass for testing
   */
  static async enableBypass(): Promise<EmailValidationResponse> {
    try {
      console.log('🔓 Enabling email validation bypass...')
      
      const { data, error } = await supabase.functions.invoke('manage-email-validation', {
        body: { action: 'enable_bypass' }
      })

      if (error) {
        throw error
      }

      console.log('✅ Email validation bypass enabled')
      return data
    } catch (error) {
      console.error('❌ Failed to enable email validation bypass:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Disable email validation bypass (production mode)
   */
  static async disableBypass(): Promise<EmailValidationResponse> {
    try {
      console.log('🔒 Disabling email validation bypass...')
      
      const { data, error } = await supabase.functions.invoke('manage-email-validation', {
        body: { action: 'disable_bypass' }
      })

      if (error) {
        throw error
      }

      console.log('✅ Email validation bypass disabled')
      return data
    } catch (error) {
      console.error('❌ Failed to disable email validation bypass:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get current email validation status
   */
  static async getStatus(): Promise<EmailValidationStatus | null> {
    try {
      const { data, error } = await supabase.functions.invoke('manage-email-validation', {
        body: { action: 'get_status' }
      })

      if (error) {
        throw error
      }

      return {
        bypass_enabled: data.bypass_enabled,
        allowed_domains: data.allowed_domains,
        updated_at: data.updated_at
      }
    } catch (error) {
      console.error('❌ Failed to get email validation status:', error)
      return null
    }
  }

  /**
   * Add a domain to the allowed list
   */
  static async addDomain(domain: string): Promise<EmailValidationResponse> {
    try {
      console.log(`➕ Adding domain: ${domain}`)
      
      // Ensure domain starts with @
      const normalizedDomain = domain.startsWith('@') ? domain : `@${domain}`
      
      const { data, error } = await supabase.functions.invoke('manage-email-validation', {
        body: { action: 'add_domain', domain: normalizedDomain }
      })

      if (error) {
        throw error
      }

      console.log(`✅ Domain ${normalizedDomain} added to allowed list`)
      return data
    } catch (error) {
      console.error(`❌ Failed to add domain ${domain}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Remove a domain from the allowed list
   */
  static async removeDomain(domain: string): Promise<EmailValidationResponse> {
    try {
      console.log(`➖ Removing domain: ${domain}`)
      
      // Ensure domain starts with @
      const normalizedDomain = domain.startsWith('@') ? domain : `@${domain}`
      
      // Prevent removal of @northsouth.edu
      if (normalizedDomain === '@northsouth.edu') {
        return {
          success: false,
          error: 'Cannot remove @northsouth.edu domain'
        }
      }
      
      const { data, error } = await supabase.functions.invoke('manage-email-validation', {
        body: { action: 'remove_domain', domain: normalizedDomain }
      })

      if (error) {
        throw error
      }

      console.log(`✅ Domain ${normalizedDomain} removed from allowed list`)
      return data
    } catch (error) {
      console.error(`❌ Failed to remove domain ${domain}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Check if email validation bypass is currently enabled
   */
  static async isBypassEnabled(): Promise<boolean> {
    const status = await this.getStatus()
    return status?.bypass_enabled || false
  }

  /**
   * Check if a domain is currently allowed
   */
  static async isDomainAllowed(domain: string): Promise<boolean> {
    const status = await this.getStatus()
    if (!status) return false

    const normalizedDomain = domain.startsWith('@') ? domain : `@${domain}`
    return status.allowed_domains.includes(normalizedDomain)
  }

  /**
   * Setup testing environment (enable bypass and add common testing domains)
   */
  static async setupTesting(): Promise<EmailValidationResponse> {
    try {
      console.log('🧪 Setting up testing environment...')
      
      // Enable bypass
      const bypassResult = await this.enableBypass()
      if (!bypassResult.success) {
        return bypassResult
      }

      // Add common testing domains
      const testingDomains = ['@akshathe.xyz', '@example.com', '@test.com', '@localhost']
      
      for (const domain of testingDomains) {
        const addResult = await this.addDomain(domain)
        if (!addResult.success) {
          console.warn(`⚠️ Failed to add testing domain ${domain}:`, addResult.error)
        }
      }

      console.log('✅ Testing environment setup complete')
      return {
        success: true,
        message: 'Testing environment setup complete',
        bypass_enabled: true
      }
    } catch (error) {
      console.error('❌ Failed to setup testing environment:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Setup production environment (disable bypass and ensure only NSU domain)
   */
  static async setupProduction(): Promise<EmailValidationResponse> {
    try {
      console.log('🏭 Setting up production environment...')
      
      // Disable bypass
      const bypassResult = await this.disableBypass()
      if (!bypassResult.success) {
        return bypassResult
      }

      console.log('✅ Production environment setup complete')
      return {
        success: true,
        message: 'Production environment setup complete',
        bypass_enabled: false
      }
    } catch (error) {
      console.error('❌ Failed to setup production environment:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get a user-friendly status message
   */
  static async getStatusMessage(): Promise<string> {
    const status = await this.getStatus()
    if (!status) {
      return 'Unable to determine email validation status'
    }

    if (status.bypass_enabled) {
      return `🔓 Email validation bypass is ENABLED. Allowed domains: ${status.allowed_domains.join(', ')}`
    } else {
      return `🔒 Email validation is ENFORCED. Allowed domains: ${status.allowed_domains.join(', ')}`
    }
  }
}

// Export convenience functions
export const enableEmailBypass = () => EmailValidationManager.enableBypass()
export const disableEmailBypass = () => EmailValidationManager.disableBypass()
export const getEmailValidationStatus = () => EmailValidationManager.getStatus()
export const setupTestingEnvironment = () => EmailValidationManager.setupTesting()
export const setupProductionEnvironment = () => EmailValidationManager.setupProduction()
export const isEmailBypassEnabled = () => EmailValidationManager.isBypassEnabled()
export const getEmailStatusMessage = () => EmailValidationManager.getStatusMessage()
