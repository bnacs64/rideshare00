import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { LoadingSpinner } from '../components/LoadingSpinner'

interface CronJob {
  jobname: string
  schedule: string
  command: string
  active: boolean
  jobid: number
}

interface SystemHealth {
  component: string
  total_count: number
  pending_count: number
  matched_count: number
  failed_count: number
  retried_count: number
}

export const SystemAutomationPage: React.FC = () => {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([])
  const [loading, setLoading] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [triggerResults, setTriggerResults] = useState<any>(null)

  // Manual trigger form state
  const [selectedFunction, setSelectedFunction] = useState('scheduled-opt-ins')
  const [triggerParams, setTriggerParams] = useState('{}')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch cron job status
      const { data: cronData, error: cronError } = await supabase
        .from('cron_job_status')
        .select('*')

      if (cronError) {
        console.error('Error fetching cron jobs:', cronError)
        setError('Failed to fetch cron job status')
      } else {
        setCronJobs(cronData || [])
      }

      // Fetch system health
      const { data: healthData, error: healthError } = await supabase
        .from('system_health_status')
        .select('*')

      if (healthError) {
        console.error('Error fetching system health:', healthError)
        setError('Failed to fetch system health status')
      } else {
        setSystemHealth(healthData || [])
      }

    } catch (err) {
      console.error('Error fetching data:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const triggerFunction = async () => {
    setTriggering(true)
    setError(null)
    setTriggerResults(null)

    try {
      let params = {}
      try {
        params = JSON.parse(triggerParams)
      } catch (parseError) {
        setError('Invalid JSON in parameters')
        return
      }

      const { data, error } = await supabase.rpc('manual_trigger_scheduled_function', {
        function_type: selectedFunction,
        parameters: params
      })

      if (error) {
        console.error('Error triggering function:', error)
        setError(`Failed to trigger function: ${error.message}`)
      } else {
        setTriggerResults(data)
        // Refresh data after triggering
        await fetchData()
      }

    } catch (err) {
      console.error('Error in triggerFunction:', err)
      setError('An unexpected error occurred while triggering function')
    } finally {
      setTriggering(false)
    }
  }

  const getHealthColor = (component: string, count: number, total: number) => {
    if (total === 0) return 'text-gray-500'
    
    const percentage = (count / total) * 100
    
    if (component === 'failed_count' && percentage > 20) return 'text-red-600'
    if (component === 'pending_count' && percentage > 50) return 'text-yellow-600'
    if (component === 'matched_count' && percentage > 70) return 'text-green-600'
    
    return 'text-gray-700'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Automation & Monitoring</h1>
          <p className="mt-2 text-gray-600">
            Monitor scheduled functions, cron jobs, and system health
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

        {/* System Health Overview */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">System Health Status</h2>
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? <LoadingSpinner /> : 'Refresh'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {systemHealth.map((health) => (
              <div key={health.component} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">{health.component}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total:</span>
                    <span className="text-sm font-medium text-gray-900">{health.total_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Pending:</span>
                    <span className={`text-sm font-medium ${getHealthColor('pending_count', health.pending_count, health.total_count)}`}>
                      {health.pending_count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Matched/Active:</span>
                    <span className={`text-sm font-medium ${getHealthColor('matched_count', health.matched_count, health.total_count)}`}>
                      {health.matched_count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Failed:</span>
                    <span className={`text-sm font-medium ${getHealthColor('failed_count', health.failed_count, health.total_count)}`}>
                      {health.failed_count}
                    </span>
                  </div>
                  {health.retried_count > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Retried:</span>
                      <span className="text-sm font-medium text-orange-600">{health.retried_count}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cron Jobs Status */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Scheduled Cron Jobs</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Command
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cronJobs.map((job) => (
                  <tr key={job.jobid}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {job.jobname}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.schedule}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        job.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {job.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {job.command}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {cronJobs.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No cron jobs found
              </div>
            )}
          </div>
        </div>

        {/* Manual Function Trigger */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Manual Function Trigger</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="function-select" className="block text-sm font-medium text-gray-700">
                Function Type
              </label>
              <select
                id="function-select"
                value={selectedFunction}
                onChange={(e) => setSelectedFunction(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="scheduled-opt-ins">Create Scheduled Opt-ins</option>
                <option value="daily-matching">Run Daily Matching</option>
                <option value="retry-failed-matches">Retry Failed Matches</option>
                <option value="cleanup-expired-data">Cleanup Expired Data</option>
                <option value="send-notifications">Send Notifications</option>
              </select>
            </div>

            <div>
              <label htmlFor="trigger-params" className="block text-sm font-medium text-gray-700">
                Parameters (JSON)
              </label>
              <textarea
                id="trigger-params"
                rows={3}
                value={triggerParams}
                onChange={(e) => setTriggerParams(e.target.value)}
                placeholder='{"dryRun": true, "date": "2024-01-01"}'
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter JSON parameters for the function. Use {'"dryRun": true'} for testing.
              </p>
            </div>

            <button
              onClick={triggerFunction}
              disabled={triggering}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {triggering ? <LoadingSpinner /> : 'Trigger Function'}
            </button>
          </div>
        </div>

        {/* Trigger Results */}
        {triggerResults && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Function Results</h2>
            <div className="bg-gray-50 rounded-md p-4">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(triggerResults, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
