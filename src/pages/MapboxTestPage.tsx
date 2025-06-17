import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapboxMap, MapboxLocationPicker, MapboxLocationPickerWithRoute } from '../components/map'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Alert, AlertDescription } from '../components/ui/alert'
import { 
  ArrowLeft, 
  MapPin, 
  // Navigation, // Commented out as not currently used
  CheckCircle,
  Info
} from 'lucide-react'

export const MapboxTestPage: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number
    lng: number
    address?: string
  } | null>(null)

  const [testResults, setTestResults] = useState<string[]>([])

  // NSU Campus coordinates
  const nsuLocation: [number, number] = [90.4125, 23.8103] // [lng, lat]

  // Sample markers for testing
  const sampleMarkers = [
    {
      id: 'nsu',
      coordinates: [90.4125, 23.8103] as [number, number],
      title: 'NSU Campus',
      description: 'North South University',
      type: 'destination' as const
    },
    {
      id: 'dhanmondi',
      coordinates: [90.3742, 23.7461] as [number, number],
      title: 'Dhanmondi',
      description: 'Popular residential area',
      type: 'pickup' as const
    },
    {
      id: 'gulshan',
      coordinates: [90.4152, 23.7805] as [number, number],
      title: 'Gulshan',
      description: 'Business district',
      type: 'pickup' as const
    }
  ]

  const handleLocationSelect = (location: { lat: number; lng: number; address?: string }) => {
    setSelectedLocation(location)
    setTestResults(prev => [...prev, `Location selected: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)} - ${location.address || 'No address'}`])
  }

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link to="/dashboard" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <MapPin className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Mapbox Integration Test</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Info Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-2">
                <p className="font-medium">Testing Mapbox Integration</p>
                <p className="text-sm">
                  This page demonstrates the new Mapbox components that will replace the current Leaflet implementation.
                  Test the different features and compare with the existing map experience.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Test Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <p key={index} className="text-sm font-mono bg-muted p-2 rounded">
                      {result}
                    </p>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setTestResults([])}
                  className="mt-2"
                >
                  Clear Results
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Mapbox Components Testing */}
          <Tabs defaultValue="basic-map" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic-map">Basic Map</TabsTrigger>
              <TabsTrigger value="location-picker">Location Picker</TabsTrigger>
              <TabsTrigger value="route-preview">Route Preview</TabsTrigger>
              <TabsTrigger value="comparison">Comparison</TabsTrigger>
            </TabsList>

            {/* Basic Map Test */}
            <TabsContent value="basic-map" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Mapbox Map</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Test the basic map functionality with markers and interactions
                  </p>
                </CardHeader>
                <CardContent>
                  <MapboxMap
                    center={nsuLocation}
                    zoom={13}
                    height="500px"
                    markers={sampleMarkers}
                    onLocationSelect={(location) => {
                      addTestResult(`Map clicked at: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`)
                    }}
                    showGeocoder={false}
                    showNavigation={true}
                  />
                  <div className="mt-4 text-sm text-muted-foreground">
                    <p>• Click anywhere on the map to test location selection</p>
                    <p>• Use navigation controls to zoom and pan</p>
                    <p>• Click on markers to see popups</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Location Picker Test */}
            <TabsContent value="location-picker" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MapboxLocationPicker
                  title="Enhanced Location Picker"
                  description="Test the location picker with search and map interaction"
                  initialLocation={nsuLocation}
                  onLocationSelect={handleLocationSelect}
                  height="400px"
                  showAddressSearch={true}
                />
                
                {selectedLocation && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Selected Location</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <p><strong>Latitude:</strong> {selectedLocation.lat.toFixed(6)}</p>
                        <p><strong>Longitude:</strong> {selectedLocation.lng.toFixed(6)}</p>
                        {selectedLocation.address && (
                          <p><strong>Address:</strong> {selectedLocation.address}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Route Preview Test */}
            <TabsContent value="route-preview" className="space-y-4">
              <MapboxLocationPickerWithRoute
                title="Location Picker with Route Preview"
                description="Select a pickup location and see the route to NSU"
                initialLocation={[90.3742, 23.7461]} // Dhanmondi
                destinationLocation={nsuLocation}
                onLocationSelect={(location) => {
                  addTestResult(`Route pickup location: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`)
                }}
                height="400px"
                showAddressSearch={true}
                showRoute={true}
              />
            </TabsContent>

            {/* Comparison */}
            <TabsContent value="comparison" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600">✅ Mapbox Advantages</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>• <strong>Performance:</strong> WebGL rendering, 60fps animations</p>
                    <p>• <strong>Styling:</strong> Beautiful, customizable map styles</p>
                    <p>• <strong>Geocoding:</strong> Superior accuracy for Bangladesh</p>
                    <p>• <strong>Mobile:</strong> Touch-optimized interactions</p>
                    <p>• <strong>Features:</strong> Traffic data, routing, directions</p>
                    <p>• <strong>Coverage:</strong> Better local business data</p>
                    <p>• <strong>Developer Experience:</strong> Better docs and TypeScript support</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-orange-600">⚠️ Current Leaflet Issues</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>• <strong>Performance:</strong> Canvas rendering, slower on mobile</p>
                    <p>• <strong>Styling:</strong> Limited customization options</p>
                    <p>• <strong>Geocoding:</strong> Nominatim rate limits and accuracy</p>
                    <p>• <strong>Mobile:</strong> Not optimized for touch</p>
                    <p>• <strong>Features:</strong> No built-in routing or traffic</p>
                    <p>• <strong>Coverage:</strong> Limited Bangladesh business data</p>
                    <p>• <strong>Maintenance:</strong> Additional complexity with plugins</p>
                  </CardContent>
                </Card>
              </div>

              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="space-y-2">
                    <p className="font-medium">Recommendation: Proceed with Mapbox Migration</p>
                    <p className="text-sm">
                      Based on testing, Mapbox provides significant improvements in performance, 
                      user experience, and features while maintaining cost-effectiveness for NSU Commute's usage.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
