import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useOptIns } from '../hooks/useOptIns'
import { usePickupLocations } from '../hooks/usePickupLocations'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription } from '../components/ui/alert'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  XCircle,
  Edit,
  Trash2,
  RefreshCw,
  TrendingUp,
  CalendarDays,
  Users,
  Car
} from 'lucide-react'

export const OptInStatusPage: React.FC = () => {
  const { user } = useAuth()
  const { pickupLocations } = usePickupLocations()
  const { 
    dailyOptIns,
    todayOptIns,
    upcomingOptIns,
    scheduledOptIns,
    stats,
    loading,
    cancelDailyOptIn,
    deleteDailyOptIn,
    refreshOptIns
  } = useOptIns()

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatTime = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const getPickupLocationName = (locationId: string): string => {
    const location = pickupLocations.find(loc => loc.id === locationId)
    return location ? location.name : 'Unknown Location'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_MATCH':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Match</Badge>
      case 'MATCHED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Matched</Badge>
      case 'CANCELLED':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleCancel = async (optInId: string) => {
    if (window.confirm('Are you sure you want to cancel this opt-in?')) {
      setActionLoading(optInId)
      try {
        await cancelDailyOptIn(optInId)
      } finally {
        setActionLoading(null)
      }
    }
  }

  const handleDelete = async (optInId: string) => {
    if (window.confirm('Are you sure you want to delete this opt-in? This action cannot be undone.')) {
      setActionLoading(optInId)
      try {
        await deleteDailyOptIn(optInId)
      } finally {
        setActionLoading(null)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={refreshOptIns}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Opt-in Status</h1>
                <p className="text-gray-600 mt-2">
                  View and manage all your ride opt-ins and schedules.
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button asChild>
                  <Link to="/opt-in">
                    <Plus className="w-4 h-4 mr-2" />
                    New Opt-in
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/scheduled-opt-ins">
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Schedules
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Opt-ins</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalDailyOptIns}</p>
                    </div>
                    <Car className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Matches</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.pendingMatches}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Matched Rides</p>
                      <p className="text-2xl font-bold text-green-600">{stats.matchedRides}</p>
                    </div>
                    <Users className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Schedules</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.activeScheduledOptIns}</p>
                    </div>
                    <CalendarDays className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs for different views */}
          <Tabs defaultValue="today" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="all">All Opt-ins</TabsTrigger>
              <TabsTrigger value="schedules">Schedules</TabsTrigger>
            </TabsList>

            {/* Today's Opt-ins */}
            <TabsContent value="today" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Today's Opt-ins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {todayOptIns.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No opt-ins for today</h3>
                      <p className="text-gray-600 mb-4">You haven't opted in for any rides today.</p>
                      <Button asChild>
                        <Link to="/opt-in">
                          <Plus className="w-4 h-4 mr-2" />
                          Opt-in for Today
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {todayOptIns.map((optIn) => (
                        <div key={optIn.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">
                                  {formatTime(optIn.time_window_start)} - {formatTime(optIn.time_window_end)}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-600">
                                  {getPickupLocationName(optIn.pickup_location_id)}
                                </span>
                              </div>
                              
                              {getStatusBadge(optIn.status)}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {optIn.status === 'PENDING_MATCH' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancel(optIn.id)}
                                  disabled={actionLoading === optIn.id}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Cancel
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(optIn.id)}
                                disabled={actionLoading === optIn.id}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Upcoming Opt-ins */}
            <TabsContent value="upcoming" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Upcoming Opt-ins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingOptIns.length === 0 ? (
                    <div className="text-center py-8">
                      <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming opt-ins</h3>
                      <p className="text-gray-600 mb-4">You don't have any upcoming ride opt-ins.</p>
                      <Button asChild>
                        <Link to="/opt-in">
                          <Plus className="w-4 h-4 mr-2" />
                          Schedule a Ride
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingOptIns.map((optIn) => (
                        <div key={optIn.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">{formatDate(optIn.commute_date)}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">
                                  {formatTime(optIn.time_window_start)} - {formatTime(optIn.time_window_end)}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-600">
                                  {getPickupLocationName(optIn.pickup_location_id)}
                                </span>
                              </div>
                              
                              {getStatusBadge(optIn.status)}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {optIn.status === 'PENDING_MATCH' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancel(optIn.id)}
                                  disabled={actionLoading === optIn.id}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Cancel
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(optIn.id)}
                                disabled={actionLoading === optIn.id}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Opt-ins */}
            <TabsContent value="all" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    All Daily Opt-ins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dailyOptIns.length === 0 ? (
                    <div className="text-center py-8">
                      <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No opt-ins yet</h3>
                      <p className="text-gray-600 mb-4">You haven't created any ride opt-ins yet.</p>
                      <Button asChild>
                        <Link to="/opt-in">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Your First Opt-in
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dailyOptIns.map((optIn) => (
                        <div key={optIn.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">{formatDate(optIn.commute_date)}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">
                                  {formatTime(optIn.time_window_start)} - {formatTime(optIn.time_window_end)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-600">
                                  {getPickupLocationName(optIn.pickup_location_id)}
                                </span>
                              </div>

                              {getStatusBadge(optIn.status)}

                              {optIn.is_automatic && (
                                <Badge variant="outline" className="text-xs">Auto</Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {optIn.status === 'PENDING_MATCH' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancel(optIn.id)}
                                  disabled={actionLoading === optIn.id}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Cancel
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(optIn.id)}
                                disabled={actionLoading === optIn.id}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Scheduled Opt-ins */}
            <TabsContent value="schedules" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    Scheduled Opt-ins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {scheduledOptIns.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled opt-ins</h3>
                      <p className="text-gray-600 mb-4">Set up recurring schedules for automatic opt-ins.</p>
                      <Button asChild>
                        <Link to="/scheduled-opt-ins">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Schedule
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {scheduledOptIns.map((optIn) => (
                        <div key={optIn.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">{optIn.day_of_week}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">{formatTime(optIn.start_time)}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-600">
                                  {getPickupLocationName(optIn.pickup_location_id)}
                                </span>
                              </div>

                              <Badge
                                variant={optIn.is_active ? "secondary" : "outline"}
                                className={optIn.is_active ? "bg-green-100 text-green-800" : ""}
                              >
                                {optIn.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link to="/scheduled-opt-ins">
                                  <Edit className="w-3 h-3 mr-1" />
                                  Manage
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
