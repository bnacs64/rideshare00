import React, { useEffect, useState } from 'react'
import { useScheduledOptInAutomation } from '../hooks/useScheduledOptInAutomation'
import { LoadingSpinner } from '../components/LoadingSpinner'

export const ScheduledOptInAutomationPage: React.FC = () => {
  const {
    summary,
    recentOptIns,
    loading,
    triggering,
    error,
    triggerScheduledOptIns,
    refreshData
  } = useScheduledOptInAutomation()

  const [testDate, setTestDate] = useState('')
  const [testResult, setTestResult] = useState<any>(null)
  const [showTestResult, setShowTestResult] = useState(false)

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const handleTestTrigger = async (dryRun: boolean = true) => {
    const result = await triggerScheduledOptIns(testDate || undefined, dryRun)
    setTestResult(result)
    setShowTestResult(true)
  }

  const handleManualTrigger = async () => {
    if (confirm('Are you sure you want to manually trigger scheduled opt-ins creation? This will create actual opt-ins.')) {
      const result = await triggerScheduledOptIns(testDate || undefined, false)
      setTestResult(result)
      setShowTestResult(true)
    }
  }

  const getNextBusinessDay = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // Skip weekends
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1)
    }
    
    return tomorrow.toISOString().split('T')[0]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Scheduled Opt-in Automation</h1>
          <p className="mt-2 text-gray-600">
            Monitor and manage automatic daily opt-in creation from scheduled opt-ins
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Manual Trigger Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Manual Trigger</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="test-date" className="block text-sm font-medium text-gray-700">
                Target Date (optional, defaults to next business day)
              </label>
              <input
                type="date"
                id="test-date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={getNextBusinessDay()}
              />
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => handleTestTrigger(true)}
                disabled={triggering}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {triggering ? 'Testing...' : 'Test (Dry Run)'}
              </button>
              
              <button
                onClick={handleManualTrigger}
                disabled={triggering}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {triggering ? 'Creating...' : 'Create Opt-ins'}
              </button>
              
              <button
                onClick={refreshData}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* Test Result */}
        {showTestResult && testResult && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Test Result</h2>
              <button
                onClick={() => setShowTestResult(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className={`p-4 rounded-md ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="text-sm">
                <div className="font-medium mb-2">
                  {testResult.success ? '✅ Success' : '❌ Failed'}
                </div>
                
                {testResult.success && (
                  <div className="space-y-1">
                    <div>Date: {testResult.date}</div>
                    <div>Day of Week: {testResult.dayOfWeek}</div>
                    <div>Total Scheduled: {testResult.totalScheduled}</div>
                    <div>Created: {testResult.created}</div>
                    <div>Skipped: {testResult.skipped}</div>
                    {testResult.errors && testResult.errors.length > 0 && (
                      <div>Errors: {testResult.errors.join(', ')}</div>
                    )}
                  </div>
                )}
                
                {testResult.error && (
                  <div className="text-red-700">Error: {testResult.error}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scheduled Opt-ins Summary */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Scheduled Opt-ins by Day</h2>
          
          {summary.length === 0 ? (
            <p className="text-gray-500">No scheduled opt-ins found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Day of Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Active
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inactive
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summary.map((day) => (
                    <tr key={day.day_of_week}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {day.day_of_week}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {day.total_scheduled}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {day.active_scheduled}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {day.inactive_scheduled}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {day.users.slice(0, 3).join(', ')}
                        {day.users.length > 3 && ` +${day.users.length - 3} more`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Automatic Opt-ins */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Automatic Opt-ins</h2>
          
          {recentOptIns.length === 0 ? (
            <p className="text-gray-500">No recent automatic opt-ins found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pending
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Matched
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cancelled
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentOptIns.map((optIn) => (
                    <tr key={optIn.commute_date}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {optIn.commute_date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {optIn.total_created}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                        {optIn.pending_match}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {optIn.matched}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {optIn.cancelled}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {optIn.users.slice(0, 3).join(', ')}
                        {optIn.users.length > 3 && ` +${optIn.users.length - 3} more`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
