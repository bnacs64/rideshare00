import React, { useState } from 'react'
import { MapboxMap } from './MapboxMap'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { MapPin, Navigation, Search, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface LocationPickerProps {
  initialLocation?: [number, number]
  onLocationSelect: (location: { lat: number; lng: number; address?: string }) => void
  onCancel?: () => void
  title?: string
  description?: string
  className?: string
  showAddressSearch?: boolean
  height?: string
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  initialLocation = [23.8103, 90.4125], // Default to Dhaka [lat, lng]
  onLocationSelect,
  onCancel,
  title = "Select Location",
  description = "Click on the map or search for an address to select a location",
  className,
  showAddressSearch = true,
  height = "400px"
}) => {
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number
    lng: number
    address?: string
  } | null>(
    initialLocation ? { lat: initialLocation[0], lng: initialLocation[1] } : null
  )
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [searchAddress, setSearchAddress] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle map location selection (from Mapbox)
  const handleMapLocationSelect = (location: { lat: number; lng: number; address?: string }) => {
    setSelectedLocation(location)
    setError(null)
  }

  // Get current location
  const getCurrentLocation = async () => {
    setIsGettingLocation(true)
    setError(null)
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

      const lat = position.coords.latitude
      const lng = position.coords.longitude

      // Use Mapbox reverse geocoding
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}&country=BD&limit=1`
        )
        const data = await response.json()
        const address = data.features[0]?.place_name || undefined

        setSelectedLocation({ lat, lng, address })
      } catch (geocodeError) {
        console.error('Reverse geocoding failed:', geocodeError)
        setSelectedLocation({ lat, lng })
      }
    } catch (error) {
      console.error('Error getting current location:', error)
      setError('Unable to get your current location. Please ensure location access is enabled.')
    } finally {
      setIsGettingLocation(false)
    }
  }

  // Search for address using Mapbox Geocoding
  const searchForAddress = async () => {
    if (!searchAddress.trim()) return

    setIsSearching(true)
    setError(null)
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchAddress)}.json?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}&country=BD&limit=1&proximity=90.4125,23.8103`
      )
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const result = data.features[0]
        const [lng, lat] = result.center
        setSelectedLocation({
          lat,
          lng,
          address: result.place_name
        })
        setSearchAddress('') // Clear search after successful selection
      } else {
        setError('No results found for that address. Try a different search term.')
      }
    } catch (error) {
      console.error('Error searching for address:', error)
      setError('Failed to search for address. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  // Handle confirm selection
  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect({
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        address: selectedLocation.address
      })
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
            <Label htmlFor="address-search">Search by Address</Label>
            <div className="flex gap-2">
              <Input
                id="address-search"
                placeholder="Enter address or landmark in Dhaka..."
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchForAddress()}
              />
              <Button
                onClick={searchForAddress}
                disabled={isSearching || !searchAddress.trim()}
                size="sm"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Current Location Button */}
        <div className="flex gap-2">
          <Button
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isGettingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            Use Current Location
          </Button>
        </div>

        {/* Map */}
        <div className="space-y-2">
          <Label>Or click on the map</Label>
          <MapboxMap
            center={selectedLocation ? [selectedLocation.lng, selectedLocation.lat] : [initialLocation[1], initialLocation[0]]}
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
            disabled={!selectedLocation}
            className="flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Confirm Location
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
