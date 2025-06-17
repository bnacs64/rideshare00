import React, { useState, useEffect } from 'react'
import { MapboxMap, MapboxGeocoder } from './MapboxMap'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { MapPin, Navigation, CheckCircle, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface MapboxLocationPickerProps {
  initialLocation?: [number, number] // [lng, lat] for Mapbox
  onLocationSelect: (location: { lat: number; lng: number; address?: string }) => void
  onCancel?: () => void
  title?: string
  description?: string
  className?: string
  height?: string
  showAddressSearch?: boolean
}

export const MapboxLocationPicker: React.FC<MapboxLocationPickerProps> = ({
  initialLocation = [90.4125, 23.8103], // Default to Dhaka
  onLocationSelect,
  onCancel,
  title = "Select Location",
  description = "Click on the map or search for an address to select a location",
  className,
  height = "400px",
  showAddressSearch = true
}) => {
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number
    lng: number
    address?: string
  } | null>(
    initialLocation ? { lat: initialLocation[1], lng: initialLocation[0] } : null
  )
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle location selection from map
  const handleMapLocationSelect = (location: { lat: number; lng: number; address?: string }) => {
    setSelectedLocation(location)
    setError(null)
  }

  // Handle location selection from geocoder
  const handleGeocoderLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setSelectedLocation(location)
    setError(null)
  }

  // Handle confirm selection
  const handleConfirm = async () => {
    if (!selectedLocation) {
      setError('Please select a location first')
      return
    }

    setIsConfirming(true)
    try {
      await onLocationSelect(selectedLocation)
    } catch (err) {
      setError('Failed to confirm location. Please try again.')
    } finally {
      setIsConfirming(false)
    }
  }

  // Create markers for the map
  const markers = selectedLocation ? [{
    id: 'selected',
    coordinates: [selectedLocation.lng, selectedLocation.lat] as [number, number],
    title: 'Selected Location',
    description: selectedLocation.address || 'Click confirm to select this location',
    type: 'pickup' as const
  }] : []

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Address Search */}
        {showAddressSearch && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Search by Address</label>
            <MapboxGeocoder
              onLocationSelect={handleGeocoderLocationSelect}
              placeholder="Enter address or landmark in Dhaka..."
              country="BD"
            />
          </div>
        )}

        {/* Map */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Or click on the map</label>
          <MapboxMap
            center={selectedLocation ? [selectedLocation.lng, selectedLocation.lat] : initialLocation}
            zoom={selectedLocation ? 16 : 13}
            height={height}
            onLocationSelect={handleMapLocationSelect}
            markers={markers}
            showGeocoder={false}
            showNavigation={true}
            style="mapbox://styles/mapbox/streets-v12"
          />
        </div>

        {/* Selected Location Info */}
        {selectedLocation && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="space-y-1">
                <p className="font-medium">Location Selected</p>
                <p className="text-sm">
                  Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </p>
                {selectedLocation.address && (
                  <p className="text-sm">
                    Address: {selectedLocation.address}
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedLocation || isConfirming}
            className="flex items-center gap-2"
          >
            {isConfirming ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Confirm Location
              </>
            )}
          </Button>
        </div>

        {/* Tips */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>💡 <strong>Tips:</strong></p>
          <p>• Use the search box for quick address lookup</p>
          <p>• Click anywhere on the map to select a location</p>
          <p>• Use the navigation controls to zoom and pan</p>
          <p>• Click the location button to use your current position</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Enhanced version with route preview
export interface MapboxLocationPickerWithRouteProps extends MapboxLocationPickerProps {
  destinationLocation?: [number, number] // [lng, lat] for destination
  showRoute?: boolean
}

export const MapboxLocationPickerWithRoute: React.FC<MapboxLocationPickerWithRouteProps> = ({
  destinationLocation,
  showRoute = false,
  ...props
}) => {
  const [routeData, setRouteData] = useState<any>(null)

  // Fetch route when both locations are available
  useEffect(() => {
    if (!showRoute || !props.initialLocation || !destinationLocation) return

    const fetchRoute = async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${props.initialLocation![0]},${props.initialLocation![1]};${destinationLocation[0]},${destinationLocation[1]}?geometries=geojson&access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`
        )
        const data = await response.json()
        setRouteData(data.routes[0])
      } catch (error) {
        console.error('Failed to fetch route:', error)
      }
    }

    fetchRoute()
  }, [props.initialLocation, destinationLocation, showRoute])

  // Add route and destination markers (currently not used but prepared for future implementation)
  // const enhancedMarkers = [
  //   ...(props.initialLocation ? [{
  //     id: 'pickup',
  //     coordinates: props.initialLocation,
  //     title: 'Pickup Location',
  //     description: 'Your selected pickup point',
  //     type: 'pickup' as const
  //   }] : []),
  //   ...(destinationLocation ? [{
  //     id: 'destination',
  //     coordinates: destinationLocation,
  //     title: 'NSU Campus',
  //     description: 'North South University',
  //     type: 'destination' as const
  //   }] : [])
  // ]

  return (
    <div className="space-y-4">
      <MapboxLocationPicker {...props} />
      
      {/* Route Information */}
      {routeData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Route Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Distance</p>
                <p className="text-muted-foreground">
                  {(routeData.distance / 1000).toFixed(1)} km
                </p>
              </div>
              <div>
                <p className="font-medium">Duration</p>
                <p className="text-muted-foreground">
                  {Math.round(routeData.duration / 60)} minutes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
