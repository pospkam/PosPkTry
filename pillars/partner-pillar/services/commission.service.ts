/**
 * Commission Service
 * Manages commission calculation, tracking, and distribution
 */

import { DatabaseService } from '@core-infrastructure/services/database.service'
import { CacheService } from '@core-infrastructure/services/cache.service'
import { EventBusService } from '@core-infrastructure/services/event-bus.service'
import { MonitoringService } from '@core-infrastructure/services/monitoring.service'
import {
  Commission,
  CommissionStatus,
  CommissionFilter,
  CommissionListResponse,
  CommissionCalculationError,
  CreateCommissionDTO,
} from '../types'

export class CommissionService {
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
   * Calculate commission from booking
   */
  async calculateCommission(
    bookingId: string,
    partnerId: string,
    bookingAmount: number
  ): Promise<Commission> {
    const startTime = Date.now()

    try {
      // Get partner commission rules
      const partnerResult = await this.database.query(
        `SELECT commission_percentage FROM partners WHERE id = $1`,
        [partnerId]
      )

      if (partnerResult.rows.length === 0) {
        throw new CommissionCalculationError(`Partner not found: ${partnerId}`)
      }

      const basePercentage = partnerResult.rows[0].commission_percentage || 15

      // Check for custom rules
      const rulesResult = await this.database.query(
        `SELECT rate FROM commission_rules 
         WHERE partner_id = $1 AND active = true 
         AND effective_from <= NOW() 
         AND (effective_until IS NULL OR effective_until > NOW())
         ORDER BY min_booking_amount DESC
         LIMIT 1`,
        [partnerId]
      )

      const percentage = rulesResult.rows.length > 0 ? rulesResult.rows[0].rate : basePercentage
      const amount = (bookingAmount * percentage) / 100

      // Create commission record
      const result = await this.database.query(
        `INSERT INTO commissions (
          booking_id, partner_id, amount, percentage, currency, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          bookingId,
          partnerId,
          amount,
          percentage,
          'USD',
          CommissionStatus.PENDING,
          new Date(),
          new Date(),
        ]
      )

      const commission = this.formatCommission(result.rows[0])

      // Cache commission
      await this.cache.set(`commission:${commission.id}`, commission, 3600)

      // Publish event
      this.eventBus.publish('commission.calculated', {
        commissionId: commission.id,
        partnerId,
        bookingId,
        amount,
        percentage,
        timestamp: new Date(),
      })

      this.monitoring.trackEvent('commission_calculated', {
        partnerId,
        bookingId,
        amount,
        percentage,
      })

      return commission
    } catch (error) {
      this.monitoring.error('Failed to calculate commission', { bookingId, partnerId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('commission.calculate', Date.now() - startTime)
    }
  }

  /**
   * Approve commission
   */
  async approveCommission(commissionId: string, approvedBy: string): Promise<Commission> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `UPDATE commissions 
         SET status = $1, approved_by = $2, approval_date = $3, updated_at = $4
         WHERE id = $5
         RETURNING *`,
        [CommissionStatus.APPROVED, approvedBy, new Date(), new Date(), commissionId]
      )

      if (result.rows.length === 0) {
        throw new CommissionCalculationError(`Commission not found: ${commissionId}`)
      }

      const commission = this.formatCommission(result.rows[0])

      // Invalidate cache
      await this.cache.delete(`commission:${commissionId}`)

      // Publish event
      this.eventBus.publish('commission.approved', {
        commissionId,
        partnerId: commission.partnerId,
        amount: commission.amount,
        approvedBy,
        timestamp: new Date(),
      })

      this.monitoring.trackEvent('commission_approved', { commissionId, partnerId: commission.partnerId })

      return commission
    } catch (error) {
      this.monitoring.error('Failed to approve commission', { commissionId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('commission.approve', Date.now() - startTime)
    }
  }

  /**
   * Reject commission
   */
  async rejectCommission(commissionId: string, reason: string): Promise<Commission> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `UPDATE commissions 
         SET status = $1, reason = $2, updated_at = $3
         WHERE id = $4
         RETURNING *`,
        [CommissionStatus.REJECTED, reason, new Date(), commissionId]
      )

      if (result.rows.length === 0) {
        throw new CommissionCalculationError(`Commission not found: ${commissionId}`)
      }

      const commission = this.formatCommission(result.rows[0])

      // Invalidate cache
      await this.cache.delete(`commission:${commissionId}`)

      // Publish event
      this.eventBus.publish('commission.rejected', {
        commissionId,
        partnerId: commission.partnerId,
        reason,
        timestamp: new Date(),
      })

      return commission
    } catch (error) {
      this.monitoring.error('Failed to reject commission', { commissionId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('commission.reject', Date.now() - startTime)
    }
  }

  /**
   * List commissions with filtering
   */
  async listCommissions(filter: CommissionFilter): Promise<CommissionListResponse> {
    const startTime = Date.now()

    try {
      const page = filter.page || 1
      const limit = filter.limit || 20
      const offset = (page - 1) * limit

      let query = `SELECT * FROM commissions WHERE 1=1`
      const values: any[] = []
      let paramIndex = 1

      if (filter.partnerId) {
        query += ` AND partner_id = $${paramIndex++}`
        values.push(filter.partnerId)
      }

      if (filter.status) {
        query += ` AND status = $${paramIndex++}`
        values.push(filter.status)
      }

      if (filter.fromDate) {
        query += ` AND created_at >= $${paramIndex++}`
        values.push(filter.fromDate)
      }

      if (filter.toDate) {
        query += ` AND created_at <= $${paramIndex++}`
        values.push(filter.toDate)
      }

      if (filter.minAmount) {
        query += ` AND amount >= $${paramIndex++}`
        values.push(filter.minAmount)
      }

      if (filter.maxAmount) {
        query += ` AND amount <= $${paramIndex++}`
        values.push(filter.maxAmount)
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
        data: result.rows.map((row: any) => this.formatCommission(row)),
        total,
        page,
        limit,
      }
    } catch (error) {
      this.monitoring.error('Failed to list commissions', { filter, error })
      throw error
    } finally {
      this.monitoring.trackDuration('commission.list', Date.now() - startTime)
    }
  }

  /**
   * Get commission summary for partner
   */
  async getPartnerCommissionSummary(partnerId: string): Promise<{
    pendingCommissions: number
    approvedCommissions: number
    totalCommissions: number
    currency: string
  }> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `SELECT 
          SUM(CASE WHEN status = $1 THEN amount ELSE 0 END) as pending,
          SUM(CASE WHEN status = $2 THEN amount ELSE 0 END) as approved,
          SUM(amount) as total
         FROM commissions
         WHERE partner_id = $3`,
        [CommissionStatus.PENDING, CommissionStatus.APPROVED, partnerId]
      )

      return {
        pendingCommissions: result.rows[0].pending || 0,
        approvedCommissions: result.rows[0].approved || 0,
        totalCommissions: result.rows[0].total || 0,
        currency: 'USD',
      }
    } catch (error) {
      this.monitoring.error('Failed to get commission summary', { partnerId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('commission.get_summary', Date.now() - startTime)
    }
  }

  private getSortColumn(sortBy: string): string {
    const mapping: Record<string, string> = {
      amount: 'amount',
      createdAt: 'created_at',
    }
    return mapping[sortBy] || 'created_at'
  }

  private formatCommission(row: any): Commission {
    return {
      id: row.id,
      partnerId: row.partner_id,
      bookingId: row.booking_id,
      amount: row.amount,
      percentage: row.percentage,
      currency: row.currency,
      status: row.status,
      approvedBy: row.approved_by,
      approvalDate: row.approval_date ? new Date(row.approval_date) : undefined,
      reason: row.reason,
      description: row.description,
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

export const commissionService = new CommissionService(
  database,
  cache,
  eventBus,
  monitoring
)
