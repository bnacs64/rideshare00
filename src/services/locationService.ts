/**
 * Enhanced Location Service for NSU Commute
 * Provides geolocation, geocoding, and location caching functionality
 */

export interface LocationResult {
  lat: number
  lng: number
  accuracy?: number
  timestamp: number
}

export interface GeocodeResult {
  lat: number
  lng: number
  address: string
  city?: string
  country?: string
  postcode?: string
}

export interface LocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED' | 'NETWORK_ERROR'
  message: string
}

class LocationService {
  private lastKnownLocation: LocationResult | null = null
  private locationCache = new Map<string, GeocodeResult>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly DHAKA_COORDS: [number, number] = [23.8103, 90.4125]

  /**
   * Get current location with enhanced error handling and caching
   */
  async getCurrentLocation(options?: {
    enableHighAccuracy?: boolean
    timeout?: number
    maximumAge?: number
    useCache?: boolean
  }): Promise<LocationResult> {
    const {
      enableHighAccuracy = true,
      timeout = 10000,
      maximumAge = 60000,
      useCache = true
    } = options || {}

    // Return cached location if available and recent
    if (useCache && this.lastKnownLocation) {
      const age = Date.now() - this.lastKnownLocation.timestamp
      if (age < maximumAge) {
        return this.lastKnownLocation
      }
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({
          code: 'NOT_SUPPORTED',
          message: 'Geolocation is not supported by this browser'
        } as LocationError)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const result: LocationResult = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          }
          
          this.lastKnownLocation = result
          resolve(result)
        },
        (error) => {
          let locationError: LocationError
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              locationError = {
                code: 'PERMISSION_DENIED',
                message: 'Location access denied by user'
              }
              break
            case error.POSITION_UNAVAILABLE:
              locationError = {
                code: 'POSITION_UNAVAILABLE',
                message: 'Location information is unavailable'
              }
              break
            case error.TIMEOUT:
              locationError = {
                code: 'TIMEOUT',
                message: 'Location request timed out'
              }
              break
            default:
              locationError = {
                code: 'POSITION_UNAVAILABLE',
                message: 'An unknown error occurred'
              }
          }
          
          reject(locationError)
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge
        }
      )
    })
  }

  /**
   * Watch location changes
   */
  watchLocation(
    onLocationUpdate: (location: LocationResult) => void,
    onError: (error: LocationError) => void,
    options?: {
      enableHighAccuracy?: boolean
      timeout?: number
      maximumAge?: number
    }
  ): number | null {
    if (!navigator.geolocation) {
      onError({
        code: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported by this browser'
      })
      return null
    }

    const {
      enableHighAccuracy = true,
      timeout = 10000,
      maximumAge = 60000
    } = options || {}

    return navigator.geolocation.watchPosition(
      (position) => {
        const result: LocationResult = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        }
        
        this.lastKnownLocation = result
        onLocationUpdate(result)
      },
      (error) => {
        let locationError: LocationError
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            locationError = {
              code: 'PERMISSION_DENIED',
              message: 'Location access denied by user'
            }
            break
          case error.POSITION_UNAVAILABLE:
            locationError = {
              code: 'POSITION_UNAVAILABLE',
              message: 'Location information is unavailable'
            }
            break
          case error.TIMEOUT:
            locationError = {
              code: 'TIMEOUT',
              message: 'Location request timed out'
            }
            break
          default:
            locationError = {
              code: 'POSITION_UNAVAILABLE',
              message: 'An unknown error occurred'
            }
        }
        
        onError(locationError)
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    )
  }

  /**
   * Stop watching location
   */
  clearWatch(watchId: number): void {
    if (navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId)
    }
  }

  /**
   * Geocode address to coordinates
   */
  async geocodeAddress(address: string): Promise<GeocodeResult[]> {
    const cacheKey = `geocode:${address.toLowerCase()}`
    
    // Check cache first
    if (this.locationCache.has(cacheKey)) {
      const cached = this.locationCache.get(cacheKey)!
      return [cached]
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&countrycodes=bd&addressdetails=1`
      )
      
      if (!response.ok) {
        throw new Error('Geocoding request failed')
      }
      
      const data = await response.json()
      
      const results: GeocodeResult[] = data.map((item: any) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.display_name,
        city: item.address?.city || item.address?.town || item.address?.village,
        country: item.address?.country,
        postcode: item.address?.postcode
      }))
      
      // Cache the first result
      if (results.length > 0) {
        this.locationCache.set(cacheKey, results[0])
        
        // Clean up old cache entries
        setTimeout(() => {
          this.locationCache.delete(cacheKey)
        }, this.CACHE_DURATION)
      }
      
      return results
    } catch (error) {
      console.error('Geocoding error:', error)
      throw {
        code: 'NETWORK_ERROR',
        message: 'Failed to geocode address'
      } as LocationError
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
    const cacheKey = `reverse:${lat.toFixed(6)},${lng.toFixed(6)}`
    
    // Check cache first
    if (this.locationCache.has(cacheKey)) {
      return this.locationCache.get(cacheKey)!
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      )
      
      if (!response.ok) {
        throw new Error('Reverse geocoding request failed')
      }
      
      const data = await response.json()
      
      const result: GeocodeResult = {
        lat,
        lng,
        address: data.display_name || 'Unknown location',
        city: data.address?.city || data.address?.town || data.address?.village,
        country: data.address?.country,
        postcode: data.address?.postcode
      }
      
      // Cache the result
      this.locationCache.set(cacheKey, result)
      
      // Clean up old cache entries
      setTimeout(() => {
        this.locationCache.delete(cacheKey)
      }, this.CACHE_DURATION)
      
      return result
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      throw {
        code: 'NETWORK_ERROR',
        message: 'Failed to reverse geocode coordinates'
      } as LocationError
    }
  }

  /**
   * Calculate distance between two points (in kilometers)
   */
  calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat)
    const dLng = this.toRadians(point2.lng - point1.lng)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Get default location (Dhaka, Bangladesh)
   */
  getDefaultLocation(): LocationResult {
    return {
      lat: this.DHAKA_COORDS[0],
      lng: this.DHAKA_COORDS[1],
      timestamp: Date.now()
    }
  }

  /**
   * Check if location is within Bangladesh (approximate bounds)
   */
  isLocationInBangladesh(lat: number, lng: number): boolean {
    return lat >= 20.5 && lat <= 26.5 && lng >= 88.0 && lng <= 92.7
  }

  /**
   * Get last known location
   */
  getLastKnownLocation(): LocationResult | null {
    return this.lastKnownLocation
  }

  /**
   * Clear location cache
   */
  clearCache(): void {
    this.locationCache.clear()
    this.lastKnownLocation = null
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}

// Export singleton instance
export const locationService = new LocationService()
export default locationService

// Re-export types for external use
export { LocationResult, GeocodeResult, LocationError }
