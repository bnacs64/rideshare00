import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

// Get the Gemini 1.5 Pro model
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

export interface MatchingRequest {
  targetOptIn: {
    id: string
    user_id: string
    commute_date: string
    time_window_start: string
    time_window_end: string
    pickup_location: {
      id: string
      name: string
      coords: [number, number] // [lng, lat]
      description?: string
    }
    user: {
      id: string
      full_name: string
      default_role: 'DRIVER' | 'RIDER'
      driver_details?: {
        car_model: string
        capacity: number
        license_plate?: string
        car_color?: string
      }
    }
  }
  availableOptIns: Array<{
    id: string
    user_id: string
    commute_date: string
    time_window_start: string
    time_window_end: string
    pickup_location: {
      id: string
      name: string
      coords: [number, number] // [lng, lat]
      description?: string
    }
    user: {
      id: string
      full_name: string
      default_role: 'DRIVER' | 'RIDER'
      driver_details?: {
        car_model: string
        capacity: number
        license_plate?: string
        car_color?: string
      }
    }
  }>
  nsuLocation: [number, number] // [lng, lat] - NSU coordinates
}

export interface MatchingResult {
  success: boolean
  matches: Array<{
    confidence: number // 0-100
    reasoning: string
    participants: Array<{
      opt_in_id: string
      user_id: string
      role: 'DRIVER' | 'RIDER'
      pickup_location: {
        id: string
        name: string
        coords: [number, number]
      }
    }>
    route_optimization: {
      pickup_order: string[] // Array of pickup location IDs in optimal order
      estimated_total_time: number // Minutes
      estimated_cost_per_person: number // BDT
    }
    driver_info?: {
      user_id: string
      car_model: string
      capacity: number
      license_plate?: string
      car_color?: string
    }
  }>
  error?: string
}

