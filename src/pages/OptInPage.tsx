import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePickupLocations } from '../hooks/usePickupLocations'
import { useOptIns } from '../hooks/useOptIns'
import { optInService } from '../services/optInService'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Alert, AlertDescription } from '../components/ui/alert'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { LocationSetupGuide } from '../components/location/LocationSetupGuide'
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Car,
  Users
} from 'lucide-react'

interface OptInFormData {
  commute_date: string
  time_window_start: string
  time_window_end: string
  pickup_location_id: string
}

export const OptInPage: React.FC = () => {
  const { user } = useAuth()
  const { pickupLocations, loading: locationsLoading } = usePickupLocations()
  const { createDailyOptIn, submitting, checkExistingOptIn, todayOptIns } = useOptIns()

  // Check if user has home location
  const hasHomeLocation = user?.home_location_coords && user.home_location_coords.length === 2

  const [formData, setFormData] = useState<OptInFormData>({
    commute_date: '',
    time_window_start: '',
    time_window_end: '',
    pickup_location_id: ''
  })

  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [existingOptIn, setExistingOptIn] = useState<any>(null)
  const [checkingExisting, setCheckingExisting] = useState(false)

  // Set default date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setFormData(prev => ({ ...prev, commute_date: today }))
  }, [])

  // Check for existing opt-in when date changes
  useEffect(() => {
    if (formData.commute_date) {
      checkExistingOptInForDate()
    }
  }, [formData.commute_date])

  const checkExistingOptInForDate = async () => {
    if (!formData.commute_date) return

    setCheckingExisting(true)
    try {
      const { exists, optIn } = await checkExistingOptIn(formData.commute_date)
      setExistingOptIn(exists ? optIn : null)
    } catch (error) {
      console.error('Error checking existing opt-in:', error)
    } finally {
      setCheckingExisting(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate date
    const dateValidation = optInService.validateCommuteDate(formData.commute_date)
    if (!dateValidation.valid) {
      newErrors.commute_date = dateValidation.error || 'Invalid date'
    }

    // Validate time window
    if (!formData.time_window_start) {
      newErrors.time_window_start = 'Start time is required'
    }
    if (!formData.time_window_end) {
      newErrors.time_window_end = 'End time is required'
    }

    if (formData.time_window_start && formData.time_window_end) {
      const timeValidation = optInService.validateTimeWindow(formData.time_window_start, formData.time_window_end)
      if (!timeValidation.valid) {
        newErrors.time_window_end = timeValidation.error || 'Invalid time window'
      }
    }

    // Validate pickup location
    if (!formData.pickup_location_id) {
      newErrors.pickup_location_id = 'Pickup location is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setErrors({})

    try {
      const result = await createDailyOptIn({
        commute_date: formData.commute_date,
        time_window_start: formData.time_window_start,
        time_window_end: formData.time_window_end,
        pickup_location_id: formData.pickup_location_id
      })

      if (result.success) {
        setSubmitSuccess(true)
        // Reset form
        setFormData({
          commute_date: new Date().toISOString().split('T')[0],
          time_window_start: '',
          time_window_end: '',
          pickup_location_id: ''
        })
        setExistingOptIn(null)
        setTimeout(() => setSubmitSuccess(false), 5000)
      } else {
        setErrors({ submit: 'Failed to create opt-in. Please try again.' })
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      setErrors({ submit: 'An unexpected error occurred. Please try again.' })
    }
  }

  const handleInputChange = (field: keyof OptInFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (locationsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Opt-In for a Ride</h1>
            <p className="text-gray-600 mt-2">
              Schedule your commute and get matched with other NSU students for shared rides.
            </p>
          </div>

          {/* Success Message */}
          {submitSuccess && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Successfully opted in for your ride! You'll be notified when a match is found.
              </AlertDescription>
            </Alert>
          )}

          {/* Today's Opt-ins Summary */}
          {todayOptIns.length > 0 && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                You have {todayOptIns.length} opt-in{todayOptIns.length > 1 ? 's' : ''} for today.
                <Link to="/opt-in-status" className="font-medium underline hover:text-blue-600 ml-1">
                  View details
                </Link>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    Ride Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Date Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="commute_date" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Commute Date
                      </Label>
                      <Input
                        id="commute_date"
                        type="date"
                        value={formData.commute_date}
                        onChange={(e) => handleInputChange('commute_date', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                        className={errors.commute_date ? 'border-red-500' : ''}
                      />
                      {errors.commute_date && (
                        <p className="text-sm text-red-600">{errors.commute_date}</p>
                      )}
                      {checkingExisting && (
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Checking existing opt-ins...
                        </p>
                      )}
                    </div>

                    {/* Existing Opt-in Warning */}
                    {existingOptIn && (
                      <Alert className="border-yellow-200 bg-yellow-50">
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          You already have an opt-in for this date with status: <strong>{existingOptIn.status}</strong>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Time Window */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="time_window_start" className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Earliest Pickup Time
                        </Label>
                        <Input
                          id="time_window_start"
                          type="time"
                          value={formData.time_window_start}
                          onChange={(e) => handleInputChange('time_window_start', e.target.value)}
                          className={errors.time_window_start ? 'border-red-500' : ''}
                        />
                        {errors.time_window_start && (
                          <p className="text-sm text-red-600">{errors.time_window_start}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="time_window_end">Latest Pickup Time</Label>
                        <Input
                          id="time_window_end"
                          type="time"
                          value={formData.time_window_end}
                          onChange={(e) => handleInputChange('time_window_end', e.target.value)}
                          className={errors.time_window_end ? 'border-red-500' : ''}
                        />
                        {errors.time_window_end && (
                          <p className="text-sm text-red-600">{errors.time_window_end}</p>
                        )}
                      </div>
                    </div>

                    {/* Pickup Location Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="pickup_location_id" className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Pickup Location
                      </Label>
                      <Select
                        value={formData.pickup_location_id}
                        onValueChange={(value) => handleInputChange('pickup_location_id', value)}
                      >
                        <SelectTrigger className={errors.pickup_location_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select your pickup location" />
                        </SelectTrigger>
                        <SelectContent>
                          {pickupLocations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3" />
                                <span>{location.name}</span>
                                {location.is_default && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Default</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.pickup_location_id && (
                        <p className="text-sm text-red-600">{errors.pickup_location_id}</p>
                      )}
                      {pickupLocations.length === 0 && (
                        <LocationSetupGuide
                          hasHomeLocation={hasHomeLocation}
                          hasPickupLocations={pickupLocations.length > 0}
                          onAddPickupLocation={() => window.open('/profile', '_blank')}
                        />
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                      {errors.submit && (
                        <Alert className="mb-4 border-red-200 bg-red-50">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <AlertDescription className="text-red-800">
                            {errors.submit}
                          </AlertDescription>
                        </Alert>
                      )}

                      <Button
                        type="submit"
                        disabled={submitting || existingOptIn || pickupLocations.length === 0}
                        className="w-full"
                        size="lg"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating Opt-in...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Opt-In for Ride
                          </>
                        )}
                      </Button>

                      {existingOptIn && (
                        <p className="text-sm text-gray-600 mt-2 text-center">
                          You already have an opt-in for this date
                        </p>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* How it Works */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    How It Works
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Choose Your Details</h4>
                      <p className="text-xs text-gray-600">Select your commute date, time window, and pickup location.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">AI Matching</h4>
                      <p className="text-xs text-gray-600">Our AI finds the best ride matches with other NSU students.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Get Notified</h4>
                      <p className="text-xs text-gray-600">Receive notifications via Telegram when a match is found.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Share the Ride</h4>
                      <p className="text-xs text-gray-600">Meet your ride partners and enjoy a cost-effective commute!</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" size="sm" asChild className="w-full justify-start">
                    <Link to="/profile">
                      <MapPin className="w-4 h-4 mr-2" />
                      Manage Pickup Locations
                    </Link>
                  </Button>

                  <Button variant="outline" size="sm" asChild className="w-full justify-start">
                    <Link to="/opt-in-status">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      View Opt-in Status
                    </Link>
                  </Button>

                  <Button variant="outline" size="sm" asChild className="w-full justify-start">
                    <Link to="/scheduled-opt-ins">
                      <Calendar className="w-4 h-4 mr-2" />
                      Scheduled Opt-ins
                    </Link>
                  </Button>

                  <Button variant="outline" size="sm" asChild className="w-full justify-start">
                    <Link to="/rides">
                      <Car className="w-4 h-4 mr-2" />
                      View My Rides
                    </Link>
                  </Button>

                  <Button variant="outline" size="sm" asChild className="w-full justify-start">
                    <Link to="/dashboard">
                      <Users className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card>
                <CardHeader>
                  <CardTitle>💡 Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-600">
                  <p>• Set a flexible time window (30-60 minutes) for better matches</p>
                  <p>• Opt-in early for popular commute times</p>
                  <p>• Keep your pickup locations updated</p>
                  <p>• Check your Telegram for match notifications</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
