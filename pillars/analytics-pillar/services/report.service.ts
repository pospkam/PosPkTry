/**
 * Report Service
 * Generates, schedules, and manages reports
 */

import { DatabaseService } from '@core-infrastructure/services/database.service'
import { CacheService } from '@core-infrastructure/services/cache.service'
import { EventBusService } from '@core-infrastructure/services/event-bus.service'
import { MonitoringService } from '@core-infrastructure/services/monitoring.service'
import {
  Report,
  ReportType,
  TimePeriod,
  ReportGenerationDTO,
  ReportGenerationError,
  DashboardMetrics,
} from '../types'

export class ReportService {
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
   * Generate report
   */
  async generateReport(data: ReportGenerationDTO, generatedBy: string): Promise<Report> {
    const startTime = Date.now()

    try {
      // Collect report data
      const insights = await this.generateInsights(data.type, data.startDate, data.endDate)
      const recommendations = this.generateRecommendations(insights)

      // Create report
      const result = await this.database.query(
        `INSERT INTO reports (
          type, name, description, period, start_date, end_date, generated_by, status, 
          insights, recommendations, recipients, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          data.type,
          `${data.type} Report - ${data.startDate.toLocaleDateString()}`,
          `Automated report for ${data.type}`,
          data.period,
          data.startDate,
          data.endDate,
          generatedBy,
          'PUBLISHED',
          JSON.stringify(insights),
          JSON.stringify(recommendations),
          data.recipients ? JSON.stringify(data.recipients) : null,
          new Date(),
          new Date(),
        ]
      )

      const report = this.formatReport(result.rows[0])

      // Publish event
      this.eventBus.publish('report.generated', {
        reportId: report.id,
        type: data.type,
        generatedBy,
        timestamp: new Date(),
      })

      this.monitoring.trackEvent('report_generated', { reportType: data.type })

      // Send to recipients if specified
      if (data.recipients && data.recipients.length > 0) {
        await this.sendReportToRecipients(report.id, data.recipients)
      }

      return report
    } catch (error) {
      this.monitoring.error('Failed to generate report', { data, error })
      throw new ReportGenerationError(`Failed to generate report: ${error}`)
    } finally {
      this.monitoring.trackDuration('report.generate', Date.now() - startTime)
    }
  }

  /**
   * Get report by ID
   */
  async getReport(reportId: string): Promise<Report> {
    const startTime = Date.now()

    try {
      const cached = await this.cache.get(`report:${reportId}`)
      if (cached) {
        return cached as Report
      }

      const result = await this.database.query(`SELECT * FROM reports WHERE id = $1`, [reportId])

      if (result.rows.length === 0) {
        throw new ReportGenerationError(`Report not found: ${reportId}`)
      }

      const report = this.formatReport(result.rows[0])

      await this.cache.set(`report:${reportId}`, report, 3600)

      return report
    } catch (error) {
      this.monitoring.error('Failed to get report', { reportId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('report.get', Date.now() - startTime)
    }
  }

  /**
   * List reports
   */
  async listReports(
    type?: ReportType,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ reports: Report[]; total: number }> {
    const startTime = Date.now()

    try {
      let query = `SELECT * FROM reports WHERE 1=1`
      const values: any[] = []
      let paramIndex = 1

      if (type) {
        query += ` AND type = $${paramIndex++}`
        values.push(type)
      }

      // Count total
      const countResult = await this.database.query(
        `SELECT COUNT(*) as count FROM (${query}) as counted`,
        values
      )
      const total = parseInt(countResult.rows[0].count)

      // Add pagination
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
      values.push(limit, offset)

      const result = await this.database.query(query, values)

      return {
        reports: result.rows.map((row: any) => this.formatReport(row)),
        total,
      }
    } catch (error) {
      this.monitoring.error('Failed to list reports', { type, error })
      throw error
    } finally {
      this.monitoring.trackDuration('report.list', Date.now() - startTime)
    }
  }

  /**
   * Schedule report
   */
  async scheduleReport(
    data: ReportGenerationDTO,
    scheduleFrequency: TimePeriod,
    recipients: string[]
  ): Promise<Report> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `INSERT INTO reports (
          type, name, period, start_date, end_date, status, 
          is_scheduled, schedule_frequency, recipients, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          data.type,
          `Scheduled ${data.type} Report`,
          data.period,
          data.startDate,
          data.endDate,
          'DRAFT',
          true,
          scheduleFrequency,
          JSON.stringify(recipients),
          new Date(),
          new Date(),
        ]
      )

      const report = this.formatReport(result.rows[0])

      this.eventBus.publish('report.scheduled', {
        reportId: report.id,
        frequency: scheduleFrequency,
        recipients,
        timestamp: new Date(),
      })

      return report
    } catch (error) {
      this.monitoring.error('Failed to schedule report', { data, error })
      throw error
    } finally {
      this.monitoring.trackDuration('report.schedule', Date.now() - startTime)
    }
  }

  /**
   * Archive report
   */
  async archiveReport(reportId: string): Promise<Report> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `UPDATE reports SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
        ['ARCHIVED', new Date(), reportId]
      )

      if (result.rows.length === 0) {
        throw new ReportGenerationError(`Report not found: ${reportId}`)
      }

      const report = this.formatReport(result.rows[0])

      await this.cache.delete(`report:${reportId}`)

      return report
    } catch (error) {
      this.monitoring.error('Failed to archive report', { reportId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('report.archive', Date.now() - startTime)
    }
  }

  /**
   * Helper methods
   */

  private async generateInsights(
    type: ReportType,
    startDate: Date,
    endDate: Date
  ): Promise<string[]> {
    const insights: string[] = []

    switch (type) {
      case 'REVENUE_REPORT':
        insights.push('Revenue analysis based on sales data')
        insights.push('Top performing products identified')
        insights.push('Revenue trends tracked over time')
        break
      case 'BOOKING_REPORT':
        insights.push('Booking volume analysis')
        insights.push('Conversion rate metrics')
        insights.push('Customer acquisition patterns')
        break
      case 'USER_REPORT':
        insights.push('User growth and retention metrics')
        insights.push('User engagement analysis')
        insights.push('Churn rate assessment')
        break
      case 'ENGAGEMENT_REPORT':
        insights.push('User engagement metrics')
        insights.push('Feature usage analysis')
        insights.push('Customer satisfaction trends')
        break
      case 'EXECUTIVE_SUMMARY':
        insights.push('Key performance indicators')
        insights.push('Strategic recommendations')
        insights.push('Market trends and opportunities')
        break
    }

    return insights
  }

  private generateRecommendations(insights: string[]): string[] {
    const recommendations: string[] = []

    recommendations.push('Continue monitoring key metrics')
    recommendations.push('Implement identified improvements')
    recommendations.push('Track progress against benchmarks')
    recommendations.push('Schedule follow-up review')

    return recommendations
  }

  private async sendReportToRecipients(reportId: string, recipients: string[]): Promise<void> {
    // In production, integrate with email service
    this.eventBus.publish('report.sent', {
      reportId,
      recipients,
      timestamp: new Date(),
    })
  }

  private formatReport(row: any): Report {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      description: row.description,
      period: row.period,
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      generatedBy: row.generated_by,
      status: row.status,
      metrics: [],
      insights: row.insights ? JSON.parse(row.insights) : undefined,
      recommendations: row.recommendations ? JSON.parse(row.recommendations) : undefined,
      isScheduled: row.is_scheduled,
      scheduleFrequency: row.schedule_frequency,
      recipients: row.recipients ? JSON.parse(row.recipients) : undefined,
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

export const reportService = new ReportService(database, cache, eventBus, monitoring)
