import React, { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  MapPin,
  Users,
  Car,
  Phone,
  MessageCircle,
  Navigation,
  Loader2
} from 'lucide-react'

interface RideStatusManagerProps {
  ride: any
  userRole: 'DRIVER' | 'RIDER'
  userParticipation: any
  onConfirm: (rideId: string) => Promise<void>
  onDecline: (rideId: string) => Promise<void>
  loading?: boolean
}

export const RideStatusManager: React.FC<RideStatusManagerProps> = ({
  ride,
  userRole,
  userParticipation,
  onConfirm,
  onDecline,
  loading = false
}) => {
  const [showDetails, setShowDetails] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_CONFIRMATION':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getParticipantStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-600 border-yellow-300'
      case 'CONFIRMED':
        return 'text-green-600 border-green-300'
      case 'DECLINED':
        return 'text-red-600 border-red-300'
      case 'NO_RESPONSE':
        return 'text-gray-600 border-gray-300'
      default:
        return 'text-gray-600 border-gray-300'
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatTime = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const canTakeAction = userParticipation?.status === 'PENDING' && ride.status === 'PENDING_CONFIRMATION'

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            Ride Match - {formatDate(ride.commute_date)}
          </CardTitle>
          <Badge className={getStatusColor(ride.status)}>
            {ride.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Ride Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm">~{ride.estimated_total_time} minutes</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">৳{ride.estimated_cost_per_person}</span>
            <span className="text-xs text-gray-500">per person</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm">{ride.ride_participants?.length || 0} participants</span>
          </div>
        </div>

        {/* User Role Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={userRole === 'DRIVER' ? 'text-blue-600 border-blue-300' : 'text-green-600 border-green-300'}>
            You are the {userRole}
          </Badge>
          {userParticipation && (
            <Badge variant="outline" className={getParticipantStatusColor(userParticipation.status)}>
              Status: {userParticipation.status.replace('_', ' ')}
            </Badge>
          )}
        </div>

        {/* AI Reasoning */}
        {ride.ai_reasoning && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>AI Match Reasoning:</strong> {ride.ai_reasoning}
              <br />
              <span className="text-xs">Confidence Score: {ride.ai_confidence_score}%</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        {canTakeAction && (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => onConfirm(ride.id)}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Participation
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => onDecline(ride.id)}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Declining...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </>
              )}
            </Button>
          </div>
        )}

        {/* Confirmed Ride Actions */}
        {ride.status === 'CONFIRMED' && (
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" size="sm" className="flex-1">
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact Group
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Navigation className="w-4 h-4 mr-2" />
              View Route
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Phone className="w-4 h-4 mr-2" />
              Call Driver
            </Button>
          </div>
        )}

        {/* View Details */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              View Detailed Information
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ride Details - {formatDate(ride.commute_date)}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Participants List */}
              <div>
                <h4 className="font-medium mb-3">Participants</h4>
                <div className="space-y-3">
                  {ride.ride_participants?.map((participant: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          participant.user_id === ride.driver_user_id ? 'bg-blue-500' : 'bg-green-500'
                        }`} />
                        <div>
                          <p className="font-medium">
                            {participant.users?.full_name || 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {participant.user_id === ride.driver_user_id ? 'Driver' : 'Rider'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-3 h-3" />
                          {participant.pickup_locations?.name || 'Unknown Location'}
                        </div>
                      </div>
                      <Badge variant="outline" className={getParticipantStatusColor(participant.status)}>
                        {participant.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Route Information */}
              {ride.pickup_order && ride.pickup_order.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Pickup Route</h4>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      {ride.pickup_order.map((locationId: string, index: number) => {
                        const participant = ride.ride_participants?.find((p: any) => 
                          p.pickup_location_id === locationId
                        )
                        return (
                          <React.Fragment key={locationId}>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-600 rounded-full" />
                              <span className="font-medium">
                                {participant?.pickup_locations?.name || 'Unknown'}
                              </span>
                            </div>
                            {index < ride.pickup_order.length - 1 && (
                              <span className="text-gray-400">→</span>
                            )}
                          </React.Fragment>
                        )
                      })}
                      <span className="text-gray-400">→</span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        <span className="font-medium text-blue-600">NSU</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cost Breakdown */}
              <div>
                <h4 className="font-medium mb-3">Cost Information</h4>
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Estimated Total Cost:</span>
                    <span>৳{(ride.estimated_cost_per_person * (ride.ride_participants?.length || 1))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Your Share:</span>
                    <span className="font-medium">৳{ride.estimated_cost_per_person}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Estimated Time:</span>
                    <span>~{ride.estimated_total_time} minutes</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
