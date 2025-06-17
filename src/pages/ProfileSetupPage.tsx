import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { profileService } from '../services/profileService'
import { LocationPicker } from '../components/map/LocationPicker'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import type { DriverDetails } from '../types'
import { LoadingSpinner } from '../components/LoadingSpinner'

interface ProfileSetupForm {
  fullName: string
  defaultRole: 'DRIVER' | 'RIDER'
  homeLocationCoords: [number, number] | null
  homeLocationAddress: string
  driverDetails: DriverDetails | null
}

export const ProfileSetupPage: React.FC = () => {
  const [formData, setFormData] = useState<ProfileSetupForm>({
    fullName: '',
    defaultRole: 'RIDER',
    homeLocationCoords: null,
    homeLocationAddress: '',
    driverDetails: null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const [locationLoading, setLocationLoading] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // If user already has a complete profile (has full_name), redirect to dashboard
    if (user && user.full_name && user.full_name.trim() !== '') {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDriverDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      driverDetails: {
        ...prev.driverDetails,
        [name]: name === 'capacity' ? parseInt(value) || 1 : value
      } as DriverDetails
    }))
  }

  const getCurrentLocation = async () => {
    setLocationLoading(true)
    setError('')

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser')
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        })
      })

      const coords: [number, number] = [position.coords.longitude, position.coords.latitude]
      setFormData(prev => ({
        ...prev,
        homeLocationCoords: coords
      }))
    } catch (error) {
      console.error('Error getting location:', error)
      setError('Unable to get your location. Please try again or set it manually.')
    } finally {
      setLocationLoading(false)
    }
  }

  const setManualLocation = () => {
    // For now, set to NSU coordinates as default
    const nsuCoords: [number, number] = [90.4125, 23.8103] // NSU coordinates
    setFormData(prev => ({
      ...prev,
      homeLocationCoords: nsuCoords,
      homeLocationAddress: 'North South University Area, Dhaka'
    }))
  }

  const handleLocationSelect = (location: { lat: number; lng: number; address?: string }) => {
    setFormData(prev => ({
      ...prev,
      homeLocationCoords: [location.lng, location.lat], // PostGIS uses lng, lat order
      homeLocationAddress: location.address || ''
    }))
    setShowLocationPicker(false)
  }

  const validateStep1 = () => {
    if (!formData.fullName.trim()) {
      setError('Full name is required')
      return false
    }
    if (!formData.homeLocationCoords) {
      setError('Home location is required')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (formData.defaultRole === 'DRIVER') {
      if (!formData.driverDetails) {
        setError('Driver details are required')
        return false
      }
      const validation = userService.validateDriverDetails(formData.driverDetails)
      if (!validation.valid) {
        setError(validation.errors.join(', '))
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    setError('')
    if (step === 1 && validateStep1()) {
      setStep(2)
    }
  }

  const handleBack = () => {
    setStep(1)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('🚀 Starting profile setup submission...')
    console.log('Form data:', formData)

    try {
      if (!validateStep2()) {
        console.log('❌ Step 2 validation failed')
        setLoading(false)
        return
      }

      console.log('✅ Step 2 validation passed')

      // Use the user from AuthContext instead of making another Supabase call
      console.log('🔍 Getting current user from AuthContext...')

      if (!user || !user.id) {
        console.log('❌ No authenticated user found in context')
        setError('Authentication error. Please try logging in again.')
        setLoading(false)
        return
      }

      console.log('✅ Authenticated user found in context:', user.email)

      // Create a proper auth user object for profile creation
      const authUser = {
        id: user.id,
        email: user.email
      }

      // Create complete profile using database function
      console.log('📝 Creating complete profile via database function...')
      const profileData = {
        id: authUser.id,
        email: authUser.email!,
        full_name: formData.fullName,
        default_role: formData.defaultRole,
        home_location_coords: formData.homeLocationCoords!, // [lng, lat] for PostGIS
        home_location_address: formData.homeLocationAddress,
        driver_details: formData.driverDetails
      }
      console.log('Profile data to be created:', profileData)

      const result = await profileService.createCompleteProfile(profileData)

      if (!result.success) {
        console.log('❌ Profile creation failed:', result.error)
        setError(result.error || 'Failed to create profile')
        setLoading(false)
        return
      }

      console.log('✅ Complete profile created successfully via database function')
      console.log('📍 Default pickup location created automatically:', result.data?.pickup_location_id)

      // Profile created successfully, refresh user data and redirect to dashboard
      console.log('🔄 Refreshing user data...')
      await refreshUser()
      console.log('✅ User data refreshed, navigating to dashboard...')
      navigate('/dashboard')
    } catch (error) {
      console.error('💥 Profile setup error:', error)

      // If it's a timeout error, try to navigate anyway
      if (error instanceof Error && error.message.includes('timeout')) {
        console.log('⏰ Timeout occurred, attempting to navigate to dashboard anyway...')
        try {
          await refreshUser()
          navigate('/dashboard')
          return
        } catch (navError) {
          console.error('Navigation after timeout failed:', navError)
        }
      }

      setError('An unexpected error occurred: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      console.log('🏁 Profile setup submission completed, setting loading to false')
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Setting up your profile..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Step {step} of 2
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 2) * 100}%` }}
          ></div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label htmlFor="defaultRole" className="block text-sm font-medium text-gray-700">
                  Primary Role
                </label>
                <select
                  id="defaultRole"
                  name="defaultRole"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.defaultRole}
                  onChange={handleInputChange}
                >
                  <option value="RIDER">Rider - I need rides to NSU</option>
                  <option value="DRIVER">Driver - I can offer rides to NSU</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Home Location
                </label>
                {formData.homeLocationCoords ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800 font-medium">
                      ✅ Location Selected
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Coordinates: {formData.homeLocationCoords[1].toFixed(4)}, {formData.homeLocationCoords[0].toFixed(4)}
                    </p>
                    {formData.homeLocationAddress && (
                      <p className="text-xs text-green-700 mt-1">
                        Address: {formData.homeLocationAddress}
                      </p>
                    )}
                    <div className="mt-2 space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowLocationPicker(true)}
                        className="text-sm text-blue-600 hover:text-blue-500"
                      >
                        Change location
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, homeLocationCoords: null, homeLocationAddress: '' }))}
                        className="text-sm text-red-600 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={locationLoading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {locationLoading ? 'Getting location...' : 'Use Current Location'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(true)}
                      className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Select on Map
                    </button>
                    <button
                      type="button"
                      onClick={setManualLocation}
                      className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Set NSU Area as Default
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {formData.defaultRole === 'DRIVER' && (
                <>
                  <div>
                    <label htmlFor="car_model" className="block text-sm font-medium text-gray-700">
                      Car Model
                    </label>
                    <input
                      id="car_model"
                      name="car_model"
                      type="text"
                      required
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Toyota Axio"
                      value={formData.driverDetails?.car_model || ''}
                      onChange={handleDriverDetailsChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                      Passenger Capacity
                    </label>
                    <select
                      id="capacity"
                      name="capacity"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={formData.driverDetails?.capacity || 1}
                      onChange={handleDriverDetailsChange}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                        <option key={num} value={num}>{num} passenger{num > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="license_plate" className="block text-sm font-medium text-gray-700">
                      License Plate (Optional)
                    </label>
                    <input
                      id="license_plate"
                      name="license_plate"
                      type="text"
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., DHK-1234"
                      value={formData.driverDetails?.license_plate || ''}
                      onChange={handleDriverDetailsChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="car_color" className="block text-sm font-medium text-gray-700">
                      Car Color (Optional)
                    </label>
                    <input
                      id="car_color"
                      name="car_color"
                      type="text"
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., White"
                      value={formData.driverDetails?.car_color || ''}
                      onChange={handleDriverDetailsChange}
                    />
                  </div>
                </>
              )}

              {formData.defaultRole === 'RIDER' && (
                <div className="text-center py-8">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Almost done!</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    As a rider, you're all set. Click finish to complete your profile.
                  </p>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Finish'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Location Picker Modal */}
        {showLocationPicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <LocationPicker
                  initialLocation={formData.homeLocationCoords ? [formData.homeLocationCoords[1], formData.homeLocationCoords[0]] : undefined}
                  onLocationSelect={handleLocationSelect}
                  onCancel={() => setShowLocationPicker(false)}
                  title="Select Your Home Location"
                  description="Choose your home location for pickup coordination"
                  height="500px"
                  showAddressSearch={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
