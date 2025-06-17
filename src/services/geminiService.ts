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

## Matching Criteria:
1. **Time Compatibility**: Overlapping time windows (at least 15 minutes overlap)
2. **Location Proximity**: Pickup locations should be within reasonable distance (prefer <5km apart)
3. **Role Compatibility**: Must have at least one DRIVER in each match
4. **Capacity Constraints**: Driver's car capacity must accommodate all riders
5. **Route Efficiency**: Minimize total travel time and distance

## Instructions:
Analyze all available opt-ins and create optimal ride matches. For each match:
1. Calculate confidence score (0-100) based on time overlap, location proximity, and efficiency
2. Provide clear reasoning for the match
3. Ensure role compatibility (at least one driver per group)
4. Optimize pickup order for minimal travel time
5. Estimate total time and cost per person (assume 50 BDT base + 10 BDT per km)

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
