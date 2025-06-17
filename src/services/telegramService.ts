// Telegram Bot Service for ride notifications and user interactions
// This service handles sending notifications and managing user interactions via Telegram

export interface TelegramConfig {
  botToken: string
  webhookUrl?: string
}

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

export interface RideNotification {
  type: 'RIDE_MATCHED' | 'RIDE_CONFIRMED' | 'RIDE_CANCELLED' | 'PICKUP_REMINDER' | 'RIDE_STARTED'
  ride_id: string
  user_id: string
  message: string
  inline_keyboard?: Array<Array<{
    text: string
    callback_data: string
  }>>
}

export interface NotificationResult {
  success: boolean
  message_id?: number
  error?: string
}

class TelegramService {
  private config: TelegramConfig
  private baseUrl: string

  constructor() {
    this.config = {
      botToken: import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '',
      webhookUrl: import.meta.env.VITE_TELEGRAM_WEBHOOK_URL || ''
    }

    this.baseUrl = `https://api.telegram.org/bot${this.config.botToken}`
  }

  /**
   * Check if Telegram bot is properly configured
   */
  isConfigured(): boolean {
    return !!this.config.botToken
  }

  /**
   * Send a text message to a user
   */
  async sendMessage(
    chatId: number | string,
    text: string,
    options?: {
      parse_mode?: 'HTML' | 'Markdown'
      reply_markup?: any
      disable_notification?: boolean
    }
  ): Promise<NotificationResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Telegram bot not configured' }
    }

    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: options?.parse_mode || 'HTML',
          reply_markup: options?.reply_markup,
          disable_notification: options?.disable_notification || false
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Telegram API error: ${errorData.description || response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      }

      return {
        success: true,
        message_id: data.result.message_id
      }

    } catch (error) {
      console.error('Error sending Telegram message:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Send ride notification to a user
   */
  async sendRideNotification(
    telegramUserId: number,
    notification: RideNotification
  ): Promise<NotificationResult> {
    try {
      const keyboard = notification.inline_keyboard ? {
        inline_keyboard: notification.inline_keyboard
      } : undefined

      return await this.sendMessage(
        telegramUserId,
        notification.message,
        {
          parse_mode: 'HTML',
          reply_markup: keyboard
        }
      )

    } catch (error) {
      console.error('Error sending ride notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification'
      }
    }
  }

  /**
   * Send ride match notification
   */
  async sendRideMatchNotification(
    telegramUserId: number,
    rideDetails: {
      ride_id: string
      driver_name: string
      pickup_time: string
      pickup_location: string
      cost_per_person: number
      participants: string[]
    }
  ): Promise<NotificationResult> {
    const message = `
🚗 <b>Ride Match Found!</b>

<b>Driver:</b> ${rideDetails.driver_name}
<b>Pickup Time:</b> ${rideDetails.pickup_time}
<b>Pickup Location:</b> ${rideDetails.pickup_location}
<b>Cost per Person:</b> ৳${rideDetails.cost_per_person}
<b>Other Riders:</b> ${rideDetails.participants.join(', ')}

Please confirm your participation within 30 minutes.
    `.trim()

    const keyboard = [
      [
        { text: '✅ Accept Ride', callback_data: `accept_ride_${rideDetails.ride_id}` },
        { text: '❌ Decline Ride', callback_data: `decline_ride_${rideDetails.ride_id}` }
      ]
    ]

    return await this.sendRideNotification(telegramUserId, {
      type: 'RIDE_MATCHED',
      ride_id: rideDetails.ride_id,
      user_id: telegramUserId.toString(),
      message,
      inline_keyboard: keyboard
    })
  }

  /**
   * Send ride confirmation notification
   */
  async sendRideConfirmationNotification(
    telegramUserId: number,
    rideDetails: {
      ride_id: string
      driver_name: string
      driver_phone?: string
      pickup_time: string
      pickup_location: string
      participants: string[]
    }
  ): Promise<NotificationResult> {
    const message = `
✅ <b>Ride Confirmed!</b>

<b>Driver:</b> ${rideDetails.driver_name}
${rideDetails.driver_phone ? `<b>Driver Phone:</b> ${rideDetails.driver_phone}` : ''}
<b>Pickup Time:</b> ${rideDetails.pickup_time}
<b>Pickup Location:</b> ${rideDetails.pickup_location}
<b>Fellow Riders:</b> ${rideDetails.participants.join(', ')}

Please be ready at the pickup location 5 minutes before the scheduled time.
    `.trim()

    return await this.sendRideNotification(telegramUserId, {
      type: 'RIDE_CONFIRMED',
      ride_id: rideDetails.ride_id,
      user_id: telegramUserId.toString(),
      message
    })
  }

  /**
   * Send pickup reminder notification
   */
  async sendPickupReminderNotification(
    telegramUserId: number,
    rideDetails: {
      ride_id: string
      pickup_time: string
      pickup_location: string
      driver_name: string
    }
  ): Promise<NotificationResult> {
    const message = `
⏰ <b>Pickup Reminder</b>

Your ride with ${rideDetails.driver_name} is in 15 minutes!

<b>Pickup Time:</b> ${rideDetails.pickup_time}
<b>Pickup Location:</b> ${rideDetails.pickup_location}

Please be ready at the pickup location.
    `.trim()

    return await this.sendRideNotification(telegramUserId, {
      type: 'PICKUP_REMINDER',
      ride_id: rideDetails.ride_id,
      user_id: telegramUserId.toString(),
      message
    })
  }

  /**
   * Send ride cancellation notification
   */
  async sendRideCancellationNotification(
    telegramUserId: number,
    rideDetails: {
      ride_id: string
      reason: string
      pickup_time: string
    }
  ): Promise<NotificationResult> {
    const message = `
❌ <b>Ride Cancelled</b>

Your ride scheduled for ${rideDetails.pickup_time} has been cancelled.

<b>Reason:</b> ${rideDetails.reason}

You can create a new opt-in for alternative transportation.
    `.trim()

    return await this.sendRideNotification(telegramUserId, {
      type: 'RIDE_CANCELLED',
      ride_id: rideDetails.ride_id,
      user_id: telegramUserId.toString(),
      message
    })
  }

  /**
   * Get bot information
   */
  async getBotInfo(): Promise<{ bot?: TelegramUser; error?: string }> {
    if (!this.isConfigured()) {
      return { error: 'Telegram bot not configured' }
    }

    try {
      const response = await fetch(`${this.baseUrl}/getMe`)
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      }

      return { bot: data.result }

    } catch (error) {
      console.error('Error getting bot info:', error)
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Set webhook for receiving updates (for production)
   */
  async setWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Telegram bot not configured' }
    }

    try {
      const response = await fetch(`${this.baseUrl}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query']
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      }

      return { success: true }

    } catch (error) {
      console.error('Error setting webhook:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Delete webhook (for development)
   */
  async deleteWebhook(): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Telegram bot not configured' }
    }

    try {
      const response = await fetch(`${this.baseUrl}/deleteWebhook`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      }

      return { success: true }

    } catch (error) {
      console.error('Error deleting webhook:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const telegramService = new TelegramService()
