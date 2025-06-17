// Uber API Service for route optimization and cost estimation
// Note: Uber API requires approval for production use
// This service includes fallback methods using Google Maps API

export interface UberEstimateRequest {
  start_latitude: number
  start_longitude: number
  end_latitude: number
  end_longitude: number
  waypoints?: Array<{
    latitude: number
    longitude: number
  }>
}

export interface UberProduct {
  product_id: string
  display_name: string
  description: string
  capacity: number
  image: string
}

export interface UberPriceEstimate {
  product_id: string
  currency_code: string
  display_name: string
  estimate: string
  low_estimate: number
  high_estimate: number
  surge_multiplier: number
  duration: number // in seconds
  distance: number // in meters
}

export interface UberTimeEstimate {
  product_id: string
  display_name: string
  estimate: number // in seconds
}

export interface RouteOptimizationResult {
  optimized_waypoints: Array<{
    latitude: number
    longitude: number
    address?: string
    user_id?: string
    pickup_order: number
  }>
  total_distance: number // in meters
  total_duration: number // in seconds
  estimated_cost: number // in BDT
  cost_per_person: number // in BDT
  pickup_etas: { [user_id: string]: string } // ISO time strings
}

export interface UberServiceConfig {
  client_id: string
  client_secret: string
  server_token?: string
  use_sandbox: boolean
}

class UberService {
  private config: UberServiceConfig
  private baseUrl: string

  constructor() {
    this.config = {
      client_id: import.meta.env.VITE_UBER_CLIENT_ID || '',
      client_secret: import.meta.env.VITE_UBER_CLIENT_SECRET || '',
      server_token: import.meta.env.VITE_UBER_SERVER_TOKEN || '',
      use_sandbox: import.meta.env.VITE_UBER_USE_SANDBOX === 'true'
    }

    this.baseUrl = this.config.use_sandbox 
      ? 'https://sandbox-api.uber.com/v1.2'
      : 'https://api.uber.com/v1.2'
  }

