import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMatching } from '../hooks/useMatching'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription } from '../components/ui/alert'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  XCircle,
  Clock,
  MapPin,
  Users,
  Car,
  Phone,
  MessageCircle,
  Navigation,
  DollarSign,
  Calendar,
  RefreshCw
} from 'lucide-react'

export const MatchedRidesPage: React.FC = () => {
  const { user } = useAuth()
  const { 
    loading, 
    error, 
    matchedRides, 
    getUserRides, 
    confirmParticipation, 
    declineParticipation 
  } = useMatching()

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    getUserRides()
  }, [getUserRides])

  const handleConfirm = async (rideId: string) => {
    setActionLoading(rideId)
    try {
      const result = await confirmParticipation(rideId)
      if (result.success) {
        // Rides will be refreshed automatically by the hook
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleDecline = async (rideId: string) => {
    if (window.confirm('Are you sure you want to decline this ride? This action cannot be undone.')) {
      setActionLoading(rideId)
      try {
        const result = await declineParticipation(rideId)
        if (result.success) {
          // Rides will be refreshed automatically by the hook
        }
      } finally {
        setActionLoading(null)
      }
    }
  }

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PROPOSED':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Proposed</Badge>
      case 'CONFIRMED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Confirmed</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>
      case 'COMPLETED':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Completed</Badge>
      case 'CANCELLED':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getParticipantStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_ACCEPTANCE':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pending</Badge>
      case 'CONFIRMED':
        return <Badge variant="outline" className="text-green-600 border-green-300">Confirmed</Badge>
      case 'DECLINED':
        return <Badge variant="outline" className="text-red-600 border-red-300">Declined</Badge>
      case 'NO_RESPONSE':
        return <Badge variant="outline" className="text-gray-600 border-gray-300">No Response</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getUserParticipation = (ride: any) => {
    return ride.ride_participants?.find((p: any) => p.user_id === user?.id)
  }

  const isDriver = (ride: any) => {
    return ride.driver_user_id === user?.id
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const pendingRides = matchedRides.filter(ride => ride.status === 'PROPOSED')
  const confirmedRides = matchedRides.filter(ride => ride.status === 'CONFIRMED')
  const completedRides = matchedRides.filter(ride => ['COMPLETED', 'CANCELLED'].includes(ride.status))

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
              <Button variant="outline" size="sm" onClick={() => getUserRides()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">My Matched Rides</h1>
            <p className="text-gray-600 mt-2">
              View and manage your ride matches and confirmations.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Tabs for different ride statuses */}
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                Pending ({pendingRides.length})
              </TabsTrigger>
              <TabsTrigger value="confirmed">
                Confirmed ({confirmedRides.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedRides.length})
              </TabsTrigger>
            </TabsList>

            {/* Pending Rides */}
            <TabsContent value="pending" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Pending Confirmation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingRides.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No pending rides</h3>
                      <p className="text-gray-600 mb-4">You don't have any rides waiting for confirmation.</p>
                      <Button asChild>
                        <Link to="/opt-in">
                          Create New Opt-in
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingRides.map((ride) => {
                        const userParticipation = getUserParticipation(ride)
                        const driverRole = isDriver(ride)
                        
                        return (
                          <div key={ride.id} className="border rounded-lg p-4 bg-white">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-500" />
                                  <span className="font-medium">{formatDate(ride.commute_date)}</span>
                                </div>
                                {getStatusBadge(ride.status)}
                                {driverRole && (
                                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                                    You're the Driver
                                  </Badge>
                                )}
                              </div>
                              
                              {userParticipation && userParticipation.status === 'PENDING_ACCEPTANCE' && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleConfirm(ride.id)}
                                    disabled={actionLoading === ride.id}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Confirm
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDecline(ride.id)}
                                    disabled={actionLoading === ride.id}
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Decline
                                  </Button>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">~{ride.estimated_total_time} minutes</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">৳{ride.estimated_cost_per_person} per person</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">{ride.ride_participants?.length || 0} participants</span>
                              </div>
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="text-sm font-medium mb-3">Participants:</h4>
                              <div className="space-y-2">
                                {ride.ride_participants?.map((participant: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-2 h-2 rounded-full ${
                                        participant.user_id === ride.driver_user_id ? 'bg-blue-500' : 'bg-green-500'
                                      }`} />
                                      <span className="font-medium">
                                        {participant.users?.full_name || 'Unknown User'}
                                      </span>
                                      <span className="text-sm text-gray-500">
                                        ({participant.user_id === ride.driver_user_id ? 'Driver' : 'Rider'})
                                      </span>
                                      <div className="flex items-center gap-1 text-sm text-gray-600">
                                        <MapPin className="w-3 h-3" />
                                        {participant.pickup_locations?.name || 'Unknown Location'}
                                      </div>
                                    </div>
                                    {getParticipantStatusBadge(participant.status)}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {ride.ai_reasoning && (
                              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                                <p className="text-sm text-blue-800">
                                  <strong>AI Match Reasoning:</strong> {ride.ai_reasoning}
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                  Confidence Score: {ride.ai_confidence_score}%
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Confirmed Rides */}
            <TabsContent value="confirmed" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Confirmed Rides
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {confirmedRides.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No confirmed rides</h3>
                      <p className="text-gray-600">You don't have any confirmed rides yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {confirmedRides.map((ride) => {
                        const driverRole = isDriver(ride)

                        return (
                          <div key={ride.id} className="border rounded-lg p-4 bg-white">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-500" />
                                  <span className="font-medium">{formatDate(ride.commute_date)}</span>
                                </div>
                                {getStatusBadge(ride.status)}
                                {driverRole && (
                                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                                    You're the Driver
                                  </Badge>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  <MessageCircle className="w-3 h-3 mr-1" />
                                  Contact Group
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Navigation className="w-3 h-3 mr-1" />
                                  View Route
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">~{ride.estimated_total_time} minutes</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">৳{ride.estimated_cost_per_person} per person</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">{ride.ride_participants?.length || 0} participants</span>
                              </div>
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="text-sm font-medium mb-3">Participants:</h4>
                              <div className="space-y-2">
                                {ride.ride_participants?.map((participant: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-2 h-2 rounded-full ${
                                        participant.user_id === ride.driver_user_id ? 'bg-blue-500' : 'bg-green-500'
                                      }`} />
                                      <span className="font-medium">
                                        {participant.users?.full_name || 'Unknown User'}
                                      </span>
                                      <span className="text-sm text-gray-500">
                                        ({participant.user_id === ride.driver_user_id ? 'Driver' : 'Rider'})
                                      </span>
                                      <div className="flex items-center gap-1 text-sm text-gray-600">
                                        <MapPin className="w-3 h-3" />
                                        {participant.pickup_locations?.name || 'Unknown Location'}
                                      </div>
                                    </div>
                                    {getParticipantStatusBadge(participant.status)}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {ride.pickup_order && ride.pickup_order.length > 0 && (
                              <div className="mt-4 p-3 bg-green-50 rounded-md">
                                <h5 className="text-sm font-medium text-green-800 mb-2">Pickup Order:</h5>
                                <div className="flex items-center gap-2 text-sm text-green-700">
                                  {ride.pickup_order.map((locationId: string, index: number) => {
                                    const participant = ride.ride_participants?.find((p: any) =>
                                      p.pickup_location_id === locationId
                                    )
                                    return (
                                      <React.Fragment key={locationId}>
                                        <span>{participant?.pickup_locations?.name || 'Unknown'}</span>
                                        {index < ride.pickup_order.length - 1 && (
                                          <span className="text-gray-400">→</span>
                                        )}
                                      </React.Fragment>
                                    )
                                  })}
                                  <span className="text-gray-400">→</span>
                                  <span className="font-medium">NSU</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Completed Rides */}
            <TabsContent value="completed" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    Completed & Cancelled Rides
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {completedRides.length === 0 ? (
                    <div className="text-center py-8">
                      <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No completed rides</h3>
                      <p className="text-gray-600">Your ride history will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {completedRides.map((ride) => {
                        const driverRole = isDriver(ride)

                        return (
                          <div key={ride.id} className="border rounded-lg p-4 bg-white opacity-75">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-500" />
                                  <span className="font-medium">{formatDate(ride.commute_date)}</span>
                                </div>
                                {getStatusBadge(ride.status)}
                                {driverRole && (
                                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                                    You were the Driver
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">~{ride.estimated_total_time} minutes</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">৳{ride.estimated_cost_per_person} per person</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">{ride.ride_participants?.length || 0} participants</span>
                              </div>
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="text-sm font-medium mb-3">Participants:</h4>
                              <div className="space-y-2">
                                {ride.ride_participants?.map((participant: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-2 h-2 rounded-full ${
                                        participant.user_id === ride.driver_user_id ? 'bg-blue-500' : 'bg-green-500'
                                      }`} />
                                      <span className="font-medium">
                                        {participant.users?.full_name || 'Unknown User'}
                                      </span>
                                      <span className="text-sm text-gray-500">
                                        ({participant.user_id === ride.driver_user_id ? 'Driver' : 'Rider'})
                                      </span>
                                      <div className="flex items-center gap-1 text-sm text-gray-600">
                                        <MapPin className="w-3 h-3" />
                                        {participant.pickup_locations?.name || 'Unknown Location'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      })}
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
