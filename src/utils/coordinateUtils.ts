/**
 * Coordinate Utilities
 * 
 * This module provides utilities for handling coordinate conversions between different formats
 * used throughout the application. The main challenge is that different systems use different
 * coordinate orders:
 * 
 * - PostGIS/Database: POINT(lng lat) - longitude first, latitude second
 * - Leaflet/Maps: [lat, lng] - latitude first, longitude second
 * - Google Maps: {lat, lng} - latitude first, longitude second
 * 
 * This utility ensures consistent handling across the application.
 */

export type LatLng = [number, number] // [latitude, longitude]
export type LngLat = [number, number] // [longitude, latitude]

export interface LatLngObject {
  lat: number
  lng: number
}

/**
 * Convert from display format [lat, lng] to PostGIS format [lng, lat]
 */
export const toPostGISCoords = (coords: LatLng): LngLat => {
  const [lat, lng] = coords
  return [lng, lat]
}

/**
 * Convert from PostGIS format [lng, lat] to display format [lat, lng]
 */
export const fromPostGISCoords = (coords: LngLat): LatLng => {
  const [lng, lat] = coords
  return [lat, lng]
}

/**
 * Convert LatLng array to object format
 */
export const toLatLngObject = (coords: LatLng): LatLngObject => {
  const [lat, lng] = coords
  return { lat, lng }
}

/**
 * Convert LatLng object to array format
 */
export const fromLatLngObject = (coords: LatLngObject): LatLng => {
  return [coords.lat, coords.lng]
}

/**
 * Create PostGIS POINT string from display coordinates
 */
export const createPostGISPoint = (coords: LatLng): string => {
  const [lat, lng] = coords
  return `POINT(${lng} ${lat})` // PostGIS uses lng lat order
}

/**
 * Parse PostGIS POINT string to display coordinates
 */
export const parsePostGISPoint = (pointString: string): LatLng | null => {
  if (typeof pointString !== 'string') {
    return null
  }

  const match = pointString.match(/POINT\(([^)]+)\)/)
  if (!match) {
    return null
  }

  const [lng, lat] = match[1].split(' ').map(Number)
  if (isNaN(lng) || isNaN(lat)) {
    return null
  }

  return [lat, lng] // Return as [lat, lng] for display
}

/**
 * Parse various coordinate formats to consistent LatLng format
 */
export const parseCoordinates = (coords: any): LatLng | null => {
  // Handle PostGIS POINT string
  if (typeof coords === 'string') {
    return parsePostGISPoint(coords)
  }

  // Handle array format
  if (Array.isArray(coords) && coords.length === 2) {
    const [first, second] = coords.map(Number)
    if (isNaN(first) || isNaN(second)) {
      return null
    }

    // Assume it's [lng, lat] from PostGIS if values suggest longitude first
    // Longitude is typically between -180 and 180
    // Latitude is typically between -90 and 90
    // For Bangladesh, lng is around 90, lat is around 23
    if (Math.abs(first) > Math.abs(second) && Math.abs(first) > 50) {
      // Likely [lng, lat] format
      return [second, first] // Convert to [lat, lng]
    } else {
      // Likely already [lat, lng] format
      return [first, second]
    }
  }

  // Handle object format
  if (coords && typeof coords === 'object' && 'lat' in coords && 'lng' in coords) {
    return [coords.lat, coords.lng]
  }

  return null
}

/**
 * Validate coordinates are within reasonable bounds
 */
export const validateCoordinates = (coords: LatLng): boolean => {
  const [lat, lng] = coords
  return (
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  )
}

/**
 * Get default coordinates for Dhaka, Bangladesh
 */
export const getDefaultCoordinates = (): LatLng => {
  return [23.8103, 90.4125] // Dhaka coordinates [lat, lng]
}

/**
 * Calculate distance between two coordinates in kilometers
 */
export const calculateDistance = (coord1: LatLng, coord2: LatLng): number => {
  const [lat1, lng1] = coord1
  const [lat2, lng2] = coord2

  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

/**
 * Format coordinates for display
 */
export const formatCoordinates = (coords: LatLng, precision: number = 6): string => {
  const [lat, lng] = coords
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`
}

/**
 * Check if coordinates are approximately equal (within tolerance)
 */
export const coordinatesEqual = (coord1: LatLng, coord2: LatLng, tolerance: number = 0.0001): boolean => {
  const [lat1, lng1] = coord1
  const [lat2, lng2] = coord2
  return Math.abs(lat1 - lat2) < tolerance && Math.abs(lng1 - lng2) < tolerance
}