  /**
   * Check if Uber API is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.client_id && this.config.client_secret)
  }

  /**
   * Get available Uber products for a location
   */
  async getProducts(latitude: number, longitude: number): Promise<{ products: UberProduct[]; error?: string }> {
    if (!this.isConfigured()) {
      return { products: [], error: 'Uber API not configured' }
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/products?latitude=${latitude}&longitude=${longitude}`,
        {
          headers: {
            'Authorization': `Token ${this.config.server_token}`,
            'Accept-Language': 'en_US',
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Uber API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return { products: data.products || [] }
    } catch (error) {
      console.error('Error fetching Uber products:', error)
      return { 
        products: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get price estimates for a route
   */
  async getPriceEstimates(request: UberEstimateRequest): Promise<{ estimates: UberPriceEstimate[]; error?: string }> {
    if (!this.isConfigured()) {
      return { estimates: [], error: 'Uber API not configured' }
    }

    try {
      const params = new URLSearchParams({
        start_latitude: request.start_latitude.toString(),
        start_longitude: request.start_longitude.toString(),
        end_latitude: request.end_latitude.toString(),
        end_longitude: request.end_longitude.toString()
      })

      const response = await fetch(
        `${this.baseUrl}/estimates/price?${params}`,
        {
          headers: {
            'Authorization': `Token ${this.config.server_token}`,
            'Accept-Language': 'en_US',
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Uber API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return { estimates: data.prices || [] }
    } catch (error) {
      console.error('Error fetching Uber price estimates:', error)
      return { 
        estimates: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get time estimates for pickup
   */
  async getTimeEstimates(latitude: number, longitude: number): Promise<{ estimates: UberTimeEstimate[]; error?: string }> {
    if (!this.isConfigured()) {
      return { estimates: [], error: 'Uber API not configured' }
    }

    try {
      const params = new URLSearchParams({
        start_latitude: latitude.toString(),
        start_longitude: longitude.toString()
      })

      const response = await fetch(
        `${this.baseUrl}/estimates/time?${params}`,
        {
          headers: {
            'Authorization': `Token ${this.config.server_token}`,
            'Accept-Language': 'en_US',
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Uber API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return { estimates: data.times || [] }
    } catch (error) {
      console.error('Error fetching Uber time estimates:', error)
      return { 
        estimates: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Optimize route with multiple waypoints
   * This is a fallback implementation using distance calculations
   * In production, this would use Uber's route optimization API
   */
  async optimizeRoute(
    startPoint: { latitude: number; longitude: number },
    endPoint: { latitude: number; longitude: number },
    waypoints: Array<{
      latitude: number
      longitude: number
      address?: string
      user_id?: string
    }>
  ): Promise<{ result: RouteOptimizationResult; error?: string }> {
    try {
      // If Uber API is available, try to use it first
      if (this.isConfigured()) {
        const uberResult = await this.optimizeRouteWithUber(startPoint, endPoint, waypoints)
        if (uberResult.result) {
          return uberResult
        }
      }

      // Fallback to local optimization algorithm
      return this.optimizeRouteLocal(startPoint, endPoint, waypoints)
    } catch (error) {
      console.error('Error optimizing route:', error)
      return {
        result: this.createEmptyResult(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Optimize route using Uber API (when available)
   */
  private async optimizeRouteWithUber(
    startPoint: { latitude: number; longitude: number },
    endPoint: { latitude: number; longitude: number },
    waypoints: Array<{
      latitude: number
      longitude: number
      address?: string
      user_id?: string
    }>
  ): Promise<{ result: RouteOptimizationResult | null; error?: string }> {
    // This would implement Uber's route optimization API
    // For now, return null to fall back to local optimization
    return { result: null, error: 'Uber route optimization not available' }
  }

  /**
   * Local route optimization algorithm (fallback)
   */
  private async optimizeRouteLocal(
    startPoint: { latitude: number; longitude: number },
    endPoint: { latitude: number; longitude: number },
    waypoints: Array<{
      latitude: number
      longitude: number
      address?: string
      user_id?: string
    }>
  ): Promise<{ result: RouteOptimizationResult; error?: string }> {
    try {
      // Simple nearest neighbor algorithm for route optimization
      const optimizedWaypoints = this.nearestNeighborOptimization(startPoint, waypoints)
      
      // Calculate total distance and duration
      let totalDistance = 0
      let totalDuration = 0
      const pickupEtas: { [user_id: string]: string } = {}
      
      let currentPoint = startPoint
      let currentTime = new Date()
      
      for (let i = 0; i < optimizedWaypoints.length; i++) {
        const waypoint = optimizedWaypoints[i]
        const distance = this.calculateDistance(currentPoint, waypoint)
        const duration = this.estimateDuration(distance)
        
        totalDistance += distance
        totalDuration += duration
        
        // Calculate ETA for this pickup
        currentTime = new Date(currentTime.getTime() + duration * 1000)
        if (waypoint.user_id) {
          pickupEtas[waypoint.user_id] = currentTime.toISOString()
        }
        
        currentPoint = waypoint
      }
      
      // Add distance from last waypoint to destination
      const finalDistance = this.calculateDistance(currentPoint, endPoint)
      const finalDuration = this.estimateDuration(finalDistance)
      totalDistance += finalDistance
      totalDuration += finalDuration
      
      // Estimate cost (base fare + distance + time in Dhaka)
      const estimatedCost = this.estimateCost(totalDistance, totalDuration, waypoints.length + 1)
      const costPerPerson = Math.round(estimatedCost / (waypoints.length + 1))
      
      return {
        result: {
          optimized_waypoints: optimizedWaypoints.map((wp, index) => ({
            ...wp,
            pickup_order: index + 1
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
        result: this.createEmptyResult(),
        error: error instanceof Error ? error.message : 'Local optimization failed'
      }
    }
  }

  /**
   * Simple nearest neighbor algorithm for waypoint optimization
   */
  private nearestNeighborOptimization(
    startPoint: { latitude: number; longitude: number },
    waypoints: Array<{
      latitude: number
      longitude: number
      address?: string
      user_id?: string
    }>
  ) {
    const unvisited = [...waypoints]
    const optimized: typeof waypoints = []
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
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371000 // Earth's radius in meters
    const lat1Rad = (point1.latitude * Math.PI) / 180
    const lat2Rad = (point2.latitude * Math.PI) / 180
    const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180
    const deltaLngRad = ((point2.longitude - point1.longitude) * Math.PI) / 180

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  /**
   * Estimate duration based on distance (accounting for Dhaka traffic)
   */
  private estimateDuration(distanceMeters: number): number {
    // Average speed in Dhaka: 20 km/h during peak hours, 30 km/h off-peak
    const averageSpeedKmh = 25
    const averageSpeedMs = averageSpeedKmh * 1000 / 3600
    return Math.round(distanceMeters / averageSpeedMs)
  }

  /**
   * Estimate cost based on distance, duration, and number of passengers
   */
  private estimateCost(distanceMeters: number, durationSeconds: number, passengerCount: number): number {
    // Dhaka ride-sharing cost structure (approximate)
    const baseFare = 50 // BDT
    const perKmRate = 12 // BDT per km
    const perMinuteRate = 2 // BDT per minute
    
    const distanceKm = distanceMeters / 1000
    const durationMinutes = durationSeconds / 60
    
    const totalCost = baseFare + (distanceKm * perKmRate) + (durationMinutes * perMinuteRate)
    
    // Apply slight discount for multiple passengers
    const discountFactor = Math.max(0.8, 1 - (passengerCount - 1) * 0.05)
    
    return Math.round(totalCost * discountFactor)
  }

  /**
   * Create empty result for error cases
   */
  private createEmptyResult(): RouteOptimizationResult {
    return {
      optimized_waypoints: [],
      total_distance: 0,
      total_duration: 0,
      estimated_cost: 0,
      cost_per_person: 0,
      pickup_etas: {}
    }
  }
}

export const uberService = new UberService()
