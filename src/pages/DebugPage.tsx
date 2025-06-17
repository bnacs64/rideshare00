import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { runDiagnostics } from '../utils/testConnection'
import { useAuth } from '../contexts/AuthContext'
import { uberService } from '../services/uberService'
import { telegramService } from '../services/telegramService'

export const DebugPage: React.FC = () => {
  const { user, loading } = useAuth()
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [testResults, setTestResults] = useState<any>(null)
  const [apiTests, setApiTests] = useState<any>(null)

  useEffect(() => {
    runDiagnostics().then(setDiagnostics)
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  const testUserQuery = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(5)

      setTestResults({ data, error })
    } catch (error) {
      setTestResults({ data: null, error })
    }
  }

  const testAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      setTestResults({ user, error, type: 'auth' })
    } catch (error) {
      setTestResults({ user: null, error, type: 'auth' })
    }
  }

  const testUberAPI = async () => {
    try {
      setApiTests({ ...apiTests, uber: { status: 'testing', message: 'Testing Uber API...' } })

      // Test Uber API with sample coordinates (NSU to Dhanmondi)
      const startPoint = { latitude: 23.8103, longitude: 90.4125 } // NSU
      const endPoint = { latitude: 23.7461, longitude: 90.3742 } // Dhanmondi
      const waypoints: Array<{ latitude: number; longitude: number; id?: string }> = []

      const result = await uberService.optimizeRoute(startPoint, endPoint, waypoints)

      setApiTests({
        ...apiTests,
        uber: {
          status: result.error ? 'error' : 'success',
          message: result.error ? result.error : 'Route optimization working correctly',
          data: result.error ? null : result.result
        }
      })
    } catch (error) {
      setApiTests({
        ...apiTests,
        uber: {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          data: null
        }
      })
    }
  }

  const testTelegramAPI = async () => {
    try {
      setApiTests({ ...apiTests, telegram: { status: 'testing', message: 'Testing Telegram API...' } })

      // Test Telegram bot info
      const result = await telegramService.getBotInfo()

      setApiTests({
        ...apiTests,
        telegram: {
          status: result.bot ? 'success' : 'error',
          message: result.bot ? `Bot connected: @${result.bot.username}` : result.error,
          data: result.bot ? result.bot : null
        }
      })
    } catch (error) {
      setApiTests({
        ...apiTests,
        telegram: {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          data: null
        }
      })
    }
  }

  const testAllAPIs = async () => {
    setApiTests({})
    await Promise.all([
      testUberAPI(),
      testTelegramAPI()
    ])
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Debug Information</h1>
          <p className="mt-2 text-gray-600">
            Diagnostic information for troubleshooting authentication issues
          </p>
        </div>

        {/* Auth Context Status */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Auth Context Status</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Loading:</span>
              <span className={loading ? 'text-yellow-600' : 'text-green-600'}>
                {loading ? 'True (SPINNING)' : 'False'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">User:</span>
              <span className={user ? 'text-green-600' : 'text-red-600'}>
                {user ? 'Authenticated' : 'Not authenticated'}
              </span>
            </div>
            {user && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <pre className="text-xs">{JSON.stringify(user, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        {/* System Overview */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl mb-2 ${diagnostics?.connection ? 'text-green-600' : 'text-red-600'}`}>
                {diagnostics?.connection ? '✅' : '❌'}
              </div>
              <div className="text-sm font-medium text-gray-900">Database</div>
              <div className="text-xs text-gray-500">
                {diagnostics?.connection ? 'Connected' : 'Failed'}
              </div>
            </div>
            <div className="text-center">
              <div className={`text-2xl mb-2 ${
                apiTests?.uber?.status === 'success' ? 'text-green-600' :
                apiTests?.uber?.status === 'error' ? 'text-red-600' : 'text-gray-400'
              }`}>
                {apiTests?.uber?.status === 'success' ? '✅' :
                 apiTests?.uber?.status === 'error' ? '❌' : '⚪'}
              </div>
              <div className="text-sm font-medium text-gray-900">Uber API</div>
              <div className="text-xs text-gray-500">
                {apiTests?.uber?.status === 'success' ? 'Working' :
                 apiTests?.uber?.status === 'error' ? 'Failed' : 'Not tested'}
              </div>
            </div>
            <div className="text-center">
              <div className={`text-2xl mb-2 ${
                apiTests?.telegram?.status === 'success' ? 'text-green-600' :
                apiTests?.telegram?.status === 'error' ? 'text-red-600' : 'text-gray-400'
              }`}>
                {apiTests?.telegram?.status === 'success' ? '✅' :
                 apiTests?.telegram?.status === 'error' ? '❌' : '⚪'}
              </div>
              <div className="text-sm font-medium text-gray-900">Telegram</div>
              <div className="text-xs text-gray-500">
                {apiTests?.telegram?.status === 'success' ? 'Working' :
                 apiTests?.telegram?.status === 'error' ? 'Failed' : 'Not tested'}
              </div>
            </div>
            <div className="text-center">
              <div className={`text-2xl mb-2 ${user ? 'text-green-600' : 'text-red-600'}`}>
                {user ? '✅' : '❌'}
              </div>
              <div className="text-sm font-medium text-gray-900">Authentication</div>
              <div className="text-xs text-gray-500">
                {user ? 'Logged in' : 'Not authenticated'}
              </div>
            </div>
          </div>
        </div>

        {/* Supabase Session */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Supabase Session</h2>
          {session ? (
            <div className="p-3 bg-gray-50 rounded">
              <pre className="text-xs">{JSON.stringify(session, null, 2)}</pre>
            </div>
          ) : (
            <p className="text-gray-500">No active session</p>
          )}
        </div>

        {/* Diagnostics */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Diagnostics</h2>
          {diagnostics ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Connection:</span>
                <span className={diagnostics.connection ? 'text-green-600' : 'text-red-600'}>
                  {diagnostics.connection ? '✅ OK' : '❌ FAILED'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Database Tables:</span>
                <span className={diagnostics.tables ? 'text-green-600' : 'text-red-600'}>
                  {diagnostics.tables ? '✅ OK' : '❌ FAILED'}
                </span>
              </div>
              {diagnostics.tableError && (
                <div className="mt-2 p-3 bg-red-50 rounded">
                  <p className="text-sm text-red-700">Table Error: {diagnostics.tableError}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Running diagnostics...</p>
          )}
        </div>

        {/* Environment Variables */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Environment Variables</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">VITE_SUPABASE_URL:</span>
              <span className={import.meta.env.VITE_SUPABASE_URL ? 'text-green-600' : 'text-red-600'}>
                {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">VITE_SUPABASE_ANON_KEY:</span>
              <span className={import.meta.env.VITE_SUPABASE_ANON_KEY ? 'text-green-600' : 'text-red-600'}>
                {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">VITE_BYPASS_EMAIL_VALIDATION:</span>
              <span className="text-blue-600">
                {import.meta.env.VITE_BYPASS_EMAIL_VALIDATION || 'false'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">VITE_TELEGRAM_BOT_TOKEN:</span>
              <span className={import.meta.env.VITE_TELEGRAM_BOT_TOKEN ? 'text-green-600' : 'text-red-600'}>
                {import.meta.env.VITE_TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">VITE_GOOGLE_MAPS_API_KEY:</span>
              <span className={import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'text-green-600' : 'text-red-600'}>
                {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">VITE_UBER_CLIENT_ID:</span>
              <span className={import.meta.env.VITE_UBER_CLIENT_ID ? 'text-green-600' : 'text-red-600'}>
                {import.meta.env.VITE_UBER_CLIENT_ID ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">VITE_UBER_CLIENT_SECRET:</span>
              <span className={import.meta.env.VITE_UBER_CLIENT_SECRET ? 'text-green-600' : 'text-red-600'}>
                {import.meta.env.VITE_UBER_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
          </div>
        </div>

        {/* API Tests */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">External API Tests</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Uber API Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Uber API</h3>
              {apiTests?.uber ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span className={
                      apiTests.uber.status === 'success' ? 'text-green-600' :
                      apiTests.uber.status === 'error' ? 'text-red-600' : 'text-yellow-600'
                    }>
                      {apiTests.uber.status === 'success' ? '✅ Working' :
                       apiTests.uber.status === 'error' ? '❌ Failed' : '🔄 Testing...'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {apiTests.uber.message}
                  </div>
                  {apiTests.uber.data && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <pre>{JSON.stringify(apiTests.uber.data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Not tested yet</p>
              )}
            </div>

            {/* Telegram API Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Telegram Bot API</h3>
              {apiTests?.telegram ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span className={
                      apiTests.telegram.status === 'success' ? 'text-green-600' :
                      apiTests.telegram.status === 'error' ? 'text-red-600' : 'text-yellow-600'
                    }>
                      {apiTests.telegram.status === 'success' ? '✅ Working' :
                       apiTests.telegram.status === 'error' ? '❌ Failed' : '🔄 Testing...'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {apiTests.telegram.message}
                  </div>
                  {apiTests.telegram.data && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <pre>{JSON.stringify(apiTests.telegram.data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Not tested yet</p>
              )}
            </div>
          </div>

          <div className="space-x-4">
            <button
              onClick={testAllAPIs}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Test All APIs
            </button>
            <button
              onClick={testUberAPI}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Test Uber API
            </button>
            <button
              onClick={testTelegramAPI}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Test Telegram API
            </button>
          </div>
        </div>

        {/* Database Tests */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Database Tests</h2>
          <div className="space-x-4">
            <button
              onClick={testUserQuery}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Test Users Table Query
            </button>
            <button
              onClick={testAuth}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Test Auth Status
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Reload Page
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
            <div className="p-3 bg-gray-50 rounded">
              <pre className="text-xs">{JSON.stringify(testResults, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
