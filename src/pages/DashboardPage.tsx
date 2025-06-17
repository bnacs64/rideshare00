import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePickupLocations } from '../hooks/usePickupLocations'
import { useOptIns } from '../hooks/useOptIns'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription } from '../components/ui/alert'
import {
  Car,
  MapPin,
  Calendar,
  Users,
  Clock,
  Plus,
  ArrowRight,
  // CheckCircle, // Commented out as not currently used
  AlertTriangle,
  TrendingUp,
  Settings
} from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const { user, signOut } = useAuth()
  const { pickupLocations, defaultPickupLocation } = usePickupLocations()
  const { todayOptIns, loading: optInsLoading } = useOptIns()

  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getNextCommute = () => {
    const today = new Date().toISOString().split('T')[0]
    return todayOptIns.find(opt => opt.commute_date === today)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  NSU Commute
                </h1>
                <p className="text-sm text-muted-foreground">Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/profile" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Profile
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0 space-y-8">
          {/* Welcome Section */}
          <div className="relative">
            <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <CardContent className="relative p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">
                      {getGreeting()}, {user?.full_name}!
                    </h2>
                    <p className="text-blue-100 mb-4 text-lg">
                      Ready for your next commute?
                    </p>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        {user?.default_role === 'DRIVER' ? '🚗 Driver' : '🎒 Rider'}
                      </Badge>
                      <span className="text-blue-100 text-sm">
                        {currentTime.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center">
                      <Car className="w-12 h-12 text-white" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pickup Locations</p>
                    <p className="text-3xl font-bold text-foreground">{pickupLocations.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Today's Opt-ins</p>
                    <p className="text-3xl font-bold text-foreground">{todayOptIns.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Rides</p>
                    <p className="text-3xl font-bold text-foreground">0</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Car className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Savings</p>
                    <p className="text-3xl font-bold text-foreground">৳0</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Next Commute & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Next Commute */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Today's Commute
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {getNextCommute() ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">Opt-in Active</p>
                            <p className="text-sm text-muted-foreground">
                              {getNextCommute()?.time_window_start} - {getNextCommute()?.time_window_end}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {getNextCommute()?.status}
                        </Badge>
                      </div>
                      <div className="flex gap-3">
                        <Button asChild className="flex-1">
                          <Link to="/matched-rides">
                            View Matches
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Link>
                        </Button>
                        <Button variant="outline" asChild>
                          <Link to="/opt-in-status">
                            Manage
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">No commute planned</h3>
                      <p className="text-muted-foreground mb-6">
                        Create an opt-in to find ride matches for today
                      </p>
                      <Button asChild size="lg" className="shadow-lg">
                        <Link to="/opt-in">
                          <Plus className="w-4 h-4 mr-2" />
                          Find a Ride
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Quick Actions</h3>
              <div className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-start h-auto p-4">
                  <Link to="/scheduled-opt-ins" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Scheduled Rides</p>
                      <p className="text-sm text-muted-foreground">Set up recurring</p>
                    </div>
                  </Link>
                </Button>

                <Button asChild variant="outline" className="w-full justify-start h-auto p-4">
                  <Link to="/matched-rides" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">My Rides</p>
                      <p className="text-sm text-muted-foreground">View matches</p>
                    </div>
                  </Link>
                </Button>

                <Button asChild variant="outline" className="w-full justify-start h-auto p-4">
                  <Link to="/locations" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Locations</p>
                      <p className="text-sm text-muted-foreground">Manage pickup spots</p>
                    </div>
                  </Link>
                </Button>

                <Button asChild variant="outline" className="w-full justify-start h-auto p-4 border-blue-200 bg-blue-50">
                  <Link to="/mapbox-test" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-blue-700">🗺️ Mapbox Test</p>
                      <p className="text-sm text-blue-600">New map experience</p>
                    </div>
                  </Link>
                </Button>
              </div>
            </div>
          </div>



          {/* Setup Reminders */}
          {(pickupLocations.length === 0 || !user?.telegram_user_id) && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <div className="space-y-2">
                  <p className="font-medium">Complete your setup to start finding rides:</p>
                  <div className="space-y-1 text-sm">
                    {pickupLocations.length === 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        <span>
                          <Link to="/locations" className="font-medium underline hover:text-amber-600">
                            Add pickup locations
                          </Link>
                        </span>
                      </div>
                    )}
                    {!user?.telegram_user_id && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        <span>
                          <Link to="/profile" className="font-medium underline hover:text-amber-600">
                            Set up Telegram notifications
                          </Link>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Recent Activity */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Your ride history and activity will appear here once you start using NSU Commute.
                </p>
                <Button asChild size="lg" className="shadow-lg">
                  <Link to="/opt-in">
                    <Plus className="w-4 h-4 mr-2" />
                    Get Started
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
