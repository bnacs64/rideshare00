import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.24.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MatchingRequest {
  targetOptInId: string
  forceMatch?: boolean
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') ?? '')
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    // Parse request body
    const { targetOptInId, forceMatch = false }: MatchingRequest = await req.json()

    if (!targetOptInId) {
      return new Response(
        JSON.stringify({ error: 'targetOptInId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the target opt-in with full details
    const { data: targetOptIn, error: targetError } = await supabaseClient
      .from('daily_opt_ins')
      .select(`
        *,
        pickup_locations (*),
        users (*)
      `)
      .eq('id', targetOptInId)
      .single()

    if (targetError || !targetOptIn) {
      return new Response(
        JSON.stringify({ error: 'Target opt-in not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get available opt-ins for the same date (excluding the target and same user)
    const { data: availableOptIns, error: availableError } = await supabaseClient
      .from('daily_opt_ins')
      .select(`
        *,
        pickup_locations (*),
        users (*)
      `)
      .eq('commute_date', targetOptIn.commute_date)
      .eq('status', 'PENDING_MATCH')
      .neq('id', targetOptInId)
      .neq('user_id', targetOptIn.user_id)

    if (availableError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch available opt-ins' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!availableOptIns || availableOptIns.length === 0) {
      return new Response(
        JSON.stringify({ 
          matches: [], 
          message: 'No other opt-ins available for matching' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Build the prompt for Gemini AI
    const prompt = buildMatchingPrompt(targetOptIn, availableOptIns)

    // Get matches from Gemini AI
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse the AI response
    const matches = parseMatchingResponse(text, targetOptIn, availableOptIns)

    // Filter matches by confidence threshold (unless forced)
    const confidenceThreshold = forceMatch ? 0 : 70
    const goodMatches = matches.filter(match => match.confidence >= confidenceThreshold)

    // Create matched rides for good matches
    const createdRides = []
    for (const match of goodMatches) {
      try {
        const ride = await createMatchedRide(supabaseClient, match, targetOptIn.commute_date)
        if (ride) {
          createdRides.push(ride)
        }
      } catch (error) {
        console.error('Error creating matched ride:', error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        matches: matches,
        goodMatches: goodMatches.length,
        ridesCreated: createdRides.length,
        rides: createdRides
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in match-rides function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function buildMatchingPrompt(targetOptIn: any, availableOptIns: any[]): string {
  const nsuLocation = [90.4125, 23.8103] // NSU coordinates

  return `
You are an intelligent ride-sharing matching system for NSU (North South University) students in Dhaka, Bangladesh. Your task is to find optimal ride matches based on location proximity, time compatibility, and capacity constraints.

## Target Opt-in (User looking for a match):
- User: ${targetOptIn.users.full_name} (${targetOptIn.users.default_role})
- Date: ${targetOptIn.commute_date}
- Time Window: ${targetOptIn.time_window_start} - ${targetOptIn.time_window_end}
- Pickup Location: ${targetOptIn.pickup_locations.name} (${targetOptIn.pickup_locations.coords[1]}, ${targetOptIn.pickup_locations.coords[0]})
- Description: ${targetOptIn.pickup_locations.description || 'N/A'}
${targetOptIn.users.driver_details ? `- Driver Details: ${JSON.stringify(targetOptIn.users.driver_details)}` : ''}

## Available Opt-ins for Matching:
${availableOptIns.map((optIn, index) => `
${index + 1}. User: ${optIn.users.full_name} (${optIn.users.default_role})
   - Time Window: ${optIn.time_window_start} - ${optIn.time_window_end}
   - Pickup Location: ${optIn.pickup_locations.name} (${optIn.pickup_locations.coords[1]}, ${optIn.pickup_locations.coords[0]})
   - Description: ${optIn.pickup_locations.description || 'N/A'}
   ${optIn.users.driver_details ? `- Driver Details: ${JSON.stringify(optIn.users.driver_details)}` : ''}
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

## Response Format (JSON only):
{
  "matches": [
    {
      "confidence": 85,
      "reasoning": "Excellent time overlap and close pickup locations",
      "participants": [
        {
          "opt_in_id": "${targetOptIn.id}",
          "user_id": "${targetOptIn.user_id}",
          "role": "${targetOptIn.users.default_role}",
          "pickup_location_id": "${targetOptIn.pickup_location_id}"
        }
      ],
      "route_optimization": {
        "pickup_order": ["${targetOptIn.pickup_location_id}"],
        "estimated_total_time": 35,
        "estimated_cost_per_person": 120
      }
    }
  ]
}

Only return valid JSON. If no good matches found, return {"matches": []}.
`
}

function parseMatchingResponse(response: string, targetOptIn: any, availableOptIns: any[]): any[] {
  try {
    // Extract JSON from response
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

    // Map AI response to actual data
    const allOptIns = [targetOptIn, ...availableOptIns]

    return parsed.matches.map((match: any) => {
      // Map participants to actual opt-in data
      const mappedParticipants = []

      // Always include the target opt-in
      mappedParticipants.push({
        opt_in_id: targetOptIn.id,
        user_id: targetOptIn.user_id,
        role: targetOptIn.users.default_role,
        pickup_location_id: targetOptIn.pickup_location_id
      })

      // Add other participants based on AI's selection
      if (match.participants && match.participants.length > 1) {
        // For now, add the first available opt-in that matches the role requirements
        const needsDriver = !mappedParticipants.some(p => p.role === 'DRIVER')
        const needsRider = mappedParticipants.every(p => p.role === 'DRIVER')

        for (const availableOptIn of availableOptIns) {
          if (needsDriver && availableOptIn.users.default_role === 'DRIVER') {
            mappedParticipants.push({
              opt_in_id: availableOptIn.id,
              user_id: availableOptIn.user_id,
              role: availableOptIn.users.default_role,
              pickup_location_id: availableOptIn.pickup_location_id
            })
            break
          } else if (needsRider && availableOptIn.users.default_role === 'RIDER') {
            mappedParticipants.push({
              opt_in_id: availableOptIn.id,
              user_id: availableOptIn.user_id,
              role: availableOptIn.users.default_role,
              pickup_location_id: availableOptIn.pickup_location_id
            })
            break
          }
        }
      }

      return {
        confidence: match.confidence || 70,
        reasoning: match.reasoning || 'AI-generated match',
        participants: mappedParticipants,
        route_optimization: {
          pickup_order: mappedParticipants.map(p => p.pickup_location_id),
          estimated_total_time: match.route_optimization?.estimated_total_time || 30,
          estimated_cost_per_person: match.route_optimization?.estimated_cost_per_person || 100
        }
      }
    }).filter((match: any) => {
      // Ensure we have at least one driver and valid participants
      const hasDriver = match.participants.some((p: any) => p.role === 'DRIVER')
      return hasDriver && match.participants.length > 0
    })
  } catch (error) {
    console.error('Error parsing Gemini response:', error)
    return []
  }
}

async function createMatchedRide(supabaseClient: any, match: any, commuteDate: string): Promise<any> {
  try {
    // Find the driver participant
    const driverParticipant = match.participants.find((p: any) => p.role === 'DRIVER')
    if (!driverParticipant) {
      throw new Error('No driver found in match')
    }

    // Create the matched ride using NEW schema field names
    const { data: ride, error: rideError } = await supabaseClient
      .from('matched_rides')
      .insert({
        commute_date: commuteDate,
        status: 'PROPOSED',
        driver_user_id: driverParticipant.user_id,
        estimated_cost_per_person: match.route_optimization.estimated_cost_per_person,
        estimated_total_time: match.route_optimization.estimated_total_time,
        pickup_order: match.route_optimization.pickup_order,
        route_optimization_data: {
          ...match.route_optimization,
          ai_confidence_score: match.confidence,
          ai_reasoning: match.reasoning,
          created_by: 'ai_matching'
        },
        ai_confidence_score: match.confidence / 100, // Convert to decimal
        ai_reasoning: match.reasoning
      })
      .select()
      .single()

    if (rideError) {
      throw new Error(`Failed to create matched ride: ${rideError.message}`)
    }

    // Create ride participants using NEW schema field names
    const participantInserts = match.participants.map((participant: any) => ({
      matched_ride_id: ride.id,
      user_id: participant.user_id,
      daily_opt_in_id: participant.opt_in_id,
      pickup_location_id: participant.pickup_location_id,
      status: 'PENDING_ACCEPTANCE',
      confirmation_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }))

    const { error: participantsError } = await supabaseClient
      .from('ride_participants')
      .insert(participantInserts)

    if (participantsError) {
      // Rollback the ride creation
      await supabaseClient.from('matched_rides').delete().eq('id', ride.id)
      throw new Error(`Failed to create ride participants: ${participantsError.message}`)
    }

    // Update opt-in statuses to MATCHED
    const optInIds = match.participants.map((p: any) => p.opt_in_id)
    await supabaseClient
      .from('daily_opt_ins')
      .update({ status: 'MATCHED' })
      .in('id', optInIds)

    return ride
  } catch (error) {
    console.error('Error in createMatchedRide:', error)
    throw error
  }
}
