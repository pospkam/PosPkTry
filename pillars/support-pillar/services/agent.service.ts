/**
 * Agent Service
 * Manages support staff and agent lifecycle
 */

import { DatabaseService } from '@core-infrastructure/services/database.service'
import { CacheService } from '@core-infrastructure/services/cache.service'
import { EventBusService } from '@core-infrastructure/services/event-bus.service'
import { MonitoringService } from '@core-infrastructure/services/monitoring.service'
import {
  SupportAgent,
  AgentStatus,
  SupportError,
} from '../types'

export class AgentService {
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
   * Create support agent
   */
  async createAgent(data: Partial<SupportAgent>): Promise<SupportAgent> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `INSERT INTO support_agents (
          user_id, email, name, status, team, specialization, 
          active_tickets, total_tickets_resolved, average_resolution_time,
          customer_satisfaction_score, timezone, working_hours_start,
          working_hours_end, max_concurrent_tickets, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          data.userId,
          data.email,
          data.name,
          data.status || AgentStatus.OFFLINE,
          data.team,
          data.specialization ? JSON.stringify(data.specialization) : null,
          0,
          0,
          0,
          5,
          data.availability?.timezone || 'UTC',
          data.availability?.workingHours?.[0]?.start || '09:00',
          data.availability?.workingHours?.[0]?.end || '18:00',
          data.availability?.maxConcurrentTickets || 5,
          new Date(),
          new Date(),
        ]
      )

      const agent = this.formatAgent(result.rows[0])

      await this.cache.set(`agent:${agent.id}`, agent, 3600)

      this.eventBus.publish('agent.created', {
        agentId: agent.id,
        email: agent.email,
        timestamp: new Date(),
      })

      return agent
    } catch (error) {
      this.monitoring.error('Failed to create agent', { data, error })
      throw error
    } finally {
      this.monitoring.trackDuration('agent.create', Date.now() - startTime)
    }
  }

  /**
   * Get agent
   */
  async getAgent(agentId: string): Promise<SupportAgent> {
    const startTime = Date.now()

    try {
      // Check cache
      const cached = await this.cache.get<SupportAgent>(`agent:${agentId}`)
      if (cached) {
        return cached
      }

      const result = await this.database.query(
        `SELECT * FROM support_agents WHERE id = $1`,
        [agentId]
      )

      if (result.rows.length === 0) {
        throw new SupportError(`Agent not found: ${agentId}`, 'AGENT_NOT_FOUND')
      }

      const agent = this.formatAgent(result.rows[0])

      await this.cache.set(`agent:${agentId}`, agent, 3600)

      return agent
    } catch (error) {
      this.monitoring.error('Failed to get agent', { agentId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('agent.get', Date.now() - startTime)
    }
  }

  /**
   * Update agent
   */
  async updateAgent(agentId: string, data: Partial<SupportAgent>): Promise<SupportAgent> {
    const startTime = Date.now()

    try {
      const updates: string[] = []
      const values: any[] = []
      let paramIndex = 1

      if (data.name) {
        updates.push(`name = $${paramIndex++}`)
        values.push(data.name)
      }

      if (data.team) {
        updates.push(`team = $${paramIndex++}`)
        values.push(data.team)
      }

      if (data.specialization) {
        updates.push(`specialization = $${paramIndex++}`)
        values.push(JSON.stringify(data.specialization))
      }

      if (data.availability?.timezone) {
        updates.push(`timezone = $${paramIndex++}`)
        values.push(data.availability.timezone)
      }

      updates.push(`updated_at = $${paramIndex++}`)
      values.push(new Date())

      values.push(agentId)

      const result = await this.database.query(
        `UPDATE support_agents SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      )

      if (result.rows.length === 0) {
        throw new SupportError(`Agent not found: ${agentId}`, 'AGENT_NOT_FOUND')
      }

      const agent = this.formatAgent(result.rows[0])

      await this.cache.delete(`agent:${agentId}`)

      this.eventBus.publish('agent.updated', {
        agentId,
        timestamp: new Date(),
      })

      return agent
    } catch (error) {
      this.monitoring.error('Failed to update agent', { agentId, data, error })
      throw error
    } finally {
      this.monitoring.trackDuration('agent.update', Date.now() - startTime)
    }
  }

  /**
   * Set agent status
   */
  async setAgentStatus(agentId: string, status: AgentStatus): Promise<SupportAgent> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `UPDATE support_agents SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
        [status, new Date(), agentId]
      )

      if (result.rows.length === 0) {
        throw new SupportError(`Agent not found: ${agentId}`, 'AGENT_NOT_FOUND')
      }

      const agent = this.formatAgent(result.rows[0])

      await this.cache.delete(`agent:${agentId}`)

      this.eventBus.publish('agent.status_changed', {
        agentId,
        status,
        timestamp: new Date(),
      })

      return agent
    } catch (error) {
      this.monitoring.error('Failed to set agent status', { agentId, status, error })
      throw error
    } finally {
      this.monitoring.trackDuration('agent.set_status', Date.now() - startTime)
    }
  }

  /**
   * Get available agents by category
   */
  async getAvailableAgents(category: string): Promise<SupportAgent[]> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `SELECT * FROM support_agents 
         WHERE status != $1 AND active_tickets < max_concurrent_tickets
         AND specialization @> $2
         ORDER BY active_tickets ASC`,
        [AgentStatus.OFFLINE, JSON.stringify([category])]
      )

      return result.rows.map((row: any) => this.formatAgent(row))
    } catch (error) {
      this.monitoring.error('Failed to get available agents', { category, error })
      throw error
    } finally {
      this.monitoring.trackDuration('agent.get_available', Date.now() - startTime)
    }
  }

  /**
   * Get agent metrics
   */
  async getAgentMetrics(agentId: string): Promise<any> {
    const startTime = Date.now()

    try {
      const agent = await this.getAgent(agentId)

      const result = await this.database.query(
        `SELECT 
           COUNT(*) as total_tickets,
           SUM(CASE WHEN status = $1 THEN 1 ELSE 0 END) as resolved_count,
           AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60)::int as avg_resolution_minutes
         FROM tickets WHERE agent_id = $2`,
        ['RESOLVED', agentId]
      )

      return {
        agentId,
        name: agent.name,
        activeTickets: agent.activeTickets,
        totalTicketsResolved: agent.totalTicketsResolved,
        averageResolutionTime: agent.averageResolutionTime,
        customerSatisfactionScore: agent.customerSatisfactionScore,
        totalTickets: parseInt(result.rows[0].total_tickets),
        resolvedCount: parseInt(result.rows[0].resolved_count) || 0,
        avgResolutionMinutes: parseInt(result.rows[0].avg_resolution_minutes) || 0,
      }
    } catch (error) {
      this.monitoring.error('Failed to get agent metrics', { agentId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('agent.get_metrics', Date.now() - startTime)
    }
  }

  /**
   * Update agent active tickets
   */
  async updateActiveTickets(agentId: string, increment: number): Promise<void> {
    try {
      await this.database.query(
        `UPDATE support_agents 
         SET active_tickets = GREATEST(0, active_tickets + $1), updated_at = $2
         WHERE id = $3`,
        [increment, new Date(), agentId]
      )

      await this.cache.delete(`agent:${agentId}`)
    } catch (error) {
      this.monitoring.error('Failed to update active tickets', { agentId, increment, error })
      throw error
    }
  }

  /**
   * Helper methods
   */

  private formatAgent(row: any): SupportAgent {
    return {
      id: row.id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      status: row.status,
      team: row.team,
      specialization: row.specialization ? JSON.parse(row.specialization) : [],
      activeTickets: row.active_tickets,
      totalTicketsResolved: row.total_tickets_resolved,
      averageResolutionTime: row.average_resolution_time,
      customerSatisfactionScore: row.customer_satisfaction_score,
      availability: {
        timezone: row.timezone,
        workingHours: [
          {
            start: row.working_hours_start,
            end: row.working_hours_end,
          },
        ],
        maxConcurrentTickets: row.max_concurrent_tickets,
      },
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

export const agentService = new AgentService(database, cache, eventBus, monitoring)
