/**
 * Payout Service
 * Manages partner payouts, payment processing, and financial transactions
 */

import { DatabaseService } from '@core-infrastructure/services/database.service'
import { CacheService } from '@core-infrastructure/services/cache.service'
import { EventBusService } from '@core-infrastructure/services/event-bus.service'
import { MonitoringService } from '@core-infrastructure/services/monitoring.service'
import {
  Payout,
  PayoutStatus,
  PayoutFilter,
  PayoutListResponse,
  PayoutProcessingError,
  InsufficientCommissionError,
  CreatePayoutDTO,
} from '../types'

export class PayoutService {
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
   * Create payout request
   */
  async createPayout(data: CreatePayoutDTO): Promise<Payout> {
    const startTime = Date.now()

    try {
      // Verify partner has sufficient commission
      const commissionResult = await this.database.query(
        `SELECT 
          SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END) as available
         FROM commissions
         WHERE partner_id = $1`,
        [data.partnerId]
      )

      const availableCommission = commissionResult.rows[0].available || 0

      if (availableCommission < data.amount) {
        throw new InsufficientCommissionError(data.amount, availableCommission)
      }

      // Create payout record
      const result = await this.database.query(
        `INSERT INTO payouts (
          partner_id, amount, currency, status, payment_method, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          data.partnerId,
          data.amount,
          data.currency,
          PayoutStatus.PENDING,
          data.paymentMethod,
          data.notes || null,
          new Date(),
          new Date(),
        ]
      )

      const payout = this.formatPayout(result.rows[0])

      // Cache payout
      await this.cache.set(`payout:${payout.id}`, payout, 3600)

      // Publish event
      this.eventBus.publish('payout.created', {
        payoutId: payout.id,
        partnerId: data.partnerId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        timestamp: new Date(),
      })

      this.monitoring.trackEvent('payout_created', {
        partnerId: data.partnerId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
      })

      return payout
    } catch (error) {
      this.monitoring.error('Failed to create payout', { data, error })
      throw error
    } finally {
      this.monitoring.trackDuration('payout.create', Date.now() - startTime)
    }
  }

  /**
   * Process payout
   */
  async processPayout(payoutId: string): Promise<Payout> {
    const startTime = Date.now()

    try {
      // Get payout
      const payoutResult = await this.database.query(`SELECT * FROM payouts WHERE id = $1`, [
        payoutId,
      ])

      if (payoutResult.rows.length === 0) {
        throw new PayoutProcessingError(`Payout not found: ${payoutId}`)
      }

      const payout = payoutResult.rows[0]

      if (payout.status !== PayoutStatus.PENDING) {
        throw new PayoutProcessingError(
          `Cannot process payout with status: ${payout.status}`
        )
      }

      // Update payout to processing
      await this.database.query(
        `UPDATE payouts SET status = $1, updated_at = $2 WHERE id = $3`,
        [PayoutStatus.PROCESSING, new Date(), payoutId]
      )

      // Simulate payment processing (in production, integrate with payment gateway)
      await this.processPayment(payout)

      // Update payout to completed
      const result = await this.database.query(
        `UPDATE payouts SET status = $1, processed_at = $2, completed_at = $3, updated_at = $4 WHERE id = $5 RETURNING *`,
        [PayoutStatus.COMPLETED, new Date(), new Date(), new Date(), payoutId]
      )

      const updated = this.formatPayout(result.rows[0])

      // Invalidate cache
      await this.cache.delete(`payout:${payoutId}`)

      // Update partner last payout date
      await this.database.query(
        `UPDATE partners SET last_payout_date = $1 WHERE id = $2`,
        [new Date(), payout.partner_id]
      )

      // Publish event
      this.eventBus.publish('payout.completed', {
        payoutId: updated.id,
        partnerId: payout.partner_id,
        amount: payout.amount,
        completedAt: new Date(),
        timestamp: new Date(),
      })

      this.monitoring.trackEvent('payout_completed', {
        payoutId,
        partnerId: payout.partner_id,
        amount: payout.amount,
      })

      return updated
    } catch (error) {
      this.monitoring.error('Failed to process payout', { payoutId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('payout.process', Date.now() - startTime)
    }
  }

  /**
   * List payouts with filtering
   */
  async listPayouts(filter: PayoutFilter): Promise<PayoutListResponse> {
    const startTime = Date.now()

    try {
      const page = filter.page || 1
      const limit = filter.limit || 20
      const offset = (page - 1) * limit

      let query = `SELECT * FROM payouts WHERE 1=1`
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
        data: result.rows.map((row: any) => this.formatPayout(row)),
        total,
        page,
        limit,
      }
    } catch (error) {
      this.monitoring.error('Failed to list payouts', { filter, error })
      throw error
    } finally {
      this.monitoring.trackDuration('payout.list', Date.now() - startTime)
    }
  }

  /**
   * Cancel payout
   */
  async cancelPayout(payoutId: string, reason: string): Promise<Payout> {
    const startTime = Date.now()

    try {
      const payoutResult = await this.database.query(`SELECT * FROM payouts WHERE id = $1`, [
        payoutId,
      ])

      if (payoutResult.rows.length === 0) {
        throw new PayoutProcessingError(`Payout not found: ${payoutId}`)
      }

      const payout = payoutResult.rows[0]

      if (![PayoutStatus.PENDING, PayoutStatus.PROCESSING].includes(payout.status)) {
        throw new PayoutProcessingError(`Cannot cancel payout with status: ${payout.status}`)
      }

      const result = await this.database.query(
        `UPDATE payouts SET status = $1, failure_reason = $2, updated_at = $3 WHERE id = $4 RETURNING *`,
        [PayoutStatus.CANCELLED, reason, new Date(), payoutId]
      )

      const updated = this.formatPayout(result.rows[0])

      // Invalidate cache
      await this.cache.delete(`payout:${payoutId}`)

      // Publish event
      this.eventBus.publish('payout.cancelled', {
        payoutId: updated.id,
        partnerId: payout.partner_id,
        amount: payout.amount,
        reason,
        timestamp: new Date(),
      })

      return updated
    } catch (error) {
      this.monitoring.error('Failed to cancel payout', { payoutId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('payout.cancel', Date.now() - startTime)
    }
  }

  /**
   * Get payout summary for partner
   */
  async getPartnerPayoutSummary(partnerId: string): Promise<{
    totalPaid: number
    pendingPayouts: number
    completedPayouts: number
    failedPayouts: number
    currency: string
  }> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `SELECT 
          SUM(CASE WHEN status = $1 THEN amount ELSE 0 END) as total_paid,
          SUM(CASE WHEN status = $2 THEN amount ELSE 0 END) as pending,
          COUNT(CASE WHEN status = $3 THEN 1 END) as completed,
          COUNT(CASE WHEN status = $4 THEN 1 END) as failed
         FROM payouts
         WHERE partner_id = $5`,
        [
          PayoutStatus.COMPLETED,
          PayoutStatus.PENDING,
          PayoutStatus.COMPLETED,
          PayoutStatus.FAILED,
          partnerId,
        ]
      )

      return {
        totalPaid: result.rows[0].total_paid || 0,
        pendingPayouts: result.rows[0].pending || 0,
        completedPayouts: result.rows[0].completed || 0,
        failedPayouts: result.rows[0].failed || 0,
        currency: 'USD',
      }
    } catch (error) {
      this.monitoring.error('Failed to get payout summary', { partnerId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('payout.get_summary', Date.now() - startTime)
    }
  }

  /**
   * Process automatic payouts for all eligible partners
   */
  async processAutomaticPayouts(): Promise<number> {
    const startTime = Date.now()

    try {
      // Get all active partners with pending commissions
      const partnersResult = await this.database.query(
        `SELECT DISTINCT p.id, p.min_payout_amount, p.payout_frequency
         FROM partners p
         JOIN commissions c ON p.id = c.partner_id
         WHERE p.status = 'ACTIVE' 
         AND c.status = 'APPROVED'
         AND (p.last_payout_date IS NULL OR 
              (p.payout_frequency = 'WEEKLY' AND p.last_payout_date < NOW() - INTERVAL '7 days') OR
              (p.payout_frequency = 'BIWEEKLY' AND p.last_payout_date < NOW() - INTERVAL '14 days') OR
              (p.payout_frequency = 'MONTHLY' AND p.last_payout_date < NOW() - INTERVAL '30 days'))`
      )

      let processedCount = 0

      for (const partner of partnersResult.rows) {
        try {
          const commissionResult = await this.database.query(
            `SELECT SUM(amount) as total FROM commissions WHERE partner_id = $1 AND status = 'APPROVED'`,
            [partner.id]
          )

          const totalCommission = commissionResult.rows[0].total || 0

          if (totalCommission >= partner.min_payout_amount) {
            await this.createPayout({
              partnerId: partner.id,
              amount: totalCommission,
              currency: 'USD',
              paymentMethod: 'BANK_TRANSFER',
              notes: 'Automatic payout',
            })

            processedCount++
          }
        } catch (error) {
          this.monitoring.error('Failed to process automatic payout for partner', {
            partnerId: partner.id,
            error,
          })
        }
      }

      this.monitoring.trackEvent('automatic_payouts_processed', { count: processedCount })

      return processedCount
    } catch (error) {
      this.monitoring.error('Failed to process automatic payouts', { error })
      throw error
    } finally {
      this.monitoring.trackDuration('payout.process_automatic', Date.now() - startTime)
    }
  }

  /**
   * Helper methods
   */

  private async processPayment(payout: any): Promise<void> {
    // In production, integrate with payment gateway (Stripe, PayPal, etc.)
    // For now, simulate successful processing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve()
      }, 1000)
    })
  }

  private getSortColumn(sortBy: string): string {
    const mapping: Record<string, string> = {
      amount: 'amount',
      createdAt: 'created_at',
    }
    return mapping[sortBy] || 'created_at'
  }

  private formatPayout(row: any): Payout {
    return {
      id: row.id,
      partnerId: row.partner_id,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      paymentMethod: row.payment_method,
      transactionId: row.transaction_id,
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      failureReason: row.failure_reason,
      notes: row.notes,
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

export const payoutService = new PayoutService(database, cache, eventBus, monitoring)
