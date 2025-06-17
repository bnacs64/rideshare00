// Notification Service for managing ride notifications via Telegram
import { supabase } from './supabase'
import { telegramService } from './telegramService'

export interface NotificationConfig {
  enableTelegram: boolean
  enableEmail: boolean
  enablePush: boolean
}

export interface RideNotificationData {
  ride_id: string
  driver_id: string
  participants: Array<{
    user_id: string
    full_name: string
    telegram_user_id?: number
    email?: string
  }>
  ride_details: {
    commute_date: string
    pickup_time: string
    pickup_location: string
    cost_per_person: number
    estimated_duration: number
  }
}

export interface NotificationResult {
  success: boolean
  sent_count: number
  failed_count: number
  errors: string[]
}

class NotificationService {
  private config: NotificationConfig

  constructor() {
    this.config = {
      enableTelegram: true,
      enableEmail: false, // Will be implemented later
      enablePush: false   // Will be implemented later
    }
  }

  /**
   * Send ride match notifications to all participants
   */
  async sendRideMatchNotifications(rideData: RideNotificationData): Promise<NotificationResult> {
    const results: NotificationResult = {
      success: true,
      sent_count: 0,
      failed_count: 0,
      errors: []
    }

    // Get driver information
    const driver = rideData.participants.find(p => p.user_id === rideData.driver_id)
    if (!driver) {
      results.errors.push('Driver not found in participants')
      results.success = false
      return results
    }

    // Send notifications to all participants (including driver)
    for (const participant of rideData.participants) {
      try {
        if (this.config.enableTelegram && participant.telegram_user_id) {
          const otherParticipants = rideData.participants
            .filter(p => p.user_id !== participant.user_id)
            .map(p => p.full_name)

          const telegramResult = await telegramService.sendRideMatchNotification(
            participant.telegram_user_id,
            {
              ride_id: rideData.ride_id,
              driver_name: driver.full_name,
              pickup_time: rideData.ride_details.pickup_time,
              pickup_location: rideData.ride_details.pickup_location,
              cost_per_person: rideData.ride_details.cost_per_person,
              participants: otherParticipants
            }
          )

          if (telegramResult.success) {
            results.sent_count++
          } else {
            results.failed_count++
            results.errors.push(`Telegram failed for ${participant.full_name}: ${telegramResult.error}`)
          }
        } else {
          results.failed_count++
          results.errors.push(`No Telegram ID for ${participant.full_name}`)
        }
      } catch (error) {
        results.failed_count++
        results.errors.push(`Error notifying ${participant.full_name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (results.failed_count > 0) {
      results.success = false
    }

    return results
  }

  /**
   * Send ride confirmation notifications
   */
  async sendRideConfirmationNotifications(rideData: RideNotificationData): Promise<NotificationResult> {
    const results: NotificationResult = {
      success: true,
      sent_count: 0,
      failed_count: 0,
      errors: []
    }

    // Get driver information
    const driver = rideData.participants.find(p => p.user_id === rideData.driver_id)
    if (!driver) {
      results.errors.push('Driver not found in participants')
      results.success = false
      return results
    }

    // Send confirmations to all participants
    for (const participant of rideData.participants) {
      try {
        if (this.config.enableTelegram && participant.telegram_user_id) {
          const otherParticipants = rideData.participants
            .filter(p => p.user_id !== participant.user_id)
            .map(p => p.full_name)

          const telegramResult = await telegramService.sendRideConfirmationNotification(
            participant.telegram_user_id,
            {
              ride_id: rideData.ride_id,
              driver_name: driver.full_name,
              pickup_time: rideData.ride_details.pickup_time,
              pickup_location: rideData.ride_details.pickup_location,
              participants: otherParticipants
            }
          )

          if (telegramResult.success) {
            results.sent_count++
          } else {
            results.failed_count++
            results.errors.push(`Telegram failed for ${participant.full_name}: ${telegramResult.error}`)
          }
        }
      } catch (error) {
        results.failed_count++
        results.errors.push(`Error notifying ${participant.full_name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (results.failed_count > 0) {
      results.success = false
    }

    return results
  }

  /**
   * Send pickup reminder notifications
   */
  async sendPickupReminders(rideData: RideNotificationData): Promise<NotificationResult> {
    const results: NotificationResult = {
      success: true,
      sent_count: 0,
      failed_count: 0,
      errors: []
    }

    // Get driver information
    const driver = rideData.participants.find(p => p.user_id === rideData.driver_id)
    if (!driver) {
      results.errors.push('Driver not found in participants')
      results.success = false
      return results
    }

    // Send reminders to all participants
    for (const participant of rideData.participants) {
      try {
        if (this.config.enableTelegram && participant.telegram_user_id) {
          const telegramResult = await telegramService.sendPickupReminderNotification(
            participant.telegram_user_id,
            {
              ride_id: rideData.ride_id,
              pickup_time: rideData.ride_details.pickup_time,
              pickup_location: rideData.ride_details.pickup_location,
              driver_name: driver.full_name
            }
          )

          if (telegramResult.success) {
            results.sent_count++
          } else {
            results.failed_count++
            results.errors.push(`Telegram failed for ${participant.full_name}: ${telegramResult.error}`)
          }
        }
      } catch (error) {
        results.failed_count++
        results.errors.push(`Error notifying ${participant.full_name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (results.failed_count > 0) {
      results.success = false
    }

    return results
  }

  /**
   * Send ride cancellation notifications
   */
  async sendRideCancellationNotifications(
    rideData: RideNotificationData,
    reason: string
  ): Promise<NotificationResult> {
    const results: NotificationResult = {
      success: true,
      sent_count: 0,
      failed_count: 0,
      errors: []
    }

    // Send cancellation notifications to all participants
    for (const participant of rideData.participants) {
      try {
        if (this.config.enableTelegram && participant.telegram_user_id) {
          const telegramResult = await telegramService.sendRideCancellationNotification(
            participant.telegram_user_id,
            {
              ride_id: rideData.ride_id,
              reason,
              pickup_time: rideData.ride_details.pickup_time
            }
          )

          if (telegramResult.success) {
            results.sent_count++
          } else {
            results.failed_count++
            results.errors.push(`Telegram failed for ${participant.full_name}: ${telegramResult.error}`)
          }
        }
      } catch (error) {
        results.failed_count++
        results.errors.push(`Error notifying ${participant.full_name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (results.failed_count > 0) {
      results.success = false
    }

    return results
  }

  /**
   * Get ride data for notifications from database
   */
  async getRideNotificationData(rideId: string): Promise<{ data: RideNotificationData | null; error?: string }> {
    try {
      // Get ride details
      const { data: ride, error: rideError } = await supabase
        .from('matched_rides')
        .select(`
          id,
          commute_date,
          driver_user_id,
          estimated_cost_per_person,
          estimated_total_time,
          route_optimization_data
        `)
        .eq('id', rideId)
        .single()

      if (rideError || !ride) {
        return { data: null, error: 'Ride not found' }
      }

      // Get participants
      const { data: participants, error: participantsError } = await supabase
        .from('ride_participants')
        .select(`
          user_id,
          users (
            full_name,
            email,
            telegram_user_id
          )
        `)
        .eq('matched_ride_id', rideId)

      if (participantsError) {
        return { data: null, error: 'Failed to fetch participants' }
      }

      // Add driver to participants if not already included
      const driverInParticipants = participants?.some(p => p.user_id === ride.driver_user_id)
      if (!driverInParticipants) {
        const { data: driver, error: driverError } = await supabase
          .from('users')
          .select('id, full_name, email, telegram_user_id')
          .eq('id', ride.driver_user_id)
          .single()

        if (!driverError && driver) {
          participants?.push({
            user_id: driver.id,
            users: {
              full_name: driver.full_name,
              email: driver.email,
              telegram_user_id: driver.telegram_user_id
            }
          })
        }
      }

      // Format participants data
      const formattedParticipants = participants?.map(p => ({
        user_id: p.user_id,
        full_name: p.users.full_name,
        email: p.users.email,
        telegram_user_id: p.users.telegram_user_id
      })) || []

      // Extract pickup details from route optimization data
      const routeData = ride.route_optimization_data || {}
      const pickupLocation = 'Pickup Location' // Default, should be extracted from route data
      const pickupTime = '08:00 AM' // Default, should be calculated from commute date and time

      const rideNotificationData: RideNotificationData = {
        ride_id: ride.id,
        driver_id: ride.driver_user_id,
        participants: formattedParticipants,
        ride_details: {
          commute_date: ride.commute_date,
          pickup_time: pickupTime,
          pickup_location: pickupLocation,
          cost_per_person: ride.estimated_cost_per_person,
          estimated_duration: ride.estimated_total_time || 30
        }
      }

      return { data: rideNotificationData }

    } catch (error) {
      console.error('Error getting ride notification data:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Send notifications for a ride by ID using Edge Function
   */
  async sendNotificationsForRide(
    rideId: string,
    type: 'MATCH' | 'CONFIRMATION' | 'REMINDER' | 'CANCELLATION',
    cancellationReason?: string
  ): Promise<NotificationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('send-notifications', {
        body: {
          ride_id: rideId,
          type,
          cancellation_reason: cancellationReason
        }
      })

      if (error) {
        console.error('Error calling send-notifications function:', error)
        return {
          success: false,
          sent_count: 0,
          failed_count: 0,
          errors: [error.message || 'Failed to send notifications']
        }
      }

      return {
        success: data.success || false,
        sent_count: data.sent_count || 0,
        failed_count: data.failed_count || 0,
        errors: data.errors || []
      }

    } catch (error) {
      console.error('Error in sendNotificationsForRide:', error)
      return {
        success: false,
        sent_count: 0,
        failed_count: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      }
    }
  }

  /**
   * Send notifications for a ride by ID using local service (fallback)
   */
  async sendNotificationsForRideLocal(
    rideId: string,
    type: 'MATCH' | 'CONFIRMATION' | 'REMINDER' | 'CANCELLATION',
    cancellationReason?: string
  ): Promise<NotificationResult> {
    const { data: rideData, error } = await this.getRideNotificationData(rideId)

    if (error || !rideData) {
      return {
        success: false,
        sent_count: 0,
        failed_count: 0,
        errors: [error || 'Failed to get ride data']
      }
    }

    switch (type) {
      case 'MATCH':
        return await this.sendRideMatchNotifications(rideData)
      case 'CONFIRMATION':
        return await this.sendRideConfirmationNotifications(rideData)
      case 'REMINDER':
        return await this.sendPickupReminders(rideData)
      case 'CANCELLATION':
        return await this.sendRideCancellationNotifications(rideData, cancellationReason || 'Ride cancelled')
      default:
        return {
          success: false,
          sent_count: 0,
          failed_count: 0,
          errors: ['Invalid notification type']
        }
    }
  }
}

export const notificationService = new NotificationService()
