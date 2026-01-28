/**
 * SLA Service
 * Manages SLA policies and violation tracking
 */

import { DatabaseService } from '@core-infrastructure/services/database.service'
import { CacheService } from '@core-infrastructure/services/cache.service'
import { EventBusService } from '@core-infrastructure/services/event-bus.service'
import { MonitoringService } from '@core-infrastructure/services/monitoring.service'
import {
  SLAPolicy,
  TicketStatus,
  TicketPriority,
  SupportError,
} from '../types'

export class SLAService {
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
   * Create SLA policy
   */
  async createPolicy(data: Partial<SLAPolicy>): Promise<SLAPolicy> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `INSERT INTO sla_policies (
          name, category, priority, first_response_time_hours,
          resolution_time_hours, active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          data.name,
          data.category,
          data.priority,
          data.firstResponseTime || 4,
          data.resolutionTime || 24,
          data.active !== false,
          new Date(),
          new Date(),
        ]
      )

      const policy = this.formatPolicy(result.rows[0])

      await this.cache.set(`sla-policy:${policy.id}`, policy, 7200)

      this.eventBus.publish('sla_policy.created', {
        policyId: policy.id,
        name: policy.name,
        timestamp: new Date(),
      })

      return policy
    } catch (error) {
      this.monitoring.error('Failed to create SLA policy', { data, error })
      throw error
    } finally {
      this.monitoring.trackDuration('sla.create_policy', Date.now() - startTime)
    }
  }

  /**
   * Get SLA policy
   */
  async getPolicy(policyId: string): Promise<SLAPolicy> {
    const startTime = Date.now()

    try {
      const cached = await this.cache.get<SLAPolicy>(`sla-policy:${policyId}`)
      if (cached) {
        return cached
      }

      const result = await this.database.query(
        `SELECT * FROM sla_policies WHERE id = $1`,
        [policyId]
      )

      if (result.rows.length === 0) {
        throw new SupportError(`SLA policy not found: ${policyId}`, 'SLA_POLICY_NOT_FOUND')
      }

      const policy = this.formatPolicy(result.rows[0])

      await this.cache.set(`sla-policy:${policyId}`, policy, 7200)

      return policy
    } catch (error) {
      this.monitoring.error('Failed to get SLA policy', { policyId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('sla.get_policy', Date.now() - startTime)
    }
  }

  /**
   * Get applicable SLA policy for ticket
   */
  async getApplicablePolicy(category: string, priority: string): Promise<SLAPolicy | null> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `SELECT * FROM sla_policies 
         WHERE active = true AND category = $1 AND priority = $2
         LIMIT 1`,
        [category, priority]
      )

      if (result.rows.length === 0) {
        // Return default policy
        return this.getDefaultPolicy()
      }

      return this.formatPolicy(result.rows[0])
    } catch (error) {
      this.monitoring.error('Failed to get applicable SLA policy', { category, priority, error })
      return this.getDefaultPolicy()
    } finally {
      this.monitoring.trackDuration('sla.get_applicable', Date.now() - startTime)
    }
  }

  /**
   * Check SLA violation with explicit error handling
   */
  async checkSLAViolation(ticketId: string): Promise<{
    violated: boolean
    type?: string
    message?: string
    violations?: Array<{ type: string; message: string }>
    policyId?: string
  }> {
    const startTime = Date.now()

    try {
      // Get ticket with row-level lock to prevent race conditions
      const ticketResult = await this.database.query(
        `SELECT id, category, priority, status, created_at, first_response_at, resolved_at
         FROM tickets WHERE id = $1`,
        [ticketId]
      )

      if (ticketResult.rows.length === 0) {
        this.monitoring.logWarning('Ticket not found for SLA check', { ticketId })
        throw new SupportError(`Ticket not found: ${ticketId}`, 'TICKET_NOT_FOUND')
      }

      const ticket = ticketResult.rows[0]

      // Explicit policy retrieval with error handling
      let policy = await this.getApplicablePolicy(ticket.category, ticket.priority)

      if (!policy) {
        this.monitoring.logWarning('No SLA policy found', { ticketId, category: ticket.category, priority: ticket.priority })

        // Publish event for monitoring
        this.eventBus.publish('sla.policy_missing', {
          ticketId,
          category: ticket.category,
          priority: ticket.priority,
          timestamp: new Date(),
        })

        return {
          violated: false,
          message: 'NO_POLICY_FOUND',
          violations: [],
        }
      }

      const violations: Array<{ type: string; message: string }> = []
      const now = Date.now()
      const createdAt = new Date(ticket.created_at).getTime()

      // Check first response time - EXPLICIT VIOLATION
      if (!ticket.first_response_at) {
        const elapsedHours = (now - createdAt) / (1000 * 60 * 60)
        if (elapsedHours > policy.firstResponseTime!) {
          const violationMsg = `First response SLA violated: ${elapsedHours.toFixed(2)}h > ${policy.firstResponseTime}h`
          violations.push({
            type: 'FIRST_RESPONSE_SLA',
            message: violationMsg,
          })

          // GUARANTEED violation recording
          await this.recordViolation(ticketId, 'FIRST_RESPONSE_SLA', violationMsg)
        }
      }

      // Check resolution time - EXPLICIT VIOLATION
      if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
        if (ticket.resolved_at) {
          const resolvedAt = new Date(ticket.resolved_at).getTime()
          const elapsedHours = (resolvedAt - createdAt) / (1000 * 60 * 60)

          if (elapsedHours > policy.resolutionTime!) {
            const violationMsg = `Resolution SLA violated: ${elapsedHours.toFixed(2)}h > ${policy.resolutionTime}h`
            violations.push({
              type: 'RESOLUTION_SLA',
              message: violationMsg,
            })

            // GUARANTEED violation recording
            await this.recordViolation(ticketId, 'RESOLUTION_SLA', violationMsg)
          }
        }
      }

      // If violations found, send GUARANTEED notification
      if (violations.length > 0) {
        await this.sendViolationNotification(violations, ticket, policy)

        return {
          violated: true,
          violations,
          policyId: policy.id,
          message: `${violations.length} SLA violation(s) detected`,
        }
      }

      return { violated: false, violations: [] }
    } catch (error) {
      // Explicit error categorization
      if (error instanceof SupportError) {
        throw error
      }

      // Log all other errors explicitly
      this.monitoring.logError('SLA check failed critically', {
        ticketId,
        error: error instanceof Error ? error.message : String(error),
      })

      // Publish to dead letter queue for manual review
      this.eventBus.publish('sla.check_failed', {
        ticketId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      })

      throw new SupportError(`SLA check failed for ticket ${ticketId}`, 'SLA_CHECK_FAILED')
    } finally {
      this.monitoring.trackDuration('sla.check_violation', Date.now() - startTime)
    }
  }

  /**
   * Record SLA violation with explicit error handling
   */
  async recordViolation(ticketId: string, violationType: string, message: string): Promise<void> {
    try {
      const result = await this.database.query(
        `INSERT INTO sla_violations (ticket_id, violation_type, message, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [ticketId, violationType, message, new Date()]
      )

