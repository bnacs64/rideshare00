import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { locationService } from '../services/locationService'
import type { LocationResult, GeocodeResult, LocationError } from '../services/locationService'

interface LocationContextType {
  currentLocation: LocationResult | null
  isLocationLoading: boolean
  locationError: LocationError | null
  isLocationPermissionGranted: boolean
  getCurrentLocation: (useCache?: boolean) => Promise<LocationResult | null>
  watchLocation: () => void
  stopWatchingLocation: () => void
  clearLocationError: () => void
  requestLocationPermission: () => Promise<boolean>
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export const useLocation = () => {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}

interface LocationProviderProps {
  children: React.ReactNode
  autoRequestLocation?: boolean
  watchLocationChanges?: boolean
}

export const LocationProvider: React.FC<LocationProviderProps> = ({
  children,
  autoRequestLocation = false,
  watchLocationChanges = false
}) => {
  const [currentLocation, setCurrentLocation] = useState<LocationResult | null>(null)
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<LocationError | null>(null)
  const [isLocationPermissionGranted, setIsLocationPermissionGranted] = useState(false)
  const [watchId, setWatchId] = useState<number | null>(null)

  // Check if geolocation is supported
  const isGeolocationSupported = 'geolocation' in navigator

  // Request location permission
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    if (!isGeolocationSupported) {
      setLocationError({
        code: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported by this browser'
      })
      return false
    }

    try {
      // Try to get location to check permission
      const location = await locationService.getCurrentLocation({
        timeout: 5000,
        useCache: false
      })
      
      setIsLocationPermissionGranted(true)
      setCurrentLocation(location)
      setLocationError(null)
      return true
    } catch (error) {
      const locationError = error as LocationError
      setLocationError(locationError)
      setIsLocationPermissionGranted(locationError.code !== 'PERMISSION_DENIED')
      return false
    }
  }, [isGeolocationSupported])

  // Get current location
  const getCurrentLocation = useCallback(async (useCache = true): Promise<LocationResult | null> => {
    if (!isGeolocationSupported) {
      setLocationError({
        code: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported by this browser'
      })
      return null
    }

    setIsLocationLoading(true)
    setLocationError(null)

    try {
      const location = await locationService.getCurrentLocation({
        useCache,
        timeout: 10000,
        enableHighAccuracy: true
      })
      
      setCurrentLocation(location)
      setIsLocationPermissionGranted(true)
      return location
    } catch (error) {
      const locationError = error as LocationError
      setLocationError(locationError)
      
      // If permission denied, update permission status
      if (locationError.code === 'PERMISSION_DENIED') {
        setIsLocationPermissionGranted(false)
      }
      
      return null
    } finally {
      setIsLocationLoading(false)
    }
  }, [isGeolocationSupported])

  // Watch location changes
  const watchLocation = useCallback(() => {
    if (!isGeolocationSupported || watchId !== null) {
      return
    }

    const id = locationService.watchLocation(
      (location) => {
        setCurrentLocation(location)
        setLocationError(null)
        setIsLocationPermissionGranted(true)
      },
      (error) => {
        setLocationError(error)
        if (error.code === 'PERMISSION_DENIED') {
          setIsLocationPermissionGranted(false)
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )

    if (id !== null) {
      setWatchId(id)
    }
  }, [isGeolocationSupported, watchId])

  // Stop watching location
  const stopWatchingLocation = useCallback(() => {
    if (watchId !== null) {
      locationService.clearWatch(watchId)
      setWatchId(null)
    }
  }, [watchId])

  // Clear location error
  const clearLocationError = useCallback(() => {
    setLocationError(null)
  }, [])

  // Initialize location on mount
  useEffect(() => {
    if (autoRequestLocation) {
      getCurrentLocation(true)
    }
  }, [autoRequestLocation, getCurrentLocation])

  // Start watching location if enabled
  useEffect(() => {
    if (watchLocationChanges && isLocationPermissionGranted) {
      watchLocation()
    }

    return () => {
      if (watchLocationChanges) {
        stopWatchingLocation()
      }
    }
  }, [watchLocationChanges, isLocationPermissionGranted, watchLocation, stopWatchingLocation])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatchingLocation()
    }
  }, [stopWatchingLocation])

  // Check for cached location on mount
  useEffect(() => {
    const lastKnownLocation = locationService.getLastKnownLocation()
    if (lastKnownLocation && !currentLocation) {
      setCurrentLocation(lastKnownLocation)
    }
  }, [currentLocation])

  const value: LocationContextType = {
    currentLocation,
    isLocationLoading,
    locationError,
    isLocationPermissionGranted,
    getCurrentLocation,
    watchLocation,
    stopWatchingLocation,
    clearLocationError,
    requestLocationPermission
  }

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  )
}

// Hook for location permission status
export const useLocationPermission = () => {
  const { isLocationPermissionGranted, requestLocationPermission } = useLocation()
  return { isLocationPermissionGranted, requestLocationPermission }
}

// Hook for current location only
export const useCurrentLocation = () => {
  const { currentLocation, isLocationLoading, locationError, getCurrentLocation } = useLocation()
  return { currentLocation, isLocationLoading, locationError, getCurrentLocation }
}

// Hook for location watching
export const useLocationWatcher = () => {
  const { watchLocation, stopWatchingLocation } = useLocation()
  return { watchLocation, stopWatchingLocation }
}
