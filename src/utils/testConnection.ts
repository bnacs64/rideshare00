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

export const testDatabaseTables = async () => {
  try {
    console.log('Testing database tables...')

    // Test if users table exists and is accessible
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (error) {
      console.error('❌ Users table test failed:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Users table accessible!')
    return { success: true, error: null }
  } catch (error) {
    console.error('❌ Database table test failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export const runDiagnostics = async () => {
  console.log('🔍 Running Supabase diagnostics...')

  const connectionTest = await testSupabaseConnection()
  const tableTest = await testDatabaseTables()

  console.log('📊 Diagnostic Results:')
  console.log('- Connection:', connectionTest ? '✅ OK' : '❌ FAILED')
  console.log('- Database Tables:', tableTest.success ? '✅ OK' : `❌ FAILED: ${tableTest.error}`)

  return {
    connection: connectionTest,
    tables: tableTest.success,
    tableError: tableTest.error
  }
}
