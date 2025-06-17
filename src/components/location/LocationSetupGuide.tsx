import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { Button } from '../ui/button'
import { MapPin, Home, Navigation, CheckCircle, AlertCircle, Info } from 'lucide-react'

interface LocationSetupGuideProps {
  hasHomeLocation: boolean
  hasPickupLocations: boolean
  onAddPickupLocation?: () => void
  className?: string
}

export const LocationSetupGuide: React.FC<LocationSetupGuideProps> = ({
  hasHomeLocation,
  hasPickupLocations,
  onAddPickupLocation,
  className
}) => {
  const getSetupStatus = () => {
    if (hasHomeLocation && hasPickupLocations) {
      return 'complete'
    } else if (hasHomeLocation && !hasPickupLocations) {
      return 'partial'
    } else {
      return 'incomplete'
    }
  }

  const status = getSetupStatus()

  const renderStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'partial':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      default:
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'complete':
        return {
          title: 'Location Setup Complete',
          message: 'Great! You have both home location and pickup locations configured.',
          variant: 'success' as const
        }
      case 'partial':
        return {
          title: 'Pickup Locations Missing',
          message: 'Your home location is set, but you need pickup locations for ride sharing.',
          variant: 'warning' as const
        }
      default:
        return {
          title: 'Location Setup Required',
          message: 'You need to set up your home location and pickup locations to use the ride sharing service.',
          variant: 'info' as const
        }
    }
  }

  const statusInfo = getStatusMessage()

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location Setup Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Alert */}
          <Alert className={
            statusInfo.variant === 'success' ? 'border-green-200 bg-green-50' :
            statusInfo.variant === 'warning' ? 'border-yellow-200 bg-yellow-50' :
            'border-blue-200 bg-blue-50'
          }>
            {renderStatusIcon()}
            <AlertDescription className={
              statusInfo.variant === 'success' ? 'text-green-800' :
              statusInfo.variant === 'warning' ? 'text-yellow-800' :
              'text-blue-800'
            }>
              <strong>{statusInfo.title}</strong>
              <br />
              {statusInfo.message}
            </AlertDescription>
          </Alert>

          {/* Setup Steps */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Setup Progress:</h4>
            
            {/* Home Location Step */}
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                hasHomeLocation ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}>
                {hasHomeLocation ? <CheckCircle className="w-4 h-4" /> : <Home className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <h5 className="font-medium text-sm">Home Location</h5>
                <p className="text-xs text-gray-600">
                  {hasHomeLocation 
                    ? 'Your home location is configured' 
                    : 'Set your home address during profile setup'
                  }
                </p>
              </div>
            </div>

            {/* Pickup Locations Step */}
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                hasPickupLocations ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}>
                {hasPickupLocations ? <CheckCircle className="w-4 h-4" /> : <Navigation className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <h5 className="font-medium text-sm">Pickup Locations</h5>
                <p className="text-xs text-gray-600">
                  {hasPickupLocations 
                    ? 'You have pickup locations configured' 
                    : 'Add locations where you can be picked up for rides'
                  }
                </p>
              </div>
              {!hasPickupLocations && onAddPickupLocation && (
                <Button size="sm" variant="outline" onClick={onAddPickupLocation}>
                  Add Now
                </Button>
              )}
            </div>
          </div>

          {/* Information Box */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h5 className="font-medium text-sm mb-2">Why do I need pickup locations?</h5>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Pickup locations help drivers find you easily</li>
              <li>• You can have multiple locations (home, work, university, etc.)</li>
              <li>• Choose the most convenient location for each ride</li>
              <li>• Locations are private and only shared with matched riders</li>
            </ul>
          </div>

          {/* Quick Tips */}
          {status !== 'complete' && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h5 className="font-medium text-sm mb-2 text-blue-900">💡 Quick Tips:</h5>
              <ul className="text-xs text-blue-800 space-y-1">
                {!hasHomeLocation && (
                  <li>• Complete your profile setup to set your home location</li>
                )}
                {hasHomeLocation && !hasPickupLocations && (
                  <>
                    <li>• A default pickup location is usually created from your home location</li>
                    <li>• If missing, you can add pickup locations manually</li>
                    <li>• Try refreshing the page if locations don't appear</li>
                  </>
                )}
                <li>• You can always add more pickup locations later</li>
                <li>• Set one location as default for quick ride booking</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
