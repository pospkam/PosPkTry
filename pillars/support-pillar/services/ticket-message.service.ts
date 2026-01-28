/**
 * Ticket Message Service
 * Manages support ticket messages and attachments
 */

import { DatabaseService } from '@/pillars/core-infrastructure-infrastructure/services/database.service'
import { CacheService } from '@/pillars/core-infrastructure-infrastructure/services/cache.service'
import { EventBusService } from '@/pillars/core-infrastructure-infrastructure/services/event-bus.service'
import { MonitoringService } from '@/pillars/core-infrastructure-infrastructure/services/monitoring.service'
import {
  TicketMessage,
  SupportError,
} from '../types'

export class TicketMessageService {
  private database: DatabaseService
  private cache: CacheService
  private eventBus: EventBusService
  private monitoring: MonitoringService

  constructor(
    database: DatabaseService,
    cache: CacheService,
    eventBus: EventBusService,
    monitoring: MonitoringService
  ) {
    this.database = database
    this.cache = cache
    this.eventBus = eventBus
    this.monitoring = monitoring
  }

  /**
   * Create ticket message
   */
  async createMessage(data: Partial<TicketMessage>): Promise<TicketMessage> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `INSERT INTO ticket_messages (
          ticket_id, sender_id, sender_name, sender_type, message,
          attachments, is_internal, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          data.ticketId,
          data.senderId,
          data.senderName,
          data.senderType || 'CUSTOMER',
          data.message,
          data.attachments ? JSON.stringify(data.attachments) : null,
          data.isInternal || false,
          new Date(),
          new Date(),
        ]
      )

      const message = this.formatMessage(result.rows[0])

      // Invalidate ticket cache
      await this.cache.delete(`ticket:${data.ticketId}`)

      this.eventBus.publish('ticket.message.created', {
        messageId: message.id,
        ticketId: data.ticketId,
        senderType: data.senderType,
        timestamp: new Date(),
      })

      return message
    } catch (error) {
      this.monitoring.error('Failed to create ticket message', { data, error })
      throw error
    } finally {
      this.monitoring.trackDuration('ticket_message.create', Date.now() - startTime)
    }
  }

  /**
   * Get ticket messages
   */
  async getTicketMessages(ticketId: string, limit: number = 50, offset: number = 0): Promise<any> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `SELECT * FROM ticket_messages 
         WHERE ticket_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [ticketId, limit, offset]
      )

      const countResult = await this.database.query(
        `SELECT COUNT(*) as count FROM ticket_messages WHERE ticket_id = $1`,
        [ticketId]
      )

      return {
        success: true,
        data: result.rows.map((row) => this.formatMessage(row)),
        total: parseInt(countResult.rows[0].count),
        limit,
        offset,
      }
    } catch (error) {
      this.monitoring.error('Failed to get ticket messages', { ticketId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('ticket_message.get_all', Date.now() - startTime)
    }
  }

  /**
   * Get single message
   */
  async getMessage(messageId: string): Promise<TicketMessage> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `SELECT * FROM ticket_messages WHERE id = $1`,
        [messageId]
      )

      if (result.rows.length === 0) {
        throw new SupportError(`Message not found: ${messageId}`, 'MESSAGE_NOT_FOUND')
      }

      return this.formatMessage(result.rows[0])
    } catch (error) {
      this.monitoring.error('Failed to get message', { messageId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('ticket_message.get', Date.now() - startTime)
    }
  }

  /**
   * Rate message
   */
  async rateMessage(
    messageId: string,
    rating: number,
    ratingComment?: string
  ): Promise<TicketMessage> {
    const startTime = Date.now()

    try {
      if (rating < 1 || rating > 5) {
        throw new SupportError('Rating must be between 1 and 5', 'INVALID_RATING')
      }

      const result = await this.database.query(
        `UPDATE ticket_messages 
         SET rating = $1, rating_comment = $2, updated_at = $3
         WHERE id = $4 RETURNING *`,
        [rating, ratingComment, new Date(), messageId]
      )

      if (result.rows.length === 0) {
        throw new SupportError(`Message not found: ${messageId}`, 'MESSAGE_NOT_FOUND')
      }

      const message = this.formatMessage(result.rows[0])

      this.eventBus.publish('ticket.message.rated', {
        messageId,
        ticketId: message.ticketId,
        rating,
        timestamp: new Date(),
      })

      return message
    } catch (error) {
      this.monitoring.error('Failed to rate message', { messageId, rating, error })
      throw error
    } finally {
      this.monitoring.trackDuration('ticket_message.rate', Date.now() - startTime)
    }
  }

  /**
   * Add attachment to message
   */
  async addAttachment(
    messageId: string,
    attachmentUrl: string,
    attachmentName: string
  ): Promise<TicketMessage> {
    const startTime = Date.now()

    try {
      // Get current message
      const message = await this.getMessage(messageId)

      const attachments = message.attachments || []
      attachments.push({
        fileName: attachmentName,
        fileUrl: attachmentUrl,
        fileType: 'application/octet-stream',
      } as any)

      const result = await this.database.query(
        `UPDATE ticket_messages 
         SET attachments = $1, updated_at = $2
         WHERE id = $3 RETURNING *`,
        [JSON.stringify(attachments), new Date(), messageId]
      )

      return this.formatMessage(result.rows[0])
    } catch (error) {
      this.monitoring.error('Failed to add attachment', { messageId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('ticket_message.add_attachment', Date.now() - startTime)
    }
  }

  /**
   * Get message statistics
   */
  async getMessageStatistics(ticketId: string): Promise<any> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `SELECT 
           COUNT(*) as total_messages,
           SUM(CASE WHEN sender_type = 'CUSTOMER' THEN 1 ELSE 0 END) as customer_messages,
           SUM(CASE WHEN sender_type = 'AGENT' THEN 1 ELSE 0 END) as agent_messages,
           SUM(CASE WHEN sender_type = 'SYSTEM' THEN 1 ELSE 0 END) as system_messages,
           ROUND(AVG(rating), 2) as avg_rating,
           SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive_ratings
         FROM ticket_messages WHERE ticket_id = $1`,
        [ticketId]
      )

      const row = result.rows[0]

      return {
        ticketId,
        totalMessages: parseInt(row.total_messages),
        customerMessages: parseInt(row.customer_messages) || 0,
        agentMessages: parseInt(row.agent_messages) || 0,
        systemMessages: parseInt(row.system_messages) || 0,
        averageRating: parseFloat(row.avg_rating) || 0,
        positiveRatings: parseInt(row.positive_ratings) || 0,
      }
    } catch (error) {
      this.monitoring.error('Failed to get message statistics', { ticketId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('ticket_message.statistics', Date.now() - startTime)
    }
  }

  /**
   * Helper methods
   */

  private formatMessage(row: any): TicketMessage {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderType: row.sender_type,
      message: row.message,
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
      isInternal: row.is_internal,
      rating: row.rating,
      ratingComment: row.rating_comment,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }
}

// Export singleton
const database = DatabaseService.getInstance()
const cache = CacheService.getInstance()
const eventBus = EventBusService.getInstance()
const monitoring = MonitoringService.getInstance()

export const ticketMessageService = new TicketMessageService(
  database,
  cache,
  eventBus,
  monitoring
)
