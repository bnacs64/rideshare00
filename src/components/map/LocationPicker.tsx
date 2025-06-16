import React, { useState, useEffect } from 'react'
import { BaseMap, MapMarker } from './BaseMap'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react'
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
  initialLocation = [23.8103, 90.4125], // Default to Dhaka
  onLocationSelect,
  onCancel,
  title = "Select Location",
  description = "Click on the map to select a location",
  className,
  showAddressSearch = true,
  height = "400px"
}) => {
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(
    initialLocation
  )
  const [address, setAddress] = useState('')
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [searchAddress, setSearchAddress] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Handle map click
  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation([lat, lng])
    // Optionally reverse geocode to get address
    reverseGeocode(lat, lng)
  }

  // Get current location
  const getCurrentLocation = async () => {
    setIsGettingLocation(true)
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported')
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        })
      })

      const coords: [number, number] = [position.coords.latitude, position.coords.longitude]
      setSelectedLocation(coords)
      reverseGeocode(coords[0], coords[1])
    } catch (error) {
      console.error('Error getting current location:', error)
      // You could show a toast notification here
    } finally {
      setIsGettingLocation(false)
    }
  }

  // Reverse geocode coordinates to address
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      // Using Nominatim (OpenStreetMap) for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      )
      const data = await response.json()
      if (data.display_name) {
        setAddress(data.display_name)
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error)
    }
  }

  // Search for address
  const searchForAddress = async () => {
    if (!searchAddress.trim()) return
    
    setIsSearching(true)
    try {
      // Using Nominatim for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1&countrycodes=bd`
      )
      const data = await response.json()
      
      if (data.length > 0) {
        const result = data[0]
        const coords: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)]
        setSelectedLocation(coords)
        setAddress(result.display_name)
      }
    } catch (error) {
      console.error('Error searching for address:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Handle confirm selection
  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect({
        lat: selectedLocation[0],
        lng: selectedLocation[1],
        address: address || undefined
      })
    }
  }

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
        {/* Address Search */}
        {showAddressSearch && (
          <div className="space-y-2">
            <Label htmlFor="address-search">Search by Address</Label>
            <div className="flex gap-2">
              <Input
                id="address-search"
                placeholder="Enter address or landmark..."
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
        <BaseMap
          center={selectedLocation || initialLocation}
          zoom={15}
          height={height}
          onClick={handleMapClick}
        >
          {selectedLocation && (
            <MapMarker
              position={selectedLocation}
              title="Selected Location"
              description={address || 'Click confirm to select this location'}
              icon="pickup"
            />
          )}
        </BaseMap>

        {/* Selected Location Info */}
        {selectedLocation && (
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-1">Selected Location</h4>
            <p className="text-xs text-muted-foreground">
              Coordinates: {selectedLocation[0].toFixed(6)}, {selectedLocation[1].toFixed(6)}
            </p>
            {address && (
              <p className="text-xs text-muted-foreground mt-1">
                Address: {address}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
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
            <MapPin className="w-4 h-4" />
            Confirm Location
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
