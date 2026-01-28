/**
 * Metrics Service
 * Collects, aggregates, and tracks key performance metrics
 */

import { DatabaseService } from '@core-infrastructure/services/database.service'
import { CacheService } from '@core-infrastructure/services/cache.service'
import { EventBusService } from '@core-infrastructure/services/event-bus.service'
import { MonitoringService } from '@core-infrastructure/services/monitoring.service'
import {
  Metric,
  MetricType,
  TimePeriod,
  MetricFilter,
  MetricsResponse,
  DashboardMetrics,
} from '../types'

export class MetricsService {
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
   * Record metric
   */
  async recordMetric(
    type: MetricType,
    value: number,
    period: TimePeriod,
    metadata?: Record<string, any>
  ): Promise<Metric> {
    const startTime = Date.now()

    try {
      const timestamp = this.getTimestampForPeriod(new Date(), period)

      // Get previous value for comparison
      const prevResult = await this.database.query(
        `SELECT value FROM metrics 
         WHERE type = $1 AND period = $2 AND timestamp < $3
         ORDER BY timestamp DESC LIMIT 1`,
        [type, period, timestamp]
      )

      const previousValue = prevResult.rows[0]?.value
      const change = previousValue ? value - previousValue : undefined
      const changePercentage = previousValue ? (change! / previousValue) * 100 : undefined

      // Insert metric
      const result = await this.database.query(
        `INSERT INTO metrics (
          type, period, timestamp, value, previous_value, change, change_percentage, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          type,
          period,
          timestamp,
          value,
          previousValue || null,
          change || null,
          changePercentage || null,
          metadata ? JSON.stringify(metadata) : null,
          new Date(),
        ]
      )

      const metric = this.formatMetric(result.rows[0])

      // Publish event
      this.eventBus.publish('metric.recorded', {
        metricId: metric.id,
        type,
        value,
        timestamp: metric.timestamp,
      })

      this.monitoring.trackEvent('metric_recorded', { type, value })

      return metric
    } catch (error) {
      this.monitoring.error('Failed to record metric', { type, value, error })
      throw error
    } finally {
      this.monitoring.trackDuration('metrics.record', Date.now() - startTime)
    }
  }

  /**
   * Get metrics with filtering
   */
  async getMetrics(filter: MetricFilter): Promise<MetricsResponse> {
    const startTime = Date.now()

    try {
      const page = filter.page || 1
      const limit = filter.limit || 50
      const offset = (page - 1) * limit

      let query = `SELECT * FROM metrics WHERE 1=1`
      const values: any[] = []
      let paramIndex = 1

      if (filter.type) {
        query += ` AND type = $${paramIndex++}`
        values.push(filter.type)
      }

      if (filter.period) {
        query += ` AND period = $${paramIndex++}`
        values.push(filter.period)
      }

      if (filter.startDate) {
        query += ` AND timestamp >= $${paramIndex++}`
        values.push(filter.startDate)
      }

      if (filter.endDate) {
        query += ` AND timestamp <= $${paramIndex++}`
        values.push(filter.endDate)
      }

      // Count total
      const countResult = await this.database.query(
        `SELECT COUNT(*) as count FROM (${query}) as counted`,
        values
      )
      const total = parseInt(countResult.rows[0].count)

      // Add sorting and pagination
      const sortBy = filter.sortBy || 'timestamp'
      const sortOrder = filter.sortOrder || 'DESC'
      query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
      values.push(limit, offset)

      const result = await this.database.query(query, values)

      return {
        success: true,
        data: result.rows.map((row: any) => this.formatMetric(row)),
        total,
        page,
        limit,
      }
    } catch (error) {
      this.monitoring.error('Failed to get metrics', { filter, error })
      throw error
    } finally {
      this.monitoring.trackDuration('metrics.get', Date.now() - startTime)
    }
  }

  /**
   * Get dashboard metrics summary
   */
  async getDashboardMetrics(period: TimePeriod = TimePeriod.DAILY): Promise<DashboardMetrics> {
    const startTime = Date.now()

    try {
      const cacheKey = `dashboard-metrics:${period}`
      const cached = await this.cache.get(cacheKey)
      if (cached) {
        return cached as DashboardMetrics
      }

      const endDate = new Date()
      const startDate = this.getStartDate(endDate, period)

      // Get summary from database
      const result = await this.database.query(
        `SELECT 
          SUM(CASE WHEN type = 'REVENUE' THEN value ELSE 0 END) as total_revenue,
          SUM(CASE WHEN type = 'BOOKINGS' THEN value ELSE 0 END) as total_bookings,
          SUM(CASE WHEN type = 'USERS' THEN value ELSE 0 END) as total_users,
          AVG(CASE WHEN type = 'CONVERSION' THEN value ELSE NULL END) as conversion_rate,
          AVG(CASE WHEN type = 'RETENTION' THEN value ELSE NULL END) as retention_rate,
          AVG(CASE WHEN type = 'CHURN' THEN value ELSE NULL END) as churn_rate
         FROM metrics
         WHERE period = $1 AND timestamp >= $2 AND timestamp <= $3`,
        [period, startDate, endDate]
      )

      const metrics: DashboardMetrics = {
        totalRevenue: result.rows[0].total_revenue || 0,
        totalBookings: result.rows[0].total_bookings || 0,
        totalUsers: result.rows[0].total_users || 0,
        conversionRate: result.rows[0].conversion_rate || 0,
        averageBookingValue: result.rows[0].total_revenue / (result.rows[0].total_bookings || 1),
        customerAcquisitionCost: 0,
        customerRetention: result.rows[0].retention_rate || 0,
        activeUsers: 0,
        newUsers: 0,
        churnRate: result.rows[0].churn_rate || 0,
        ltv: 0,
        timestamp: new Date(),
      }

      // Cache metrics
      await this.cache.set(cacheKey, metrics, 3600)

      return metrics
    } catch (error) {
      this.monitoring.error('Failed to get dashboard metrics', { period, error })
      throw error
    } finally {
      this.monitoring.trackDuration('metrics.get_dashboard', Date.now() - startTime)
    }
  }

  /**
   * Aggregate metrics over time period
   */
  async aggregateMetrics(
    type: MetricType,
    period: TimePeriod,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `SELECT SUM(value) as total FROM metrics 
         WHERE type = $1 AND period = $2 AND timestamp >= $3 AND timestamp <= $4`,
        [type, period, startDate, endDate]
      )

      return result.rows[0].total || 0
    } catch (error) {
      this.monitoring.error('Failed to aggregate metrics', { type, period, error })
      throw error
    } finally {
      this.monitoring.trackDuration('metrics.aggregate', Date.now() - startTime)
    }
  }

  /**
   * Helper methods
   */

  private getTimestampForPeriod(date: Date, period: TimePeriod): Date {
    const timestamp = new Date(date)

    switch (period) {
      case TimePeriod.HOURLY:
        timestamp.setMinutes(0, 0, 0)
        break
      case TimePeriod.DAILY:
        timestamp.setHours(0, 0, 0, 0)
        break
      case TimePeriod.WEEKLY:
        const day = timestamp.getDay()
        const diff = timestamp.getDate() - day
        timestamp.setDate(diff)
        timestamp.setHours(0, 0, 0, 0)
        break
      case TimePeriod.MONTHLY:
        timestamp.setDate(1)
        timestamp.setHours(0, 0, 0, 0)
        break
      case TimePeriod.YEARLY:
        timestamp.setMonth(0, 1)
        timestamp.setHours(0, 0, 0, 0)
        break
    }

    return timestamp
  }

  private getStartDate(endDate: Date, period: TimePeriod): Date {
    const startDate = new Date(endDate)

    switch (period) {
      case TimePeriod.HOURLY:
        startDate.setHours(startDate.getHours() - 24)
        break
      case TimePeriod.DAILY:
        startDate.setDate(startDate.getDate() - 30)
        break
      case TimePeriod.WEEKLY:
        startDate.setDate(startDate.getDate() - 52)
        break
      case TimePeriod.MONTHLY:
        startDate.setMonth(startDate.getMonth() - 12)
        break
      case TimePeriod.YEARLY:
        startDate.setFullYear(startDate.getFullYear() - 5)
        break
    }

    return startDate
  }

  private formatMetric(row: any): Metric {
    return {
      id: row.id,
      type: row.type,
      period: row.period,
      timestamp: new Date(row.timestamp),
      value: row.value,
      previousValue: row.previous_value,
      change: row.change,
      changePercentage: row.change_percentage,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.created_at),
    }
  }
}

// Export singleton
const database = DatabaseService.getInstance()
const cache = CacheService.getInstance()
const eventBus = EventBusService.getInstance()
const monitoring = MonitoringService.getInstance()

export const metricsService = new MetricsService(database, cache, eventBus, monitoring)
