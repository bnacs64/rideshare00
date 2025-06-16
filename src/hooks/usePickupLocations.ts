import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import type { PickupLocation } from '../types'
import { useAuth } from '../contexts/AuthContext'

export const usePickupLocations = () => {
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([])
  const [defaultPickupLocation, setDefaultPickupLocation] = useState<PickupLocation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { user } = useAuth()

  // Fetch pickup locations for the current user
  const fetchPickupLocations = async () => {
    if (!user) {
      setPickupLocations([])
      setDefaultPickupLocation(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('pickup_locations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching pickup locations:', error)
        setError(error.message)
        return
      }

      const locations: PickupLocation[] = data.map(location => ({
        ...location,
        coords: parseLocationCoords(location.coords)
      }))

      setPickupLocations(locations)
      
      // Find default location
      const defaultLocation = locations.find(loc => loc.is_default) || null
      setDefaultPickupLocation(defaultLocation)
      
      setError(null)
    } catch (err) {
      console.error('Error in fetchPickupLocations:', err)
      setError('Failed to fetch pickup locations')
    } finally {
      setLoading(false)
    }
  }

  // Add a new pickup location
  const addPickupLocation = async (locationData: {
    name: string
    description: string
    coords: [number, number]
    is_default?: boolean
  }) => {
    if (!user) {
      return { error: { message: 'User not authenticated' } }
    }

    try {
      const { data, error } = await supabase
        .from('pickup_locations')
        .insert({
          user_id: user.id,
          name: locationData.name,
          description: locationData.description,
          coords: `POINT(${locationData.coords[0]} ${locationData.coords[1]})`,
          is_default: locationData.is_default || false
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding pickup location:', error)
        return { error }
      }

      // Refresh the list
      await fetchPickupLocations()
      return { error: null }
    } catch (err) {
      console.error('Error in addPickupLocation:', err)
      return { error: { message: 'Failed to add pickup location' } }
    }
  }

  // Update a pickup location
  const updatePickupLocation = async (id: string, updates: {
    name?: string
    description?: string
    coords?: [number, number]
    is_default?: boolean
  }) => {
    try {
      const updateData: any = { ...updates }
      
      if (updates.coords) {
        updateData.coords = `POINT(${updates.coords[0]} ${updates.coords[1]})`
      }

      const { data, error } = await supabase
        .from('pickup_locations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating pickup location:', error)
        return { error }
      }

      // Refresh the list
      await fetchPickupLocations()
      return { error: null }
    } catch (err) {
      console.error('Error in updatePickupLocation:', err)
      return { error: { message: 'Failed to update pickup location' } }
    }
  }

  // Delete a pickup location
  const deletePickupLocation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pickup_locations')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting pickup location:', error)
        return { error }
      }

      // Refresh the list
      await fetchPickupLocations()
      return { error: null }
    } catch (err) {
      console.error('Error in deletePickupLocation:', err)
      return { error: { message: 'Failed to delete pickup location' } }
    }
  }

  // Set a pickup location as default
  const setAsDefaultPickupLocation = async (id: string) => {
    try {
      // First, unset all other defaults
      await supabase
        .from('pickup_locations')
        .update({ is_default: false })
        .eq('user_id', user?.id)

      // Then set the selected one as default
      const { error } = await supabase
        .from('pickup_locations')
        .update({ is_default: true })
        .eq('id', id)

      if (error) {
        console.error('Error setting default pickup location:', error)
        return { error }
      }

      // Refresh the list
      await fetchPickupLocations()
      return { error: null }
    } catch (err) {
      console.error('Error in setAsDefaultPickupLocation:', err)
      return { error: { message: 'Failed to set default pickup location' } }
    }
  }

  // Get current location using enhanced location service
  const getCurrentLocation = async (): Promise<[number, number] | null> => {
    try {
      const { locationService } = await import('../services/locationService')
      const location = await locationService.getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      })

      return [location.lng, location.lat] // Note: PostGIS uses lng, lat order
    } catch (error) {
      console.error('Error getting current location:', error)
      return null
    }
  }

  // Parse PostGIS point to coordinates array
  const parseLocationCoords = (postgisPoint: any): [number, number] => {
    if (typeof postgisPoint === 'string') {
      // Parse "POINT(lng lat)" format
      const match = postgisPoint.match(/POINT\(([^)]+)\)/)
      if (match) {
        const [lng, lat] = match[1].split(' ').map(Number)
        return [lng, lat]
      }
    }
    
    // Fallback for other formats or if parsing fails
    return [90.4125, 23.8103] // Default to Dhaka coordinates
  }

  // Fetch locations when user changes
  useEffect(() => {
    fetchPickupLocations()
  }, [user])

  return {
    pickupLocations,
    defaultPickupLocation,
    loading,
    error,
    addPickupLocation,
    updatePickupLocation,
    deletePickupLocation,
    setAsDefaultPickupLocation,
    getCurrentLocation,
    refreshPickupLocations: fetchPickupLocations
  }
}
