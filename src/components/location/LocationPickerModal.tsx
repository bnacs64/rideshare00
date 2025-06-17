import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { LocationPicker } from '../map/LocationPicker'
import { Alert, AlertDescription } from '../ui/alert'
import { MapPin, Loader2, CheckCircle } from 'lucide-react'

interface LocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onLocationSave: (locationData: {
    name: string
    description: string
    coords: [number, number]
    address?: string
    is_default?: boolean
  }) => Promise<{ error?: any }>
  initialLocation?: [number, number]
  title?: string
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onLocationSave,
  initialLocation,
  title = "Add New Location"
}) => {
  const [step, setStep] = useState<'details' | 'map' | 'saving'>('details')
  const [locationData, setLocationData] = useState({
    name: '',
    description: '',
    coords: null as [number, number] | null,
    address: '',
    is_default: false
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLocationSelect = (location: { lat: number; lng: number; address?: string }) => {
    setLocationData(prev => ({
      ...prev,
      coords: [location.lat, location.lng], // Store as [lat, lng] for consistency
      address: location.address || ''
    }))
    setStep('details')
  }

  const handleSave = async () => {
    // Validate required fields
    if (!locationData.name.trim()) {
      setError('Location name is required')
      return
    }
    
    if (!locationData.description.trim()) {
      setError('Location description is required')
      return
    }
    
    if (!locationData.coords) {
      setError('Please select a location on the map')
      return
    }

    setIsLoading(true)
    setError('')
    setStep('saving')

    try {
      const result = await onLocationSave({
        name: locationData.name.trim(),
        description: locationData.description.trim(),
        coords: locationData.coords,
        address: locationData.address,
        is_default: locationData.is_default
      })

      if (result.error) {
        setError(result.error.message || 'Failed to save location')
        setStep('details')
      } else {
        // Success - close modal after a brief delay
        setTimeout(() => {
          handleClose()
        }, 1000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setStep('details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setStep('details')
    setLocationData({
      name: '',
      description: '',
      coords: null,
      address: '',
      is_default: false
    })
    setError('')
    setIsLoading(false)
    onClose()
  }

  const canProceedToMap = locationData.name.trim() && locationData.description.trim()

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {step === 'details' && (
          <div className="space-y-6">
            {/* Location Details Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location-name">Location Name *</Label>
                <Input
                  id="location-name"
                  placeholder="e.g., Home, Office, University Gate"
                  value={locationData.name}
                  onChange={(e) => setLocationData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-description">Description *</Label>
                <Textarea
                  id="location-description"
                  placeholder="Describe this location to help identify it..."
                  value={locationData.description}
                  onChange={(e) => setLocationData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              {locationData.coords && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-900">Location Selected</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Coordinates: {locationData.coords[0].toFixed(6)}, {locationData.coords[1].toFixed(6)}
                  </p>
                  {locationData.address && (
                    <p className="text-sm text-green-700 mt-1">
                      Address: {locationData.address}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is-default"
                  checked={locationData.is_default}
                  onChange={(e) => setLocationData(prev => ({ ...prev, is_default: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is-default" className="text-sm">
                  Set as default pickup location
                </Label>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              
              {!locationData.coords ? (
                <Button 
                  onClick={() => setStep('map')}
                  disabled={!canProceedToMap}
                >
                  Select Location on Map
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => setStep('map')}
                  >
                    Change Location
                  </Button>
                  <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Location'
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <LocationPicker
              initialLocation={locationData.coords || initialLocation}
              onLocationSelect={handleLocationSelect}
              onCancel={() => setStep('details')}
              title="Select Location"
              description="Click on the map to select the exact location"
              height="500px"
              showAddressSearch={true}
            />
          </div>
        )}

        {step === 'saving' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <h3 className="text-lg font-medium">Saving Location...</h3>
            <p className="text-sm text-muted-foreground">Please wait while we save your location</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
