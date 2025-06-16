import React, { useState, useEffect, useRef } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Search, MapPin, Navigation, Loader2, X } from 'lucide-react'
import { locationService, GeocodeResult } from '../../services/locationService'
import { cn } from '../../lib/utils'

interface LocationSearchProps {
  onLocationSelect: (location: GeocodeResult) => void
  placeholder?: string
  className?: string
  showCurrentLocation?: boolean
  countryCode?: string
  maxResults?: number
  debounceMs?: number
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  onLocationSelect,
  placeholder = "Search for a location...",
  className,
  showCurrentLocation = true,
  countryCode = 'bd', // Bangladesh by default
  maxResults = 5,
  debounceMs = 300
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState('')
  
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Handle search input changes with debouncing
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.trim().length < 3) {
      setResults([])
      setShowResults(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      await performSearch(query)
    }, debounceMs)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, debounceMs])

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError('')

    try {
      const searchResults = await locationService.geocodeAddress(searchQuery)
      setResults(searchResults.slice(0, maxResults))
      setShowResults(true)
    } catch (err) {
      setError('Failed to search locations')
      setResults([])
      setShowResults(false)
    } finally {
      setIsSearching(false)
    }
  }

  const handleLocationSelect = (location: GeocodeResult) => {
    onLocationSelect(location)
    setQuery(location.address)
    setShowResults(false)
  }

  const getCurrentLocation = async () => {
    setIsGettingLocation(true)
    setError('')

    try {
      const location = await locationService.getCurrentLocation()
      const geocoded = await locationService.reverseGeocode(location.lat, location.lng)
      
      handleLocationSelect(geocoded)
    } catch (err) {
      setError('Failed to get current location')
    } finally {
      setIsGettingLocation(false)
    }
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
    setError('')
  }

  const formatAddress = (address: string) => {
    // Truncate long addresses for display
    if (address.length > 60) {
      return address.substring(0, 57) + '...'
    }
    return address
  }

  return (
    <div ref={searchRef} className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) {
              setShowResults(true)
            }
          }}
          className="pl-10 pr-20"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-2">
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {showCurrentLocation && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="h-6 w-6 p-0 hover:bg-muted"
              title="Use current location"
            >
              {isGettingLocation ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Navigation className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Search Results */}
      {showResults && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg border">
          <CardContent className="p-0">
            <div className="max-h-60 overflow-y-auto">
              {results.map((result, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleLocationSelect(result)}
                  className="w-full text-left p-3 hover:bg-muted transition-colors border-b border-border last:border-b-0 focus:outline-none focus:bg-muted"
                >
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatAddress(result.address)}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                        </p>
                        {result.city && (
                          <Badge variant="secondary" className="text-xs">
                            {result.city}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {showResults && results.length === 0 && query.length >= 3 && !isSearching && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg border">
          <CardContent className="p-4 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No locations found for "{query}"
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Try a different search term or be more specific
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Hook for using location search in forms
export const useLocationSearch = () => {
  const [selectedLocation, setSelectedLocation] = useState<GeocodeResult | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handleLocationSelect = (location: GeocodeResult) => {
    setSelectedLocation(location)
    setSearchQuery(location.address)
  }

  const clearSelection = () => {
    setSelectedLocation(null)
    setSearchQuery('')
  }

  return {
    selectedLocation,
    searchQuery,
    setSearchQuery,
    handleLocationSelect,
    clearSelection
  }
}
