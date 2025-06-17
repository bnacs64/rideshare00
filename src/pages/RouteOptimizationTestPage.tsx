import React, { useState } from 'react'
import { uberService } from '../services/uberService'
import { googleMapsService } from '../services/googleMapsService'
import { LoadingSpinner } from '../components/LoadingSpinner'

interface TestLocation {
  latitude: number
  longitude: number
  address: string
  user_id?: string
}

export const RouteOptimizationTestPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Test locations in Dhaka
  const [testLocations, setTestLocations] = useState<TestLocation[]>([
    { latitude: 23.8103, longitude: 90.4125, address: 'NSU Campus', user_id: 'destination' },
    { latitude: 23.7808, longitude: 90.4217, address: 'Dhanmondi 27', user_id: 'user1' },
    { latitude: 23.7956, longitude: 90.4074, address: 'Kalabagan', user_id: 'user2' },
    { latitude: 23.7644, longitude: 90.3897, address: 'Mohammadpur', user_id: 'user3' },
    { latitude: 23.8223, longitude: 90.3654, address: 'Mirpur 10', user_id: 'driver' }
  ])

  const testUberAPI = async () => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const driverLocation = testLocations.find(loc => loc.user_id === 'driver')!
      const destination = testLocations.find(loc => loc.user_id === 'destination')!
      const pickupPoints = testLocations.filter(loc => loc.user_id && !['driver', 'destination'].includes(loc.user_id))

      console.log('Testing Uber API with:', { driverLocation, destination, pickupPoints })

      // Test Uber products
      const productsResult = await uberService.getProducts(driverLocation.latitude, driverLocation.longitude)
      
      // Test route optimization
      const routeResult = await uberService.optimizeRoute(
        { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
        { latitude: destination.latitude, longitude: destination.longitude },
        pickupPoints.map(p => ({
          latitude: p.latitude,
          longitude: p.longitude,
          address: p.address,
          user_id: p.user_id
        }))
      )

      setResults({
        api: 'Uber',
        configured: uberService.isConfigured(),
        products: productsResult,
        route: routeResult
      })

    } catch (err) {
      console.error('Uber API test error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testGoogleMapsAPI = async () => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const driverLocation = testLocations.find(loc => loc.user_id === 'driver')!
      const destination = testLocations.find(loc => loc.user_id === 'destination')!
      const pickupPoints = testLocations.filter(loc => loc.user_id && !['driver', 'destination'].includes(loc.user_id))

      console.log('Testing Google Maps API with:', { driverLocation, destination, pickupPoints })

      // Test route optimization
      const routeResult = await googleMapsService.optimizePickupRoute(
        { lat: driverLocation.latitude, lng: driverLocation.longitude },
        { lat: destination.latitude, lng: destination.longitude },
        pickupPoints.map(p => ({
          lat: p.latitude,
          lng: p.longitude,
          address: p.address,
          user_id: p.user_id
        }))
      )

      setResults({
        api: 'Google Maps',
        configured: googleMapsService.isConfigured(),
        route: routeResult
      })

    } catch (err) {
      console.error('Google Maps API test error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const addTestLocation = () => {
    setTestLocations([
      ...testLocations,
      { latitude: 23.7500, longitude: 90.4000, address: 'New Location', user_id: `user${testLocations.length}` }
    ])
  }

  const updateLocation = (index: number, field: keyof TestLocation, value: string | number) => {
    const updated = [...testLocations]
    updated[index] = { ...updated[index], [field]: value }
    setTestLocations(updated)
  }

  const removeLocation = (index: number) => {
    setTestLocations(testLocations.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Route Optimization API Testing</h1>
          <p className="mt-2 text-gray-600">
            Test Uber API and Google Maps API integration for route optimization
          </p>
        </div>

        {/* API Configuration Status */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">API Configuration Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-md ${uberService.isConfigured() ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="font-medium">
                Uber API: {uberService.isConfigured() ? '✅ Configured' : '❌ Not Configured'}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {uberService.isConfigured() ? 'Ready for testing' : 'Check VITE_UBER_CLIENT_ID and VITE_UBER_CLIENT_SECRET'}
              </div>
            </div>
            <div className={`p-4 rounded-md ${googleMapsService.isConfigured() ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="font-medium">
                Google Maps API: {googleMapsService.isConfigured() ? '✅ Configured' : '❌ Not Configured'}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {googleMapsService.isConfigured() ? 'Ready for testing' : 'Check VITE_GOOGLE_MAPS_API_KEY'}
              </div>
            </div>
          </div>
        </div>

        {/* Test Locations */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Test Locations</h2>
            <button
              onClick={addTestLocation}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Location
            </button>
          </div>
          
          <div className="space-y-4">
            {testLocations.map((location, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border border-gray-200 rounded-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={location.latitude}
                    onChange={(e) => updateLocation(index, 'latitude', parseFloat(e.target.value))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={location.longitude}
                    onChange={(e) => updateLocation(index, 'longitude', parseFloat(e.target.value))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input
                    type="text"
                    value={location.address}
                    onChange={(e) => updateLocation(index, 'address', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">User ID</label>
                  <input
                    type="text"
                    value={location.user_id || ''}
                    onChange={(e) => updateLocation(index, 'user_id', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => removeLocation(index)}
                    className="w-full inline-flex justify-center items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test Buttons */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Run Tests</h2>
          <div className="flex space-x-4">
            <button
              onClick={testUberAPI}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              {loading ? <LoadingSpinner /> : 'Test Uber API'}
            </button>
            
            <button
              onClick={testGoogleMapsAPI}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? <LoadingSpinner /> : 'Test Google Maps API'}
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

        {/* Results Display */}
        {results && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{results.api} API Test Results</h2>
            <div className="bg-gray-50 rounded-md p-4">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
