import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  action: 'enable_bypass' | 'disable_bypass' | 'get_status' | 'add_domain' | 'remove_domain'
  domain?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { action, domain }: RequestBody = await req.json()

    switch (action) {
      case 'enable_bypass': {
        console.log('🔓 Enabling email validation bypass...')
        
        // Update the settings table
        const { error: updateError } = await supabaseClient
          .from('email_validation_settings')
          .update({ 
            bypass_enabled: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', 1)

        if (updateError) {
          throw updateError
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Email validation bypass enabled',
            bypass_enabled: true
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      case 'disable_bypass': {
        console.log('🔒 Disabling email validation bypass...')
        
        // Update the settings table
        const { error: updateError } = await supabaseClient
          .from('email_validation_settings')
          .update({ 
            bypass_enabled: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', 1)

        if (updateError) {
          throw updateError
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Email validation bypass disabled',
            bypass_enabled: false
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      case 'get_status': {
        // Get current settings
        const { data: settings, error: fetchError } = await supabaseClient
          .from('email_validation_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        if (fetchError) {
          throw fetchError
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            bypass_enabled: settings?.bypass_enabled || false,
            allowed_domains: settings?.allowed_domains || ['@northsouth.edu'],
            updated_at: settings?.updated_at
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      case 'add_domain': {
        if (!domain) {
          throw new Error('Domain is required for add_domain action')
        }

        console.log(`➕ Adding domain: ${domain}`)

        // Get current settings
        const { data: currentSettings, error: fetchError } = await supabaseClient
          .from('email_validation_settings')
          .select('allowed_domains')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        if (fetchError) {
          throw fetchError
        }

        const currentDomains = currentSettings?.allowed_domains || ['@northsouth.edu']
        const newDomains = [...new Set([...currentDomains, domain])] // Remove duplicates

        // Update the settings
        const { error: updateError } = await supabaseClient
          .from('email_validation_settings')
          .update({ 
            allowed_domains: newDomains,
            updated_at: new Date().toISOString()
          })
          .eq('id', 1)

        if (updateError) {
          throw updateError
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Domain ${domain} added to allowed list`,
            allowed_domains: newDomains
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      case 'remove_domain': {
        if (!domain) {
          throw new Error('Domain is required for remove_domain action')
        }

        console.log(`➖ Removing domain: ${domain}`)

        // Get current settings
        const { data: currentSettings, error: fetchError } = await supabaseClient
          .from('email_validation_settings')
          .select('allowed_domains')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        if (fetchError) {
          throw fetchError
        }

        const currentDomains = currentSettings?.allowed_domains || ['@northsouth.edu']
        const newDomains = currentDomains.filter(d => d !== domain)

        // Ensure @northsouth.edu is always included
        if (!newDomains.includes('@northsouth.edu')) {
          newDomains.push('@northsouth.edu')
        }

        // Update the settings
        const { error: updateError } = await supabaseClient
          .from('email_validation_settings')
          .update({ 
            allowed_domains: newDomains,
            updated_at: new Date().toISOString()
          })
          .eq('id', 1)

        if (updateError) {
          throw updateError
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Domain ${domain} removed from allowed list`,
            allowed_domains: newDomains
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      default: {
        throw new Error(`Unknown action: ${action}`)
      }
    }

  } catch (error) {
    console.error('Error in manage-email-validation function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

/* Usage Examples:

1. Enable bypass for testing:
curl -X POST https://your-project.supabase.co/functions/v1/manage-email-validation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "enable_bypass"}'

2. Disable bypass for production:
curl -X POST https://your-project.supabase.co/functions/v1/manage-email-validation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "disable_bypass"}'

3. Get current status:
curl -X POST https://your-project.supabase.co/functions/v1/manage-email-validation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "get_status"}'

4. Add a testing domain:
curl -X POST https://your-project.supabase.co/functions/v1/manage-email-validation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "add_domain", "domain": "@akshathe.xyz"}'

5. Remove a domain:
curl -X POST https://your-project.supabase.co/functions/v1/manage-email-validation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "remove_domain", "domain": "@akshathe.xyz"}'

*/
