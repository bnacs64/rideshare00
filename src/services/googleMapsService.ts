// Google Maps API Service for route optimization and distance calculations
// Alternative to Uber API for route planning

export interface GoogleMapsConfig {
  apiKey: string
}

export interface GoogleDirectionsRequest {
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
  waypoints?: Array<{
    location: { lat: number; lng: number }
    stopover: boolean
  }>
  optimizeWaypoints?: boolean
  travelMode?: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT'
}

export interface GoogleDirectionsResponse {
  routes: Array<{
    legs: Array<{
      distance: { text: string; value: number }
      duration: { text: string; value: number }
      start_address: string
      end_address: string
      start_location: { lat: number; lng: number }
      end_location: { lat: number; lng: number }
    }>
    waypoint_order?: number[]
    overview_polyline: { points: string }
  }>
  status: string
}

export interface DistanceMatrixRequest {
  origins: Array<{ lat: number; lng: number }>
  destinations: Array<{ lat: number; lng: number }>
  travelMode?: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT'
}

export interface DistanceMatrixResponse {
  rows: Array<{
    elements: Array<{
      distance: { text: string; value: number }
      duration: { text: string; value: number }
      status: string
    }>
  }>
  status: string
}

export interface OptimizedRoute {
  waypoints: Array<{
    location: { lat: number; lng: number }
    address?: string
    user_id?: string
    order: number
  }>
  total_distance: number // in meters
  total_duration: number // in seconds
  estimated_cost: number // in BDT
  cost_per_person: number // in BDT
  pickup_etas: { [user_id: string]: string }
  polyline?: string
}

class GoogleMapsService {
  private config: GoogleMapsConfig
  private baseUrl = 'https://maps.googleapis.com/maps/api'

  constructor() {
    this.config = {
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
    }
  }

