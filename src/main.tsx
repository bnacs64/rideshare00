import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Test Supabase connection on app start
import { testSupabaseConnection } from './utils/testConnection'

// Test connection when app loads
testSupabaseConnection().then(success => {
  if (success) {
    console.log('✅ Supabase connection test passed')
  } else {
    console.error('❌ Supabase connection test failed - check your environment variables')
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
