import React from 'react'
import { BaseMap, MapMarker } from './BaseMap'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { MapPin, Home, Navigation } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { PickupLocation } from '../../types'

export interface LocationDisplayProps {
  locations: PickupLocation[]
  homeLocation?: [number, number]
  center?: [number, number]
  zoom?: number
  height?: string
  className?: string
  title?: string
  showLocationList?: boolean
  onLocationClick?: (location: PickupLocation) => void
}

export const LocationDisplay: React.FC<LocationDisplayProps> = ({
  locations,
  homeLocation,
  center,
  zoom = 13,
  height = "400px",
  className,
  title = "Your Locations",
  showLocationList = true,
  onLocationClick
}) => {
  // Calculate center if not provided
  const mapCenter = center || (() => {
    if (homeLocation) return homeLocation
    if (locations.length > 0) return locations[0].coords
    return [23.8103, 90.4125] // Default to Dhaka
  })()

  // Calculate bounds to fit all locations
  const calculateBounds = () => {
    const allLocations = [
      ...(homeLocation ? [homeLocation] : []),
      ...locations.map(loc => loc.coords)
    ]
    
    if (allLocations.length === 0) return null
    
    const lats = allLocations.map(loc => loc[0])
    const lngs = allLocations.map(loc => loc[1])
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BaseMap
            center={mapCenter}
            zoom={zoom}
            height={height}
          >
            {/* Home Location */}
            {homeLocation && (
              <MapMarker
                position={homeLocation}
                title="Home Location"
                description="Your registered home address"
                icon="home"
              />
            )}
            
            {/* Pickup Locations */}
            {locations.map((location) => (
              <MapMarker
                key={location.id}
                position={location.coords}
                title={location.name}
                description={location.description}
                icon="pickup"
                onClick={() => onLocationClick?.(location)}
              />
            ))}
          </BaseMap>
        </CardContent>
      </Card>

      {/* Location List */}
      {showLocationList && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Location Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Home Location */}
              {homeLocation && (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Home className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-green-900">Home Location</h4>
                    <p className="text-sm text-green-700">Your registered home address</p>
                    <p className="text-xs text-green-600 mt-1">
                      {homeLocation[0].toFixed(6)}, {homeLocation[1].toFixed(6)}
                    </p>
                  </div>
                </div>
              )}

              {/* Pickup Locations */}
              {locations.length > 0 ? (
                locations.map((location) => (
                  <div
                    key={location.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      onLocationClick 
                        ? "cursor-pointer hover:bg-muted/50" 
                        : "",
                      location.is_default 
                        ? "bg-blue-50 border-blue-200" 
                        : "bg-muted/20 border-border"
                    )}
                    onClick={() => onLocationClick?.(location)}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      location.is_default 
                        ? "bg-blue-500" 
                        : "bg-gray-500"
                    )}>
                      <Navigation className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={cn(
                          "font-medium",
                          location.is_default 
                            ? "text-blue-900" 
                            : "text-foreground"
                        )}>
                          {location.name}
                        </h4>
                        {location.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className={cn(
                        "text-sm",
                        location.is_default 
                          ? "text-blue-700" 
                          : "text-muted-foreground"
                      )}>
                        {location.description}
                      </p>
                      <p className={cn(
                        "text-xs mt-1",
                        location.is_default 
                          ? "text-blue-600" 
                          : "text-muted-foreground"
                      )}>
                        {location.coords[0].toFixed(6)}, {location.coords[1].toFixed(6)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No pickup locations added yet</p>
                  <p className="text-sm">Add your first pickup location to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