  /**
   * Check if Google Maps API is properly configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey
  }

  /**
   * Get optimized route using Google Directions API
   */
  async getOptimizedRoute(request: GoogleDirectionsRequest): Promise<{ route: OptimizedRoute | null; error?: string }> {
    if (!this.isConfigured()) {
      return { route: null, error: 'Google Maps API not configured' }
    }

    try {
      const params = new URLSearchParams({
        origin: `${request.origin.lat},${request.origin.lng}`,
        destination: `${request.destination.lat},${request.destination.lng}`,
        key: this.config.apiKey,
        mode: request.travelMode?.toLowerCase() || 'driving'
      })

      if (request.waypoints && request.waypoints.length > 0) {
        const waypointsStr = request.waypoints
          .map(wp => `${wp.location.lat},${wp.location.lng}`)
          .join('|')
        params.append('waypoints', request.optimizeWaypoints ? `optimize:true|${waypointsStr}` : waypointsStr)
      }

      const response = await fetch(`${this.baseUrl}/directions/json?${params}`)
      
      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.status} ${response.statusText}`)
      }

      const data: GoogleDirectionsResponse = await response.json()

      if (data.status !== 'OK') {
        throw new Error(`Google Directions API error: ${data.status}`)
      }

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes found')
      }

      const route = data.routes[0]
      return { route: this.processDirectionsResponse(route, request) }

    } catch (error) {
      console.error('Error getting optimized route:', error)
      return {
        route: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get distance matrix for multiple origins and destinations
   */
  async getDistanceMatrix(request: DistanceMatrixRequest): Promise<{ matrix: DistanceMatrixResponse | null; error?: string }> {
    if (!this.isConfigured()) {
      return { matrix: null, error: 'Google Maps API not configured' }
    }

    try {
      const originsStr = request.origins
        .map(origin => `${origin.lat},${origin.lng}`)
        .join('|')
      
      const destinationsStr = request.destinations
        .map(dest => `${dest.lat},${dest.lng}`)
        .join('|')

      const params = new URLSearchParams({
        origins: originsStr,
        destinations: destinationsStr,
        key: this.config.apiKey,
        mode: request.travelMode?.toLowerCase() || 'driving',
        units: 'metric'
      })

      const response = await fetch(`${this.baseUrl}/distancematrix/json?${params}`)
      
      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.status} ${response.statusText}`)
      }

      const data: DistanceMatrixResponse = await response.json()

      if (data.status !== 'OK') {
        throw new Error(`Google Distance Matrix API error: ${data.status}`)
      }

      return { matrix: data }

    } catch (error) {
      console.error('Error getting distance matrix:', error)
      return {
        matrix: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Optimize route for multiple pickup points
   */
  async optimizePickupRoute(
    startPoint: { lat: number; lng: number },
    endPoint: { lat: number; lng: number },
    pickupPoints: Array<{
      lat: number
      lng: number
      address?: string
      user_id?: string
    }>
  ): Promise<{ route: OptimizedRoute | null; error?: string }> {
    if (pickupPoints.length === 0) {
      return { route: null, error: 'No pickup points provided' }
    }

    try {
      // Use Google Directions API with waypoint optimization
      const waypoints = pickupPoints.map(point => ({
        location: { lat: point.lat, lng: point.lng },
        stopover: true
      }))

      const directionsRequest: GoogleDirectionsRequest = {
        origin: startPoint,
        destination: endPoint,
        waypoints,
        optimizeWaypoints: true,
        travelMode: 'DRIVING'
      }

      const { route, error } = await this.getOptimizedRoute(directionsRequest)
      
      if (error || !route) {
        // Fallback to local optimization if Google API fails
        return this.optimizeRouteLocally(startPoint, endPoint, pickupPoints)
      }

      return { route }

    } catch (error) {
      console.error('Error optimizing pickup route:', error)
      return this.optimizeRouteLocally(startPoint, endPoint, pickupPoints)
    }
  }

  /**
   * Process Google Directions API response into our route format
   */
  private processDirectionsResponse(
    route: GoogleDirectionsResponse['routes'][0],
    request: GoogleDirectionsRequest
  ): OptimizedRoute {
    let totalDistance = 0
    let totalDuration = 0
    const pickupEtas: { [user_id: string]: string } = {}
    
    // Calculate totals from route legs
    route.legs.forEach(leg => {
      totalDistance += leg.distance.value
      totalDuration += leg.duration.value
    })

    // Calculate pickup ETAs
    let currentTime = new Date()
    const waypoints: OptimizedRoute['waypoints'] = []

    if (request.waypoints) {
      const waypointOrder = route.waypoint_order || request.waypoints.map((_, i) => i)
      
      waypointOrder.forEach((originalIndex, newIndex) => {
        const waypoint = request.waypoints![originalIndex]
        const leg = route.legs[newIndex]
        
        // Add duration to current time for ETA
        currentTime = new Date(currentTime.getTime() + leg.duration.value * 1000)
        
        waypoints.push({
          location: waypoint.location,
          order: newIndex + 1
        })
      })
    }

    // Estimate cost based on distance and duration
    const estimatedCost = this.estimateCost(totalDistance, totalDuration, waypoints.length + 1)
    const costPerPerson = Math.round(estimatedCost / (waypoints.length + 1))

    return {
      waypoints,
      total_distance: totalDistance,
      total_duration: totalDuration,
      estimated_cost: estimatedCost,
      cost_per_person: costPerPerson,
      pickup_etas: pickupEtas,
      polyline: route.overview_polyline?.points
    }
  }

  /**
   * Local route optimization fallback
   */
  private async optimizeRouteLocally(
    startPoint: { lat: number; lng: number },
    endPoint: { lat: number; lng: number },
    pickupPoints: Array<{
      lat: number
      lng: number
      address?: string
      user_id?: string
    }>
  ): Promise<{ route: OptimizedRoute | null; error?: string }> {
    try {
      // Simple nearest neighbor optimization
      const optimizedPoints = this.nearestNeighborOptimization(startPoint, pickupPoints)
      
      let totalDistance = 0
      let totalDuration = 0
      const pickupEtas: { [user_id: string]: string } = {}
      
      let currentPoint = startPoint
      let currentTime = new Date()
      
      // Calculate distances and ETAs
      for (let i = 0; i < optimizedPoints.length; i++) {
        const point = optimizedPoints[i]
        const distance = this.calculateDistance(currentPoint, point)
        const duration = this.estimateDuration(distance)
        
        totalDistance += distance
        totalDuration += duration
        
        currentTime = new Date(currentTime.getTime() + duration * 1000)
        if (point.user_id) {
          pickupEtas[point.user_id] = currentTime.toISOString()
        }
        
        currentPoint = point
      }
      
      // Add final leg to destination
      const finalDistance = this.calculateDistance(currentPoint, endPoint)
      const finalDuration = this.estimateDuration(finalDistance)
      totalDistance += finalDistance
      totalDuration += finalDuration
      
      const estimatedCost = this.estimateCost(totalDistance, totalDuration, pickupPoints.length + 1)
      const costPerPerson = Math.round(estimatedCost / (pickupPoints.length + 1))
      
      return {
        route: {
          waypoints: optimizedPoints.map((point, index) => ({
            location: { lat: point.lat, lng: point.lng },
            address: point.address,
            user_id: point.user_id,
            order: index + 1
          })),
          total_distance: totalDistance,
          total_duration: totalDuration,
          estimated_cost: estimatedCost,
          cost_per_person: costPerPerson,
          pickup_etas: pickupEtas
        }
      }
    } catch (error) {
      console.error('Error in local route optimization:', error)
      return {
        route: null,
        error: error instanceof Error ? error.message : 'Local optimization failed'
      }
    }
  }

  /**
   * Nearest neighbor optimization algorithm
   */
  private nearestNeighborOptimization(
    startPoint: { lat: number; lng: number },
    points: Array<{ lat: number; lng: number; address?: string; user_id?: string }>
  ) {
    const unvisited = [...points]
    const optimized: typeof points = []
    let currentPoint = startPoint
    
    while (unvisited.length > 0) {
      let nearestIndex = 0
      let nearestDistance = this.calculateDistance(currentPoint, unvisited[0])
      
      for (let i = 1; i < unvisited.length; i++) {
        const distance = this.calculateDistance(currentPoint, unvisited[i])
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestIndex = i
        }
      }
      
      const nearest = unvisited.splice(nearestIndex, 1)[0]
      optimized.push(nearest)
      currentPoint = nearest
    }
    
    return optimized
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371000 // Earth's radius in meters
    const lat1Rad = (point1.lat * Math.PI) / 180
    const lat2Rad = (point2.lat * Math.PI) / 180
    const deltaLatRad = ((point2.lat - point1.lat) * Math.PI) / 180
    const deltaLngRad = ((point2.lng - point1.lng) * Math.PI) / 180

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  /**
   * Estimate duration based on distance (Dhaka traffic conditions)
   */
  private estimateDuration(distanceMeters: number): number {
    // Average speed in Dhaka: 25 km/h
    const averageSpeedKmh = 25
    const averageSpeedMs = averageSpeedKmh * 1000 / 3600
    return Math.round(distanceMeters / averageSpeedMs)
  }

  /**
   * Estimate cost based on distance, duration, and passenger count
   */
  private estimateCost(distanceMeters: number, durationSeconds: number, passengerCount: number): number {
    const baseFare = 50 // BDT
    const perKmRate = 12 // BDT per km
    const perMinuteRate = 2 // BDT per minute
    
    const distanceKm = distanceMeters / 1000
    const durationMinutes = durationSeconds / 60
    
    const totalCost = baseFare + (distanceKm * perKmRate) + (durationMinutes * perMinuteRate)
    
    // Apply discount for multiple passengers
    const discountFactor = Math.max(0.8, 1 - (passengerCount - 1) * 0.05)
    
    return Math.round(totalCost * discountFactor)
  }
}

export const googleMapsService = new GoogleMapsService()