export const geminiService = {
  /**
   * Generate intelligent ride matches using Gemini AI
   */
  async generateMatches(request: MatchingRequest): Promise<MatchingResult> {
    try {
      const prompt = this.buildMatchingPrompt(request)
      
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      // Parse the AI response
      const matches = this.parseMatchingResponse(text, request)
      
      return {
        success: true,
        matches
      }
    } catch (error) {
      console.error('Error generating matches with Gemini:', error)
      return {
        success: false,
        matches: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  },

  /**
   * Build the prompt for Gemini AI matching
   */
  buildMatchingPrompt(request: MatchingRequest): string {
    const { targetOptIn, availableOptIns, nsuLocation } = request
    
    const prompt = `
You are an intelligent ride-sharing matching system for NSU (North South University) students in Dhaka, Bangladesh. Your task is to find optimal ride matches based on location proximity, time compatibility, and capacity constraints.

## Target Opt-in (User looking for a match):
- User: ${targetOptIn.user.full_name} (${targetOptIn.user.default_role})
- Date: ${targetOptIn.commute_date}
- Time Window: ${targetOptIn.time_window_start} - ${targetOptIn.time_window_end}
- Pickup Location: ${targetOptIn.pickup_location.name} (${targetOptIn.pickup_location.coords[1]}, ${targetOptIn.pickup_location.coords[0]})
- Description: ${targetOptIn.pickup_location.description || 'N/A'}
${targetOptIn.user.driver_details ? `- Driver Details: ${targetOptIn.user.driver_details.car_model}, Capacity: ${targetOptIn.user.driver_details.capacity}` : ''}

## Available Opt-ins for Matching:
${availableOptIns.map((optIn, index) => `
${index + 1}. User: ${optIn.user.full_name} (${optIn.user.default_role})
   - Time Window: ${optIn.time_window_start} - ${optIn.time_window_end}
   - Pickup Location: ${optIn.pickup_location.name} (${optIn.pickup_location.coords[1]}, ${optIn.pickup_location.coords[0]})
   - Description: ${optIn.pickup_location.description || 'N/A'}
   ${optIn.user.driver_details ? `- Driver Details: ${optIn.user.driver_details.car_model}, Capacity: ${optIn.user.driver_details.capacity}` : ''}
`).join('')}

## NSU Location: ${nsuLocation[1]}, ${nsuLocation[0]}

## Matching Criteria (in order of importance):
1. **Role Compatibility**: Must have at least one DRIVER in each match
2. **Capacity Constraints**: Driver's car capacity must accommodate all riders
3. **Time Compatibility**: Overlapping time windows (minimum 15 minutes overlap required)
4. **Location Proximity**: Pickup locations should be within reasonable distance
   - Excellent: <2km apart (confidence boost +20)
   - Good: 2-5km apart (confidence boost +10)
   - Acceptable: 5-10km apart (no penalty)
   - Poor: >10km apart (confidence penalty -20)
5. **Route Efficiency**: Minimize total travel time and distance to NSU
6. **Time Window Overlap**: Larger overlap = higher confidence
   - Excellent: >60 minutes overlap (confidence boost +15)
   - Good: 30-60 minutes overlap (confidence boost +10)
   - Acceptable: 15-30 minutes overlap (no penalty)
   - Poor: <15 minutes overlap (reject match)

## Advanced Matching Instructions:
Analyze all available opt-ins and create optimal ride matches. Follow these steps:

1. **Pre-filtering**: Only consider opt-ins with at least 15 minutes time overlap
2. **Role Analysis**: Identify drivers and riders, ensure each match has exactly one driver
3. **Capacity Check**: Verify driver's car can accommodate all riders in the match
4. **Distance Calculation**: Calculate distances between pickup locations using coordinates
5. **Route Optimization**: Determine optimal pickup order to minimize total travel time
6. **Confidence Scoring**: Use this formula:
   - Base score: 50
   - Time overlap bonus: +1 point per minute of overlap (max +30)
   - Distance penalty: -2 points per km between farthest locations
   - Route efficiency bonus: +10 if route is logical (closer locations first)
   - Capacity utilization bonus: +5 if driver capacity is well utilized (>50% but not overloaded)

7. **Cost Estimation**:
   - Base fare: 50 BDT
   - Distance cost: 8 BDT per km (average Dhaka rate)
   - Divide total by number of participants for per-person cost

8. **Quality Thresholds**:
   - Excellent match: 80+ confidence
   - Good match: 60-79 confidence
   - Acceptable match: 40-59 confidence
   - Poor match: <40 confidence (should be rejected)

## Response Format (JSON):
{
  "matches": [
    {
      "confidence": 85,
      "reasoning": "Excellent time overlap (45 minutes) and close pickup locations (2.3km apart). Driver has sufficient capacity.",
      "participants": [
        {
          "opt_in_id": "target_opt_in_id",
          "user_id": "user_id",
          "role": "RIDER",
          "pickup_location": {
            "id": "location_id",
            "name": "Location Name",
            "coords": [lng, lat]
          }
        }
      ],
      "route_optimization": {
        "pickup_order": ["location_id_1", "location_id_2"],
        "estimated_total_time": 35,
        "estimated_cost_per_person": 120
      },
      "driver_info": {
        "user_id": "driver_user_id",
        "car_model": "Toyota Axio",
        "capacity": 4,
        "license_plate": "DHK-1234",
        "car_color": "White"
      }
    }
  ]
}

Only return valid JSON. If no good matches found, return {"matches": []}.
`

    return prompt
  },

  /**
   * Parse Gemini AI response into structured matching results
   */
  parseMatchingResponse(response: string, request: MatchingRequest): MatchingResult['matches'] {
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.warn('No JSON found in Gemini response')
        return []
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      if (!parsed.matches || !Array.isArray(parsed.matches)) {
        console.warn('Invalid matches format in Gemini response')
        return []
      }

      // Validate and enhance matches
      return parsed.matches
        .filter((match: any) => this.validateMatch(match, request))
        .map((match: any) => this.enhanceMatch(match, request))
    } catch (error) {
      console.error('Error parsing Gemini response:', error)
      return []
    }
  },

  /**
   * Validate a match result
   */
  validateMatch(match: any, request: MatchingRequest): boolean {
    try {
      // Check required fields
      if (!match.confidence || !match.reasoning || !match.participants) {
        return false
      }

      // Check confidence is valid number
      if (typeof match.confidence !== 'number' || match.confidence < 0 || match.confidence > 100) {
        return false
      }

      // Check participants array
      if (!Array.isArray(match.participants) || match.participants.length === 0) {
        return false
      }

      // Check that target opt-in is included
      const hasTargetOptIn = match.participants.some((p: any) => 
        p.opt_in_id === request.targetOptIn.id
      )
      if (!hasTargetOptIn) {
        return false
      }

      // Check role compatibility (at least one driver)
      const hasDriver = match.participants.some((p: any) => p.role === 'DRIVER')
      if (!hasDriver) {
        return false
      }

      return true
    } catch (error) {
      console.error('Error validating match:', error)
      return false
    }
  },

  /**
   * Enhance match with additional data
   */
  enhanceMatch(match: any, request: MatchingRequest): any {
    // Add any missing data or corrections
    const enhancedMatch = { ...match }

    // Ensure all participants have complete data
    enhancedMatch.participants = match.participants.map((participant: any) => {
      // Find the full opt-in data
      let fullOptIn = null
      if (participant.opt_in_id === request.targetOptIn.id) {
        fullOptIn = request.targetOptIn
      } else {
        fullOptIn = request.availableOptIns.find(opt => opt.id === participant.opt_in_id)
      }

      if (fullOptIn) {
        return {
          ...participant,
          pickup_location: fullOptIn.pickup_location,
          role: fullOptIn.user.default_role
        }
      }

      return participant
    })

    // Add driver info if not present
    if (!enhancedMatch.driver_info) {
      const driverParticipant = enhancedMatch.participants.find((p: any) => p.role === 'DRIVER')
      if (driverParticipant) {
        let driverOptIn = null
        if (driverParticipant.opt_in_id === request.targetOptIn.id) {
          driverOptIn = request.targetOptIn
        } else {
          driverOptIn = request.availableOptIns.find(opt => opt.id === driverParticipant.opt_in_id)
        }

        if (driverOptIn?.user.driver_details) {
          enhancedMatch.driver_info = {
            user_id: driverOptIn.user.id,
            ...driverOptIn.user.driver_details
          }
        }
      }
    }

    return enhancedMatch
  },

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    const [lng1, lat1] = coord1
    const [lng2, lat2] = coord2

    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  },

  /**
   * Calculate time overlap between two time windows in minutes
   */
  calculateTimeOverlap(start1: string, end1: string, start2: string, end2: string): number {
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number)
      return hours * 60 + minutes
    }

    const start1Min = parseTime(start1)
    const end1Min = parseTime(end1)
    const start2Min = parseTime(start2)
    const end2Min = parseTime(end2)

    const overlapStart = Math.max(start1Min, start2Min)
    const overlapEnd = Math.min(end1Min, end2Min)

    return Math.max(0, overlapEnd - overlapStart)
  },

  /**
   * Pre-filter opt-ins for basic compatibility
   */
  preFilterOptIns(targetOptIn: any, availableOptIns: any[]): any[] {
    return availableOptIns.filter(optIn => {
      // Check time overlap (minimum 15 minutes)
      const overlap = this.calculateTimeOverlap(
        targetOptIn.time_window_start,
        targetOptIn.time_window_end,
        optIn.time_window_start,
        optIn.time_window_end
      )

      if (overlap < 15) {
        return false
      }

      // Check distance (maximum 15km for initial filtering)
      const distance = this.calculateDistance(
        targetOptIn.pickup_location.coords,
        optIn.pickup_location.coords
      )

      if (distance > 15) {
        return false
      }

      return true
    })
  },

  /**
   * Create location clusters for efficient matching
   */
  createLocationClusters(optIns: any[], maxClusterDistance: number = 5): any[][] {
    const clusters: any[][] = []
    const processed = new Set<string>()

    for (const optIn of optIns) {
      if (processed.has(optIn.id)) continue

      const cluster = [optIn]
      processed.add(optIn.id)

      // Find nearby opt-ins for this cluster
      for (const otherOptIn of optIns) {
        if (processed.has(otherOptIn.id)) continue

        const distance = this.calculateDistance(
          optIn.pickup_location.coords,
          otherOptIn.pickup_location.coords
        )

        if (distance <= maxClusterDistance) {
          cluster.push(otherOptIn)
          processed.add(otherOptIn.id)
        }
      }

      clusters.push(cluster)
    }

    return clusters
  },

  /**
   * Calculate match confidence score
   */
  calculateMatchConfidence(participants: any[], nsuLocation: [number, number]): number {
    let confidence = 50 // Base score

    // Check role compatibility
    const drivers = participants.filter(p => p.user.default_role === 'DRIVER')
    const riders = participants.filter(p => p.user.default_role === 'RIDER')

    if (drivers.length !== 1) {
      return 0 // Invalid match
    }

    const driver = drivers[0]

    // Check capacity
    if (driver.user.driver_details && riders.length > driver.user.driver_details.capacity) {
      return 0 // Exceeds capacity
    }

    // Time overlap bonus
    if (participants.length > 1) {
      let minOverlap = Infinity
      for (let i = 0; i < participants.length - 1; i++) {
        for (let j = i + 1; j < participants.length; j++) {
          const overlap = this.calculateTimeOverlap(
            participants[i].time_window_start,
            participants[i].time_window_end,
            participants[j].time_window_start,
            participants[j].time_window_end
          )
          minOverlap = Math.min(minOverlap, overlap)
        }
      }

      if (minOverlap >= 60) confidence += 15
      else if (minOverlap >= 30) confidence += 10
      else if (minOverlap < 15) return 0 // Invalid
    }

    // Distance analysis
    const locations = participants.map(p => p.pickup_location.coords)
    let maxDistance = 0
    let totalDistance = 0
    let distanceCount = 0

    for (let i = 0; i < locations.length - 1; i++) {
      for (let j = i + 1; j < locations.length; j++) {
        const distance = this.calculateDistance(locations[i], locations[j])
        maxDistance = Math.max(maxDistance, distance)
        totalDistance += distance
        distanceCount++
      }
    }

    // Distance penalties/bonuses
    if (maxDistance < 2) confidence += 20
    else if (maxDistance < 5) confidence += 10
    else if (maxDistance > 10) confidence -= 20

    // Capacity utilization bonus
    if (driver.user.driver_details) {
      const utilization = riders.length / driver.user.driver_details.capacity
      if (utilization >= 0.5 && utilization <= 1) {
        confidence += 5
      }
    }

    // Route efficiency (distance to NSU)
    const avgDistanceToNSU = locations.reduce((sum, loc) => {
      return sum + this.calculateDistance(loc, nsuLocation)
    }, 0) / locations.length

    if (avgDistanceToNSU < 10) confidence += 5
    else if (avgDistanceToNSU > 20) confidence -= 5

    return Math.max(0, Math.min(100, confidence))
  },

  /**
   * Generate matches using local algorithm (fallback when Gemini is unavailable)
   */
  async generateMatchesLocal(request: MatchingRequest): Promise<MatchingResult> {
    try {
      const { targetOptIn, availableOptIns, nsuLocation } = request

      // Pre-filter compatible opt-ins
      const compatibleOptIns = this.preFilterOptIns(targetOptIn, availableOptIns)

      if (compatibleOptIns.length === 0) {
        return { success: true, matches: [] }
      }

      // Create location clusters
      const allOptIns = [targetOptIn, ...compatibleOptIns]
      const clusters = this.createLocationClusters(allOptIns, 5)

      const matches: MatchingResult['matches'] = []

      // Generate matches for each cluster
      for (const cluster of clusters) {
        if (cluster.length < 2) continue

        // Ensure target opt-in is in this cluster
        if (!cluster.some(opt => opt.id === targetOptIn.id)) continue

        // Find drivers and riders in cluster
        const drivers = cluster.filter(opt => opt.user.default_role === 'DRIVER')
        const riders = cluster.filter(opt => opt.user.default_role === 'RIDER')

        // Try different combinations with each driver
        for (const driver of drivers) {
          const availableRiders = riders.filter(r => r.id !== driver.id)
          const capacity = driver.user.driver_details?.capacity || 4

          // Generate combinations of riders that fit in the car
          const riderCombinations = this.generateRiderCombinations(availableRiders, capacity)

          for (const riderGroup of riderCombinations) {
            const participants = [driver, ...riderGroup]

            // Calculate confidence
            const confidence = this.calculateMatchConfidence(participants, nsuLocation)

            if (confidence >= 40) { // Minimum threshold
              // Calculate route optimization
              const routeOpt = this.calculateRouteOptimization(participants, nsuLocation)

              matches.push({
                confidence,
                reasoning: this.generateMatchReasoning(participants, confidence),
                participants: participants.map(p => ({
                  opt_in_id: p.id,
                  user_id: p.user_id,
                  role: p.user.default_role,
                  pickup_location: p.pickup_location
                })),
                route_optimization: routeOpt,
                driver_info: driver.user.driver_details ? {
                  user_id: driver.user.id,
                  ...driver.user.driver_details
                } : undefined
              })
            }
          }
        }
      }

      // Sort matches by confidence (highest first)
      matches.sort((a, b) => b.confidence - a.confidence)

      // Return top 3 matches to avoid overwhelming users
      return {
        success: true,
        matches: matches.slice(0, 3)
      }
    } catch (error) {
      console.error('Error in generateMatchesLocal:', error)
      return {
        success: false,
        matches: [],
        error: error instanceof Error ? error.message : 'Local matching failed'
      }
    }
  },

  /**
   * Generate combinations of riders that fit in driver's car
   */
  generateRiderCombinations(riders: any[], capacity: number): any[][] {
    const combinations: any[][] = []

    // Generate all possible combinations up to capacity
    for (let size = 1; size <= Math.min(riders.length, capacity); size++) {
      const combos = this.getCombinations(riders, size)
      combinations.push(...combos)
    }

    return combinations
  },

  /**
   * Get all combinations of specified size from array
   */
  getCombinations(arr: any[], size: number): any[][] {
    if (size === 1) return arr.map(item => [item])
    if (size === arr.length) return [arr]
    if (size > arr.length) return []

    const combinations: any[][] = []

    for (let i = 0; i <= arr.length - size; i++) {
      const head = arr[i]
      const tailCombos = this.getCombinations(arr.slice(i + 1), size - 1)

      for (const tailCombo of tailCombos) {
        combinations.push([head, ...tailCombo])
      }
    }

    return combinations
  },

  /**
   * Calculate route optimization for a group
   */
  calculateRouteOptimization(participants: any[], nsuLocation: [number, number]): any {
    const locations = participants.map(p => ({
      id: p.pickup_location.id,
      coords: p.pickup_location.coords,
      name: p.pickup_location.name
    }))

    // Simple optimization: sort by distance to NSU (closest first)
    locations.sort((a, b) => {
      const distA = this.calculateDistance(a.coords, nsuLocation)
      const distB = this.calculateDistance(b.coords, nsuLocation)
      return distA - distB
    })

    // Calculate total distance and time
    let totalDistance = 0
    for (let i = 0; i < locations.length - 1; i++) {
      totalDistance += this.calculateDistance(locations[i].coords, locations[i + 1].coords)
    }

    // Add distance from last pickup to NSU
    if (locations.length > 0) {
      totalDistance += this.calculateDistance(
        locations[locations.length - 1].coords,
        nsuLocation
      )
    }

    // Estimate time (assuming 30 km/h average speed in Dhaka traffic)
    const estimatedTime = Math.round((totalDistance / 30) * 60) // Convert to minutes

    // Estimate cost (50 BDT base + 8 BDT per km)
    const totalCost = 50 + (totalDistance * 8)
    const costPerPerson = Math.round(totalCost / participants.length)

    return {
      pickup_order: locations.map(l => l.id),
      estimated_total_time: estimatedTime,
      estimated_cost_per_person: costPerPerson
    }
  },

  /**
   * Generate reasoning text for a match
   */
  generateMatchReasoning(participants: any[], confidence: number): string {
    const drivers = participants.filter(p => p.user.default_role === 'DRIVER')
    const riders = participants.filter(p => p.user.default_role === 'RIDER')

    let reasoning = `Match includes ${drivers.length} driver and ${riders.length} rider(s). `

    if (confidence >= 80) {
      reasoning += "Excellent match with optimal time overlap and close pickup locations."
    } else if (confidence >= 60) {
      reasoning += "Good match with reasonable time compatibility and location proximity."
    } else {
      reasoning += "Acceptable match meeting basic criteria for ride sharing."
    }

    // Add specific details
    if (drivers[0].user.driver_details) {
      const capacity = drivers[0].user.driver_details.capacity
      reasoning += ` Driver has ${capacity}-seat capacity.`
    }

    return reasoning
  },

  /**
   * Test Gemini API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await model.generateContent('Hello, please respond with "Connection successful"')
      const response = await result.response
      const text = response.text()

      return {
        success: text.toLowerCase().includes('connection successful'),
      }
    } catch (error) {
      console.error('Gemini connection test failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