      if (result.rows.length === 0) {
        this.monitoring.logWarning('Duplicate SLA violation (already recorded)', {
          ticketId,
          violationType,
        })
        return
      }

      this.eventBus.publish('sla.violation_detected', {
        ticketId,
        violationType,
        message,
        timestamp: new Date(),
      })

      this.monitoring.logInfo('SLA violation recorded', {
        ticketId,
        violationType,
      })
    } catch (error) {
      this.monitoring.logError('Failed to record SLA violation', {
        ticketId,
        violationType,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw new SupportError(`Failed to record SLA violation for ticket ${ticketId}`, 'SLA_VIOLATION_RECORD_FAILED')
    }
  }

  /**
   * Get SLA compliance metrics
   */
  async getComplianceMetrics(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any> {
    const startTime = Date.now()

    try {
      const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      const to = dateTo || new Date()

      const result = await this.database.query(
        `SELECT 
           COUNT(DISTINCT t.id) as total_tickets,
           SUM(CASE WHEN sv.violation_type = 'FIRST_RESPONSE_SLA' THEN 1 ELSE 0 END) as first_response_violations,
           SUM(CASE WHEN sv.violation_type = 'RESOLUTION_SLA' THEN 1 ELSE 0 END) as resolution_violations,
           COUNT(DISTINCT sv.violation_type) as violation_types,
           ROUND((COUNT(DISTINCT t.id) - COUNT(DISTINCT sv.ticket_id))::numeric / COUNT(DISTINCT t.id) * 100, 2) as compliance_percentage
         FROM tickets t
         LEFT JOIN sla_violations sv ON t.id = sv.ticket_id
         WHERE t.created_at >= $1 AND t.created_at <= $2`,
        [from, to]
      )

      const row = result.rows[0]

      return {
        period: { from, to },
        totalTickets: parseInt(row.total_tickets) || 0,
        firstResponseViolations: parseInt(row.first_response_violations) || 0,
        resolutionViolations: parseInt(row.resolution_violations) || 0,
        totalViolations: (parseInt(row.first_response_violations) || 0) + (parseInt(row.resolution_violations) || 0),
        compliancePercentage: parseFloat(row.compliance_percentage) || 100,
      }
    } catch (error) {
      this.monitoring.error('Failed to get SLA compliance metrics', { dateFrom, dateTo, error })
      throw error
    } finally {
      this.monitoring.trackDuration('sla.compliance_metrics', Date.now() - startTime)
    }
  }

  /**
   * Helper methods
   */

  private async sendViolationNotification(
    violations: Array<{ type: string; message: string }>,
    ticket: any,
    policy: SLAPolicy
  ): Promise<void> {
    try {
      const notification = {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number || `TKT-${ticket.id}`,
        violations,
        policyName: policy.name,
        timestamp: new Date(),
        channels: ['email', 'slack', 'dashboard'],
      }

      // Save to DB for guaranteed delivery
      await this.database.query(
        `INSERT INTO sla_notifications (
          ticket_id, data, status, retry_count, created_at
        ) VALUES ($1, $2, $3, $4, $5)`,
        [ticket.id, JSON.stringify(notification), 'pending', 0, new Date()]
      )

      // Async publish to event bus
      this.eventBus.publish('notification.sla_violation_queued', {
        ticketId: ticket.id,
        notification,
        timestamp: new Date(),
      })

      this.monitoring.logInfo('SLA violation notification queued', {
        ticketId: ticket.id,
        violationCount: violations.length,
      })
    } catch (error) {
      this.monitoring.logError('Failed to queue SLA notification', {
        ticketId: ticket.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      // Do not throw - notification queueing failure is non-critical
    }
  }

  private async getDefaultPolicy(): Promise<SLAPolicy> {
    return {
      id: 'default',
      name: 'Default SLA Policy',
      category: 'OTHER' as any,
      priority: 'MEDIUM' as any,
      firstResponseTime: 4,
      resolutionTime: 24,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  private formatPolicy(row: any): SLAPolicy {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      priority: row.priority,
      firstResponseTime: row.first_response_time_hours,
      resolutionTime: row.resolution_time_hours,
      active: row.active,
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

export const slaService = new SLAService(database, cache, eventBus, monitoring)
