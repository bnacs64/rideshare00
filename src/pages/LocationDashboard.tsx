import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LocationProvider } from '../contexts/LocationContext'
import { LocationManager } from '../components/location/LocationManager'
import { LocationSearch } from '../components/location/LocationSearch'
import { BaseMap, MapMarker } from '../components/map/BaseMap'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { 
  MapPin, 
  Navigation, 
  Search, 
  Home, 
  ArrowLeft,
  Map,
  List,
  Settings,
  Info
} from 'lucide-react'
import { usePickupLocations } from '../hooks/usePickupLocations'
import { GeocodeResult } from '../services/locationService'

export const LocationDashboard: React.FC = () => {
  const { user } = useAuth()
  const { pickupLocations, defaultPickupLocation } = usePickupLocations()
  const [selectedSearchLocation, setSelectedSearchLocation] = useState<GeocodeResult | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Get home location coordinates for map display
  const getHomeLocationCoords = (): [number, number] | undefined => {
    if (user?.home_location_coords) {
      // Convert from PostGIS format [lng, lat] to [lat, lng] for display
      return [user.home_location_coords[1], user.home_location_coords[0]]
    }
    return undefined
  }

  // Calculate map center based on available locations
  const getMapCenter = (): [number, number] => {
    const homeCoords = getHomeLocationCoords()
    if (homeCoords) return homeCoords
    
    if (pickupLocations.length > 0) {
      return pickupLocations[0].coords
    }
    
    // Default to Dhaka, Bangladesh
    return [23.8103, 90.4125]
  }

  const handleSearchLocationSelect = (location: GeocodeResult) => {
    setSelectedSearchLocation(location)
  }

  return (
    <LocationProvider autoRequestLocation={false}>
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
                  <h1 className="text-2xl font-bold text-foreground">Location Dashboard</h1>
                </div>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                {pickupLocations.length} Location{pickupLocations.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Locations</p>
                      <p className="text-3xl font-bold text-foreground">{pickupLocations.length}</p>
                    </div>
                    <MapPin className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Default Location</p>
                      <p className="text-lg font-semibold text-foreground">
                        {defaultPickupLocation?.name || 'None set'}
                      </p>
                    </div>
                    <Navigation className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Home Location</p>
                      <p className="text-lg font-semibold text-foreground">
                        {getHomeLocationCoords() ? 'Set' : 'Not set'}
                      </p>
                    </div>
                    <Home className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Location Search */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Location Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <LocationSearch
                    onLocationSelect={handleSearchLocationSelect}
                    placeholder="Search for any location in Bangladesh..."
                    showCurrentLocation={true}
                  />
                  
                  {selectedSearchLocation && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <MapPin className="w-4 h-4" />
                      <AlertDescription className="text-blue-800">
                        <strong>Selected:</strong> {selectedSearchLocation.address}
                        <br />
                        <span className="text-sm">
                          Coordinates: {selectedSearchLocation.lat.toFixed(6)}, {selectedSearchLocation.lng.toFixed(6)}
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="map" className="flex items-center gap-2">
                  <Map className="w-4 h-4" />
                  Map View
                </TabsTrigger>
                <TabsTrigger value="manage" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Manage
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Overview Map */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle>Location Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BaseMap
                      center={getMapCenter()}
                      zoom={13}
                      height="400px"
                    >
                      {/* Home Location */}
                      {getHomeLocationCoords() && (
                        <MapMarker
                          position={getHomeLocationCoords()!}
                          title="Home Location"
                          description="Your registered home address"
                          icon="home"
                        />
                      )}
                      
                      {/* Pickup Locations */}
                      {pickupLocations.map((location) => (
                        <MapMarker
                          key={location.id}
                          position={location.coords}
                          title={location.name}
                          description={location.description}
                          icon="pickup"
                        />
                      ))}

                      {/* Search Result */}
                      {selectedSearchLocation && (
                        <MapMarker
                          position={[selectedSearchLocation.lat, selectedSearchLocation.lng]}
                          title="Search Result"
                          description={selectedSearchLocation.address}
                          icon="destination"
                        />
                      )}
                    </BaseMap>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-md">
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button className="w-full justify-start" onClick={() => setActiveTab('manage')}>
                        <MapPin className="w-4 h-4 mr-2" />
                        Add New Location
                      </Button>
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link to="/profile">
                          <Settings className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-md">
                    <CardHeader>
                      <CardTitle className="text-lg">Location Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p>• Set a default pickup location for faster ride matching</p>
                      <p>• Add multiple locations for different scenarios</p>
                      <p>• Use descriptive names to identify locations easily</p>
                      <p>• Keep your home location updated for better matches</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="map" className="space-y-6">
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle>Interactive Map</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BaseMap
                      center={getMapCenter()}
                      zoom={12}
                      height="600px"
                    >
                      {/* All locations on map */}
                      {getHomeLocationCoords() && (
                        <MapMarker
                          position={getHomeLocationCoords()!}
                          title="Home Location"
                          description="Your registered home address"
                          icon="home"
                        />
                      )}
                      
                      {pickupLocations.map((location) => (
                        <MapMarker
                          key={location.id}
                          position={location.coords}
                          title={location.name}
                          description={location.description}
                          icon="pickup"
                        />
                      ))}

                      {selectedSearchLocation && (
                        <MapMarker
                          position={[selectedSearchLocation.lat, selectedSearchLocation.lng]}
                          title="Search Result"
                          description={selectedSearchLocation.address}
                          icon="destination"
                        />
                      )}
                    </BaseMap>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="manage" className="space-y-6">
                <LocationManager
                  homeLocation={getHomeLocationCoords()}
                  showMap={true}
                  showAddButton={true}
                />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </LocationProvider>
  )
}
