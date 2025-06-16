import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { LocationDisplay } from '../map/LocationDisplay'
import { LocationPickerModal } from './LocationPickerModal'
import { usePickupLocations } from '../../hooks/usePickupLocations'
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  StarOff, 
  Navigation,
  Home,
  Loader2
} from 'lucide-react'
import type { PickupLocation } from '../../types'

interface LocationManagerProps {
  homeLocation?: [number, number]
  className?: string
  showMap?: boolean
  showAddButton?: boolean
}

export const LocationManager: React.FC<LocationManagerProps> = ({
  homeLocation,
  className,
  showMap = true,
  showAddButton = true
}) => {
  const {
    pickupLocations,
    defaultPickupLocation,
    loading,
    error,
    addPickupLocation,
    updatePickupLocation,
    deletePickupLocation,
    setAsDefaultPickupLocation
  } = usePickupLocations()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<PickupLocation | null>(null)
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Handle adding new location
  const handleAddLocation = async (locationData: {
    name: string
    description: string
    coords: [number, number]
    address?: string
    is_default?: boolean
  }) => {
    setActionLoading('add')
    setActionError('')
    
    try {
      const result = await addPickupLocation(locationData)
      
      if (result.error) {
        setActionError(result.error.message || 'Failed to add location')
        return { error: result.error }
      }
      
      setActionSuccess('Location added successfully!')
      setTimeout(() => setActionSuccess(''), 3000)
      return { error: null }
    } catch (error) {
      const errorMessage = 'Failed to add location'
      setActionError(errorMessage)
      return { error: { message: errorMessage } }
    } finally {
      setActionLoading(null)
    }
  }

  // Handle setting default location
  const handleSetDefault = async (locationId: string) => {
    setActionLoading(`default-${locationId}`)
    setActionError('')
    
    try {
      const result = await setAsDefaultPickupLocation(locationId)
      
      if (result.error) {
        setActionError(result.error.message || 'Failed to set default location')
      } else {
        setActionSuccess('Default location updated!')
        setTimeout(() => setActionSuccess(''), 3000)
      }
    } catch (error) {
      setActionError('Failed to set default location')
    } finally {
      setActionLoading(null)
    }
  }

  // Handle deleting location
  const handleDeleteLocation = async (locationId: string) => {
    setDeletingLocationId(locationId)
    setActionLoading(`delete-${locationId}`)
    setActionError('')
    
    try {
      const result = await deletePickupLocation(locationId)
      
      if (result.error) {
        setActionError(result.error.message || 'Failed to delete location')
      } else {
        setActionSuccess('Location deleted successfully!')
        setTimeout(() => setActionSuccess(''), 3000)
      }
    } catch (error) {
      setActionError('Failed to delete location')
    } finally {
      setActionLoading(null)
      setDeletingLocationId(null)
    }
  }

  // Handle location click from map
  const handleLocationClick = (location: PickupLocation) => {
    setEditingLocation(location)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading locations...</span>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6" />
            Your Locations
          </h2>
          <p className="text-muted-foreground">
            Manage your pickup locations for ride sharing
          </p>
        </div>
        
        {showAddButton && (
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {actionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}
      
      {actionSuccess && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{actionSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Map Display */}
      {showMap && (
        <LocationDisplay
          locations={pickupLocations}
          homeLocation={homeLocation}
          onLocationClick={handleLocationClick}
          className="mb-6"
        />
      )}

      {/* Location List */}
      <Card>
        <CardHeader>
          <CardTitle>Location Management</CardTitle>
        </CardHeader>
        <CardContent>
          {pickupLocations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No pickup locations yet</p>
              <p className="text-sm">Add your first pickup location to get started</p>
              {showAddButton && (
                <Button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Location
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {pickupLocations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Navigation className="w-5 h-5 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{location.name}</h4>
                        {location.is_default && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {location.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {location.coords[0].toFixed(6)}, {location.coords[1].toFixed(6)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!location.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(location.id)}
                        disabled={actionLoading === `default-${location.id}`}
                      >
                        {actionLoading === `default-${location.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Star className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingLocation(location)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteLocation(location.id)}
                      disabled={actionLoading === `delete-${location.id}`}
                      className="text-red-600 hover:text-red-700"
                    >
                      {actionLoading === `delete-${location.id}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Location Modal */}
      <LocationPickerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onLocationSave={handleAddLocation}
        title="Add New Pickup Location"
      />

      {/* Edit Location Modal */}
      {editingLocation && (
        <LocationPickerModal
          isOpen={true}
          onClose={() => setEditingLocation(null)}
          onLocationSave={async (data) => {
            const result = await updatePickupLocation(editingLocation.id, data)
            if (!result.error) {
              setEditingLocation(null)
            }
            return result
          }}
          initialLocation={editingLocation.coords}
          title="Edit Pickup Location"
        />
      )}
    </div>
  )
}
