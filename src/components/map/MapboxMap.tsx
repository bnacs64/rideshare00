import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { cn } from '../../lib/utils'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Loader2, Navigation, Search } from 'lucide-react'

// Set Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || ''

// Check if token is available
if (!mapboxgl.accessToken) {
  console.warn('Mapbox access token not found. Please set VITE_MAPBOX_ACCESS_TOKEN in your environment variables.')
}

export interface MapboxMapProps {
  center?: [number, number] // [lng, lat] format for Mapbox
  zoom?: number
  height?: string
  className?: string
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void
  markers?: Array<{
    id: string
    coordinates: [number, number]
    title?: string
    description?: string
    type?: 'home' | 'pickup' | 'destination' | 'driver'
  }>
  showGeocoder?: boolean
  showNavigation?: boolean
  interactive?: boolean
  style?: string
}

export const MapboxMap: React.FC<MapboxMapProps> = ({
  center = [90.4125, 23.8103], // Default to Dhaka, Bangladesh
  zoom = 13,
  height = '400px',
  className,
  onLocationSelect,
  markers = [],
  showGeocoder = false, // Currently not used but kept for future implementation
  showNavigation = true,
  interactive = true,
  style = 'mapbox://styles/mapbox/streets-v12'
}) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style,
        center,
        zoom,
        interactive,
        attributionControl: false
      })

      // Add navigation controls
      if (showNavigation) {
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
      }

      // Add geolocate control
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: false,
        showUserHeading: false
      })
      map.current.addControl(geolocate, 'top-right')

      // Handle map click for location selection
      if (onLocationSelect) {
        map.current.on('click', async (e) => {
          const { lng, lat } = e.lngLat
          
          try {
            // Reverse geocode to get address
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&country=BD&limit=1`
            )
            const data = await response.json()
            const address = data.features[0]?.place_name || undefined

            onLocationSelect({ lat, lng, address })
          } catch (error) {
            console.error('Reverse geocoding failed:', error)
            onLocationSelect({ lat, lng })
          }
        })
      }

      // Handle map load
      map.current.on('load', () => {
        setIsLoading(false)
      })

      // Handle map errors
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e)
        setError('Failed to load map. Please check your internet connection.')
        setIsLoading(false)
      })

    } catch (err) {
      console.error('Failed to initialize Mapbox:', err)
      setError('Failed to initialize map. Please refresh the page.')
      setIsLoading(false)
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [center, zoom, style, interactive, showNavigation, onLocationSelect])

  // Update markers
  useEffect(() => {
    if (!map.current) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Add new markers
    markers.forEach(markerData => {
      const el = document.createElement('div')
      el.className = 'mapbox-marker'
      
      // Custom marker styling based on type
      const markerStyles = {
        home: 'bg-blue-500 border-blue-600',
        pickup: 'bg-green-500 border-green-600',
        destination: 'bg-red-500 border-red-600',
        driver: 'bg-purple-500 border-purple-600'
      }
      
      el.className = `w-8 h-8 rounded-full border-2 ${markerStyles[markerData.type || 'pickup']} shadow-lg cursor-pointer transform transition-transform hover:scale-110`
      
      // Add icon
      el.innerHTML = `
        <div class="w-full h-full flex items-center justify-center text-white text-xs font-bold">
          ${markerData.type === 'home' ? '🏠' : 
            markerData.type === 'driver' ? '🚗' : 
            markerData.type === 'destination' ? '🎯' : '📍'}
        </div>
      `

      const marker = new mapboxgl.Marker(el)
        .setLngLat(markerData.coordinates)
        .addTo(map.current!)

      // Add popup if title or description provided
      if (markerData.title || markerData.description) {
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div class="p-2">
              ${markerData.title ? `<h3 class="font-semibold text-sm">${markerData.title}</h3>` : ''}
              ${markerData.description ? `<p class="text-xs text-gray-600 mt-1">${markerData.description}</p>` : ''}
            </div>
          `)
        
        marker.setPopup(popup)
      }

      markersRef.current.push(marker)
    })
  }, [markers])

  // Get current location
  const getCurrentLocation = () => {
    if (!map.current) return

    const geolocate = map.current._controls.find(
      control => control instanceof mapboxgl.GeolocateControl
    ) as mapboxgl.GeolocateControl

    if (geolocate) {
      geolocate.trigger()
    }
  }

  if (error) {
    return (
      <Card className={cn('border-red-200 bg-red-50', className)} style={{ height }}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="text-red-600 border-red-300"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('relative rounded-lg overflow-hidden border border-border', className)} style={{ height }}>
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {/* Current Location Button */}
      {showNavigation && (
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-4 right-4 shadow-lg"
          onClick={getCurrentLocation}
        >
          <Navigation className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

// Enhanced Geocoder Component
export interface MapboxGeocoderProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void
  placeholder?: string
  country?: string
  className?: string
}

export const MapboxGeocoder: React.FC<MapboxGeocoderProps> = ({
  onLocationSelect,
  placeholder = "Search for a location...",
  country = "BD",
  className
}) => {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${mapboxgl.accessToken}&country=${country}&limit=5&proximity=90.4125,23.8103`
      )
      const data = await response.json()
      setSuggestions(data.features || [])
    } catch (error) {
      console.error('Geocoding failed:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleLocationSelect = (feature: any) => {
    const [lng, lat] = feature.center
    onLocationSelect({
      lat,
      lng,
      address: feature.place_name
    })
    setQuery(feature.place_name)
    setSuggestions([])
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            searchLocations(e.target.value)
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {suggestions.map((feature, index) => (
            <button
              key={index}
              onClick={() => handleLocationSelect(feature)}
              className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-b-0"
            >
              <div className="font-medium text-sm">{feature.text}</div>
              <div className="text-xs text-muted-foreground">{feature.place_name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
