import { supabase } from '../services/supabase'

export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...')

    // Test basic connection with a simple query
    const { error } = await supabase.auth.getSession()

    if (error) {
      console.error('Supabase connection error:', error)
      return false
    }

    console.log('✅ Supabase connection successful!')
    return true
  } catch (error) {
    console.error('❌ Supabase connection failed:', error)
    return false
  }
}
