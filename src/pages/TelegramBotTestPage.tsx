import React, { useState, useEffect } from 'react'
import { telegramService } from '../services/telegramService'
import { notificationService } from '../services/notificationService'
import { useRealTimeNotifications } from '../hooks/useRealTimeNotifications'
import { LoadingSpinner } from '../components/LoadingSpinner'

export const TelegramBotTestPage: React.FC = () => {
  const {
    activities,
    loading: activitiesLoading,
    sending,
    error: notificationError,
    sendTestNotification,
    refreshActivities,
    subscriptionStatus
  } = useRealTimeNotifications()

  const [loading, setLoading] = useState(false)
  const [botInfo, setBotInfo] = useState<any>(null)
  const [testResults, setTestResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Test form data
  const [testChatId, setTestChatId] = useState('')
  const [testMessage, setTestMessage] = useState('Hello from NSU Commute! 🚗')
  const [testRideId, setTestRideId] = useState('')

  useEffect(() => {
    fetchBotInfo()
  }, [])

  const fetchBotInfo = async () => {
    setLoading(true)
    setError(null)

    try {
      const { bot, error: botError } = await telegramService.getBotInfo()
      
      if (botError) {
        setError(botError)
      } else {
        setBotInfo(bot)
      }
    } catch (err) {
      console.error('Error fetching bot info:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testSendMessage = async () => {
    if (!testChatId || !testMessage) {
      setError('Please enter both chat ID and message')
      return
    }

    setLoading(true)
    setError(null)
    setTestResults(null)

    try {
      const result = await telegramService.sendMessage(
        parseInt(testChatId),
        testMessage,
        { parse_mode: 'HTML' }
      )

      setTestResults({
        type: 'sendMessage',
        result
      })

    } catch (err) {
      console.error('Error sending test message:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testRideMatchNotification = async () => {
    if (!testChatId) {
      setError('Please enter chat ID')
      return
    }

    setLoading(true)
    setError(null)
    setTestResults(null)

    try {
      const result = await telegramService.sendRideMatchNotification(
        parseInt(testChatId),
        {
          ride_id: testRideId || 'test-ride-123',
          driver_name: 'John Doe',
          pickup_time: '8:00 AM',
          pickup_location: 'Dhanmondi 27',
          cost_per_person: 120,
          participants: ['Alice Smith', 'Bob Johnson']
        }
      )

      setTestResults({
        type: 'rideMatchNotification',
        result
      })

    } catch (err) {
      console.error('Error sending ride match notification:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testRideConfirmationNotification = async () => {
    if (!testChatId) {
      setError('Please enter chat ID')
      return
    }

    setLoading(true)
    setError(null)
    setTestResults(null)

    try {
      const result = await telegramService.sendRideConfirmationNotification(
        parseInt(testChatId),
        {
          ride_id: testRideId || 'test-ride-123',
          driver_name: 'John Doe',
          driver_phone: '+8801234567890',
          pickup_time: '8:00 AM',
          pickup_location: 'Dhanmondi 27',
          participants: ['Alice Smith', 'Bob Johnson']
        }
      )

      setTestResults({
        type: 'rideConfirmationNotification',
        result
      })

    } catch (err) {
      console.error('Error sending ride confirmation notification:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testPickupReminder = async () => {
    if (!testChatId) {
      setError('Please enter chat ID')
      return
    }

    setLoading(true)
    setError(null)
    setTestResults(null)

    try {
      const result = await telegramService.sendPickupReminderNotification(
        parseInt(testChatId),
        {
          ride_id: testRideId || 'test-ride-123',
          pickup_time: '8:00 AM',
          pickup_location: 'Dhanmondi 27',
          driver_name: 'John Doe'
        }
      )

      setTestResults({
        type: 'pickupReminder',
        result
      })

    } catch (err) {
      console.error('Error sending pickup reminder:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testNotificationService = async () => {
    if (!testRideId) {
      setError('Please enter ride ID')
      return
    }

    setLoading(true)
    setError(null)
    setTestResults(null)

    try {
      const result = await notificationService.sendNotificationsForRide(
        testRideId,
        'MATCH'
      )

      setTestResults({
        type: 'notificationService',
        result
      })

    } catch (err) {
      console.error('Error testing notification service:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Telegram Bot Testing</h1>
          <p className="mt-2 text-gray-600">
            Test Telegram bot integration and notification system
          </p>
        </div>

        {/* Bot Configuration Status */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Bot Configuration</h2>
          
          <div className={`p-4 rounded-md ${telegramService.isConfigured() ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="font-medium">
              Telegram Bot: {telegramService.isConfigured() ? '✅ Configured' : '❌ Not Configured'}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {telegramService.isConfigured() ? 'Ready for testing' : 'Check VITE_TELEGRAM_BOT_TOKEN'}
            </div>
          </div>

          {botInfo && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium text-gray-900 mb-2">Bot Information</h3>
              <div className="text-sm text-gray-600">
                <div><strong>Name:</strong> {botInfo.first_name}</div>
                <div><strong>Username:</strong> @{botInfo.username}</div>
                <div><strong>ID:</strong> {botInfo.id}</div>
              </div>
            </div>
          )}

          <button
            onClick={fetchBotInfo}
            disabled={loading}
            className="mt-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? <LoadingSpinner /> : 'Refresh Bot Info'}
          </button>
        </div>

        {/* Test Form */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Parameters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="chat-id" className="block text-sm font-medium text-gray-700">
                Chat ID (Telegram User ID)
              </label>
              <input
                type="text"
                id="chat-id"
                value={testChatId}
                onChange={(e) => setTestChatId(e.target.value)}
                placeholder="e.g., 123456789"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Get your Telegram ID by messaging @userinfobot
              </p>
            </div>
            
            <div>
              <label htmlFor="ride-id" className="block text-sm font-medium text-gray-700">
                Ride ID (for notification service test)
              </label>
              <input
                type="text"
                id="ride-id"
                value={testRideId}
                onChange={(e) => setTestRideId(e.target.value)}
                placeholder="e.g., uuid-from-database"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="test-message" className="block text-sm font-medium text-gray-700">
              Test Message
            </label>
            <textarea
              id="test-message"
              rows={3}
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Test Buttons */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Functions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={testSendMessage}
              disabled={loading || !telegramService.isConfigured()}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Send Test Message
            </button>
            
            <button
              onClick={testRideMatchNotification}
              disabled={loading || !telegramService.isConfigured()}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              Test Ride Match
            </button>
            
            <button
              onClick={testRideConfirmationNotification}
              disabled={loading || !telegramService.isConfigured()}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              Test Confirmation
            </button>
            
            <button
              onClick={testPickupReminder}
              disabled={loading || !telegramService.isConfigured()}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
            >
              Test Pickup Reminder
            </button>
            
            <button
              onClick={testNotificationService}
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Test Notification Service
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Notification Monitoring */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Real-time Notification Monitoring</h2>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                subscriptionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                subscriptionStatus === 'error' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  subscriptionStatus === 'connected' ? 'bg-green-500' :
                  subscriptionStatus === 'error' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}></div>
                <span>{subscriptionStatus}</span>
              </div>
              <button
                onClick={refreshActivities}
                disabled={activitiesLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {activitiesLoading ? <LoadingSpinner /> : 'Refresh'}
              </button>
            </div>
          </div>

          {notificationError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{notificationError}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ride ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telegram Ready
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activities.map((activity) => (
                  <tr key={activity.ride_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {activity.ride_id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {activity.commute_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        activity.ride_status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                        activity.ride_status === 'PENDING_CONFIRMATION' ? 'bg-yellow-100 text-yellow-800' :
                        activity.ride_status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.ride_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {activity.participant_count} total
                      <div className="text-xs text-gray-400">
                        {activity.participants.slice(0, 2).join(', ')}
                        {activity.participants.length > 2 && ` +${activity.participants.length - 2} more`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {activity.telegram_enabled_count}/{activity.participant_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => sendTestNotification(activity.ride_id, 'MATCH')}
                        disabled={sending}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                      >
                        Test Match
                      </button>
                      <button
                        onClick={() => sendTestNotification(activity.ride_id, 'CONFIRMATION')}
                        disabled={sending}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                      >
                        Test Confirm
                      </button>
                      <button
                        onClick={() => sendTestNotification(activity.ride_id, 'REMINDER')}
                        disabled={sending}
                        className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                      >
                        Test Reminder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {activities.length === 0 && !activitiesLoading && (
              <div className="text-center py-8 text-gray-500">
                No recent notification activities found
              </div>
            )}
          </div>
        </div>

        {/* Results Display */}
        {testResults && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Test Results - {testResults.type}
            </h2>
            <div className="bg-gray-50 rounded-md p-4">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(testResults.result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
