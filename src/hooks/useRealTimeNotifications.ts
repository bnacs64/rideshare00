import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { notificationService } from '../services/notificationService'
import { useAuth } from '../contexts/AuthContext'

interface NotificationActivity {
  ride_id: string
  commute_date: string
  ride_status: string
  ride_created: string
  ride_updated: string
  participant_count: number
  telegram_enabled_count: number
  participants: string[]
  telegram_ids: number[]
}

interface UseRealTimeNotificationsReturn {
  // Data
  activities: NotificationActivity[]
  
  // Loading states
  loading: boolean
  sending: boolean
  
  // Error state
  error: string | null
  
  // Actions
  sendTestNotification: (rideId: string, type: string, reason?: string) => Promise<any>
  refreshActivities: () => Promise<void>
  
  // Real-time subscription status
  subscriptionStatus: 'connected' | 'disconnected' | 'error'
}

export const useRealTimeNotifications = (): UseRealTimeNotificationsReturn => {
  const { user } = useAuth()
  const [activities, setActivities] = useState<NotificationActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected')

  // Fetch notification activities
  const refreshActivities = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('notification_activity')
        .select('*')
        .order('ride_created', { ascending: false })
        .limit(50)

      if (fetchError) {
        setError('Failed to fetch notification activities')
        console.error('Error fetching activities:', fetchError)
        return
      }

      setActivities(data || [])
    } catch (err) {
      console.error('Error in refreshActivities:', err)
      setError('An unexpected error occurred while fetching activities')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Send test notification
  const sendTestNotification = useCallback(async (
    rideId: string, 
    type: string, 
    reason?: string
  ) => {
    setSending(true)
    setError(null)

    try {
      const result = await notificationService.sendNotificationsForRide(
        rideId,
        type as 'MATCH' | 'CONFIRMATION' | 'REMINDER' | 'CANCELLATION',
        reason
      )

      if (!result.success) {
        setError(`Notification failed: ${result.errors.join(', ')}`)
      }

      // Refresh activities after sending
      await refreshActivities()

      return result
    } catch (err) {
      console.error('Error sending test notification:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Failed to send notification: ${errorMessage}`)
      return {
        success: false,
        sent_count: 0,
        failed_count: 0,
        errors: [errorMessage]
      }
    } finally {
      setSending(false)
    }
  }, [refreshActivities])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return

    let matchedRidesSubscription: any = null
    let rideParticipantsSubscription: any = null

    const setupSubscriptions = async () => {
      try {
        setSubscriptionStatus('connected')

        // Subscribe to matched rides changes
        matchedRidesSubscription = supabase
          .channel('matched_rides_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'matched_rides'
            },
            (payload) => {
              console.log('Matched rides change:', payload)
              
              // Refresh activities when rides change
              refreshActivities()
              
              // Handle specific events
              if (payload.eventType === 'INSERT') {
                console.log('New ride created:', payload.new)
              } else if (payload.eventType === 'UPDATE') {
                console.log('Ride updated:', payload.new)
                
                // Check for status changes
                if (payload.old?.status !== payload.new?.status) {
                  console.log(`Ride status changed from ${payload.old?.status} to ${payload.new?.status}`)
                }
              }
            }
          )
          .subscribe((status) => {
            console.log('Matched rides subscription status:', status)
            if (status === 'SUBSCRIBED') {
              setSubscriptionStatus('connected')
            } else if (status === 'CHANNEL_ERROR') {
              setSubscriptionStatus('error')
              setError('Real-time subscription error')
            }
          })

        // Subscribe to ride participants changes
        rideParticipantsSubscription = supabase
          .channel('ride_participants_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'ride_participants'
            },
            (payload) => {
              console.log('Ride participants change:', payload)
              
              // Refresh activities when participants change
              refreshActivities()
              
              // Handle specific events
              if (payload.eventType === 'UPDATE') {
                console.log('Participant status updated:', payload.new)
                
                // Check for status changes
                if (payload.old?.status !== payload.new?.status) {
                  console.log(`Participant status changed from ${payload.old?.status} to ${payload.new?.status}`)
                }
              }
            }
          )
          .subscribe((status) => {
            console.log('Ride participants subscription status:', status)
          })

      } catch (err) {
        console.error('Error setting up subscriptions:', err)
        setSubscriptionStatus('error')
        setError('Failed to set up real-time subscriptions')
      }
    }

    setupSubscriptions()

    // Cleanup subscriptions
    return () => {
      if (matchedRidesSubscription) {
        supabase.removeChannel(matchedRidesSubscription)
      }
      if (rideParticipantsSubscription) {
        supabase.removeChannel(rideParticipantsSubscription)
      }
      setSubscriptionStatus('disconnected')
    }
  }, [user, refreshActivities])

  // Initial data fetch
  useEffect(() => {
    refreshActivities()
  }, [refreshActivities])

  return {
    // Data
    activities,
    
    // Loading states
    loading,
    sending,
    
    // Error state
    error,
    
    // Actions
    sendTestNotification,
    refreshActivities,
    
    // Real-time subscription status
    subscriptionStatus
  }
}
