/**
 * Ticket Service
 * Manages support tickets, assignment, and lifecycle
 */

import { DatabaseService } from '@/pillars/core-infrastructure-infrastructure/services/database.service'
import { CacheService } from '@/pillars/core-infrastructure-infrastructure/services/cache.service'
import { EventBusService } from '@/pillars/core-infrastructure-infrastructure/services/event-bus.service'
import { MonitoringService } from '@/pillars/core-infrastructure-infrastructure/services/monitoring.service'
import {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketNotFoundError,
  InvalidTicketStatusError,
  SupportError,
  CreateTicketDTO,
  UpdateTicketDTO,
  TicketFilter,
  TicketListResponse,
} from '../types'

export class TicketService {
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
   * Create support ticket
   */
  async createTicket(data: CreateTicketDTO): Promise<Ticket> {
    const startTime = Date.now()

    try {
      const ticketNumber = this.generateTicketNumber()

      const result = await this.database.query(
        `INSERT INTO tickets (
          ticket_number, customer_id, customer_name, customer_email, category, subject, 
          description, status, priority, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          ticketNumber,
          data.customerId,
          data.customerName,
          data.customerEmail,
          data.category,
          data.subject,
          data.description,
          TicketStatus.OPEN,
          data.priority || TicketPriority.MEDIUM,
          new Date(),
          new Date(),
        ]
      )

      const ticket = this.formatTicket(result.rows[0])

      // Cache ticket
      await this.cache.set(`ticket:${ticket.id}`, ticket, 3600)

      // Try to assign to available agent
      await this.assignTicketToAgent(ticket.id, data.category)

      // Publish event
      this.eventBus.publish('ticket.created', {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        customerId: data.customerId,
        category: data.category,
        timestamp: new Date(),
      })

      this.monitoring.trackEvent('ticket_created', {
        ticketId: ticket.id,
        category: data.category,
        priority: data.priority,
      })

      return ticket
    } catch (error) {
      this.monitoring.error('Failed to create ticket', { data, error })
      throw error
    } finally {
      this.monitoring.trackDuration('ticket.create', Date.now() - startTime)
    }
  }

  /**
   * Get ticket by ID
   */
  async getTicket(ticketId: string): Promise<Ticket> {
    const startTime = Date.now()

    try {
      const cached = await this.cache.get(`ticket:${ticketId}`)
      if (cached) {
        return cached as Ticket
      }

      const result = await this.database.query(`SELECT * FROM tickets WHERE id = $1`, [ticketId])

      if (result.rows.length === 0) {
        throw new TicketNotFoundError(ticketId)
      }

      const ticket = this.formatTicket(result.rows[0])

      await this.cache.set(`ticket:${ticketId}`, ticket, 3600)

      return ticket
    } catch (error) {
      this.monitoring.error('Failed to get ticket', { ticketId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('ticket.get', Date.now() - startTime)
    }
  }

  /**
   * Update ticket
   */
  async updateTicket(ticketId: string, data: UpdateTicketDTO): Promise<Ticket> {
    const startTime = Date.now()

    try {
      const ticket = await this.getTicket(ticketId)

      // Validate status transition
      if (data.status && data.status !== ticket.status) {
        this.validateStatusTransition(ticket.status, data.status)
      }

      const updates: string[] = []
      const values: any[] = []
      let paramIndex = 1

      if (data.status) {
        updates.push(`status = $${paramIndex++}`)
        values.push(data.status)

        if (data.status === TicketStatus.RESOLVED) {
          updates.push(`resolved_at = $${paramIndex++}`)
          values.push(new Date())
        }
        if (data.status === TicketStatus.CLOSED) {
          updates.push(`closed_at = $${paramIndex++}`)
          values.push(new Date())
        }
      }

      if (data.priority) {
        updates.push(`priority = $${paramIndex++}`)
        values.push(data.priority)
      }

      if (data.assignedTo) {
        updates.push(`assigned_to = $${paramIndex++}`)
        values.push(data.assignedTo)
      }

      if (data.category) {
        updates.push(`category = $${paramIndex++}`)
        values.push(data.category)
      }

      if (data.resolution) {
        updates.push(`resolution = $${paramIndex++}`)
        values.push(data.resolution)
      }

      updates.push(`updated_at = $${paramIndex++}`)
      values.push(new Date())
      values.push(ticketId)

      const result = await this.database.query(
        `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      )

      const updated = this.formatTicket(result.rows[0])

      await this.cache.delete(`ticket:${ticketId}`)

      this.eventBus.publish('ticket.updated', {
        ticketId,
        previousStatus: ticket.status,
        newStatus: data.status,
        timestamp: new Date(),
      })

      return updated
    } catch (error) {
      this.monitoring.error('Failed to update ticket', { ticketId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('ticket.update', Date.now() - startTime)
    }
  }

  /**
   * List tickets with filtering
   */
  async listTickets(filter: TicketFilter): Promise<TicketListResponse> {
    const startTime = Date.now()

    try {
      const page = filter.page || 1
      const limit = filter.limit || 20
      const offset = (page - 1) * limit

      let query = `SELECT * FROM tickets WHERE 1=1`
      const values: any[] = []
      let paramIndex = 1

      if (filter.status) {
        query += ` AND status = $${paramIndex++}`
        values.push(filter.status)
      }

      if (filter.priority) {
        query += ` AND priority = $${paramIndex++}`
        values.push(filter.priority)
      }

      if (filter.category) {
        query += ` AND category = $${paramIndex++}`
        values.push(filter.category)
      }

      if (filter.customerId) {
        query += ` AND customer_id = $${paramIndex++}`
        values.push(filter.customerId)
      }

      if (filter.agentId) {
        query += ` AND agent_id = $${paramIndex++}`
        values.push(filter.agentId)
      }

      if (filter.assignedTo) {
        query += ` AND assigned_to = $${paramIndex++}`
        values.push(filter.assignedTo)
      }

      if (filter.search) {
        query += ` AND (subject ILIKE $${paramIndex++} OR description ILIKE $${paramIndex++})`
        const searchTerm = `%${filter.search}%`
        values.push(searchTerm, searchTerm)
      }

      // Count total
      const countResult = await this.database.query(
        `SELECT COUNT(*) as count FROM (${query}) as counted`,
        values
      )
      const total = parseInt(countResult.rows[0].count)

      // Add sorting and pagination
      const sortBy = filter.sortBy || 'createdAt'
      const sortOrder = filter.sortOrder || 'DESC'
      query += ` ORDER BY ${this.getSortColumn(sortBy)} ${sortOrder} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
      values.push(limit, offset)

      const result = await this.database.query(query, values)

      return {
        success: true,
        data: result.rows.map((row: any) => this.formatTicket(row)),
        total,
        page,
        limit,
      }
    } catch (error) {
      this.monitoring.error('Failed to list tickets', { filter, error })
      throw error
    } finally {
      this.monitoring.trackDuration('ticket.list', Date.now() - startTime)
    }
  }

  /**
   * Close ticket
   */
  async closeTicket(ticketId: string): Promise<Ticket> {
    const startTime = Date.now()

    try {
      const ticket = await this.getTicket(ticketId)

      if (![TicketStatus.RESOLVED, TicketStatus.ON_HOLD].includes(ticket.status)) {
        throw new InvalidTicketStatusError(ticket.status, TicketStatus.CLOSED)
      }

      return this.updateTicket(ticketId, {
        status: TicketStatus.CLOSED,
      })
    } catch (error) {
      this.monitoring.error('Failed to close ticket', { ticketId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('ticket.close', Date.now() - startTime)
    }
  }

  /**
   * Reopen ticket
   */
  async reopenTicket(ticketId: string): Promise<Ticket> {
    const startTime = Date.now()

    try {
      const ticket = await this.getTicket(ticketId)

      if (![TicketStatus.CLOSED, TicketStatus.RESOLVED].includes(ticket.status)) {
        throw new InvalidTicketStatusError(ticket.status, TicketStatus.REOPENED)
      }

      return this.updateTicket(ticketId, {
        status: TicketStatus.REOPENED,
      })
    } catch (error) {
      this.monitoring.error('Failed to reopen ticket', { ticketId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('ticket.reopen', Date.now() - startTime)
    }
  }

  /**
   * Helper methods
   */

  private async assignTicketToAgent(ticketId: string, category: TicketCategory): Promise<void> {
    try {
      // Get available agent for this category
      const agentResult = await this.database.query(
        `SELECT id FROM support_agents 
         WHERE status != 'OFFLINE' 
         AND active_tickets < max_concurrent_tickets
         AND (specialization IS NULL OR specialization @> $1)
         ORDER BY active_tickets ASC
         LIMIT 1`,
        [JSON.stringify([category])]
      )

      if (agentResult.rows.length > 0) {
        const agentId = agentResult.rows[0].id

        await this.database.query(`UPDATE tickets SET agent_id = $1 WHERE id = $2`, [
          agentId,
          ticketId,
        ])

        await this.database.query(
          `UPDATE support_agents SET active_tickets = active_tickets + 1 WHERE id = $1`,
          [agentId]
        )
      }
    } catch (error) {
      this.monitoring.warn('Failed to auto-assign ticket to agent', { ticketId, error })
    }
  }

  private validateStatusTransition(from: TicketStatus, to: TicketStatus): void {
    const validTransitions: Record<TicketStatus, TicketStatus[]> = {
      [TicketStatus.OPEN]: [
        TicketStatus.IN_PROGRESS,
        TicketStatus.ON_HOLD,
        TicketStatus.CLOSED,
      ],
      [TicketStatus.IN_PROGRESS]: [
        TicketStatus.RESOLVED,
        TicketStatus.WAITING_CUSTOMER,
        TicketStatus.ON_HOLD,
      ],
      [TicketStatus.WAITING_CUSTOMER]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
      [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.REOPENED],
      [TicketStatus.CLOSED]: [TicketStatus.REOPENED],
      [TicketStatus.REOPENED]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
      [TicketStatus.ON_HOLD]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
    }

    if (!validTransitions[from] || !validTransitions[from].includes(to)) {
      throw new InvalidTicketStatusError(from, to)
    }
  }

  private generateTicketNumber(): string {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')
    return `TKT-${timestamp}${random}`
  }

  private getSortColumn(sortBy: string): string {
    const mapping: Record<string, string> = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      priority: 'priority',
    }
    return mapping[sortBy] || 'created_at'
  }

  private formatTicket(row: any): Ticket {
    return {
      id: row.id,
      ticketNumber: row.ticket_number,
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      agentId: row.agent_id,
      agentName: row.agent_name,
      category: row.category,
      subject: row.subject,
      description: row.description,
      status: row.status,
      priority: row.priority,
      tags: row.tags,
      assignedTo: row.assigned_to,
      assignedToTeam: row.assigned_to_team,
      relatedBookingId: row.related_booking_id,
      relatedOrderId: row.related_order_id,
      resolution: row.resolution,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
    }
  }
}

// Export singleton
const database = DatabaseService.getInstance()
const cache = CacheService.getInstance()
const eventBus = EventBusService.getInstance()
const monitoring = MonitoringService.getInstance()

export const ticketService = new TicketService(database, cache, eventBus, monitoring)
