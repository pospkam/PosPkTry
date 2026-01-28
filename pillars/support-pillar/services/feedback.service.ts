/**
 * Feedback Service
 * Manages customer satisfaction tracking and surveys
 */

import { DatabaseService } from '@/pillars/core-infrastructure-infrastructure/services/database.service'
import { CacheService } from '@/pillars/core-infrastructure-infrastructure/services/cache.service'
import { EventBusService } from '@/pillars/core-infrastructure-infrastructure/services/event-bus.service'
import { MonitoringService } from '@/pillars/core-infrastructure-infrastructure/services/monitoring.service'
import {
  SupportFeedback,
  SurveySatisfaction,
  SupportError,
} from '../types'

export class FeedbackService {
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
   * Create feedback
   */
  async createFeedback(data: Partial<SupportFeedback>): Promise<SupportFeedback> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `INSERT INTO feedback (
          ticket_id, customer_id, agent_id, rating, comment,
          response_time_rating, resolution_rating, professionalism_rating,
          knowledge_rating, would_recommend, follow_up_required, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          data.ticketId,
          data.customerId,
          data.agentId,
          data.rating,
          data.comment,
          data.categories?.responseTime || 0,
          data.categories?.resolution || 0,
          data.categories?.professionalism || 0,
          data.categories?.knowledge || 0,
          data.wouldRecommend || false,
          data.followUpRequired || false,
          new Date(),
          new Date(),
        ]
      )

      const feedback = this.formatFeedback(result.rows[0])

      // Update agent satisfaction score
      if (data.agentId) {
        await this.updateAgentSatisfactionScore(data.agentId)
      }

      this.eventBus.publish('feedback.created', {
        feedbackId: feedback.id,
        ticketId: data.ticketId,
        rating: data.rating,
        timestamp: new Date(),
      })

      return feedback
    } catch (error) {
      this.monitoring.error('Failed to create feedback', { data, error })
      throw error
    } finally {
      this.monitoring.trackDuration('feedback.create', Date.now() - startTime)
    }
  }

  /**
   * Create survey
   */
  async createSurvey(data: Partial<SurveySatisfaction>): Promise<SurveySatisfaction> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `INSERT INTO surveys (
          customer_id, overall_rating, support_quality_rating, response_time_rating,
          resolution_rating, comment, email, completed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          data.customerId,
          data.overallRating,
          data.supportQuality,
          data.responseTime,
          data.resolution,
          data.comment,
          data.email,
          data.completedAt || new Date(),
          new Date(),
          new Date(),
        ]
      )

      const survey = this.formatSurvey(result.rows[0])

      this.eventBus.publish('survey.completed', {
        surveyId: survey.id,
        customerId: data.customerId,
        overallRating: data.overallRating,
        timestamp: new Date(),
      })

      return survey
    } catch (error) {
      this.monitoring.error('Failed to create survey', { data, error })
      throw error
    } finally {
      this.monitoring.trackDuration('feedback.create_survey', Date.now() - startTime)
    }
  }

  /**
   * List feedback
   */
  async listFeedback(filter: any = {}): Promise<any> {
    const startTime = Date.now()

    try {
      const page = filter.page || 1
      const limit = filter.limit || 20
      const offset = (page - 1) * limit

      let query = `SELECT * FROM feedback WHERE 1=1`
      const values: any[] = []
      let paramIndex = 1

      if (filter.agentId) {
        query += ` AND agent_id = $${paramIndex++}`
        values.push(filter.agentId)
      }

      if (filter.customerId) {
        query += ` AND customer_id = $${paramIndex++}`
        values.push(filter.customerId)
      }

      if (filter.ratingMin !== undefined) {
        query += ` AND rating >= $${paramIndex++}`
        values.push(filter.ratingMin)
      }

      if (filter.ratingMax !== undefined) {
        query += ` AND rating <= $${paramIndex++}`
        values.push(filter.ratingMax)
      }

      // Count total
      const countResult = await this.database.query(
        `SELECT COUNT(*) as count FROM feedback WHERE 1=1`,
        []
      )
      const total = parseInt(countResult.rows[0].count)

      // Add pagination
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
      values.push(limit, offset)

      const result = await this.database.query(query, values)

      return {
        success: true,
        data: result.rows.map((row: any) => this.formatFeedback(row)),
        total,
        page,
        limit,
      }
    } catch (error) {
      this.monitoring.error('Failed to list feedback', { filter, error })
      throw error
    } finally {
      this.monitoring.trackDuration('feedback.list', Date.now() - startTime)
    }
  }

  /**
   * Get satisfaction metrics
   */
  async getSatisfactionMetrics(): Promise<any> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `SELECT 
           COUNT(*) as total_feedback,
           AVG(rating)::decimal(10,2) as avg_rating,
           SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive_count,
           SUM(CASE WHEN rating < 4 THEN 1 ELSE 0 END) as negative_count,
           AVG(response_time_rating)::decimal(10,2) as avg_response_time,
           AVG(resolution_rating)::decimal(10,2) as avg_resolution,
           AVG(professionalism_rating)::decimal(10,2) as avg_professionalism,
           AVG(knowledge_rating)::decimal(10,2) as avg_knowledge,
           SUM(CASE WHEN would_recommend = true THEN 1 ELSE 0 END) as recommenders
         FROM feedback`,
        []
      )

      const row = result.rows[0]

      return {
        totalFeedback: parseInt(row.total_feedback),
        averageRating: parseFloat(row.avg_rating) || 0,
        positiveCount: parseInt(row.positive_count) || 0,
        negativeCount: parseInt(row.negative_count) || 0,
        avgResponseTime: parseFloat(row.avg_response_time) || 0,
        avgResolution: parseFloat(row.avg_resolution) || 0,
        avgProfessionalism: parseFloat(row.avg_professionalism) || 0,
        avgKnowledge: parseFloat(row.avg_knowledge) || 0,
        recommendersCount: parseInt(row.recommenders) || 0,
        recommendationRate: row.total_feedback > 0 
          ? ((row.recommenders / row.total_feedback) * 100).toFixed(2)
          : 0,
      }
    } catch (error) {
      this.monitoring.error('Failed to get satisfaction metrics', { error })
      throw error
    } finally {
      this.monitoring.trackDuration('feedback.get_metrics', Date.now() - startTime)
    }
  }

  /**
   * Get agent feedback summary
   */
  async getAgentFeedbackSummary(agentId: string): Promise<any> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `SELECT 
           COUNT(*) as total_feedback,
           AVG(rating)::decimal(10,2) as avg_rating,
           AVG(response_time_rating)::decimal(10,2) as avg_response_time,
           AVG(resolution_rating)::decimal(10,2) as avg_resolution,
           AVG(professionalism_rating)::decimal(10,2) as avg_professionalism,
           AVG(knowledge_rating)::decimal(10,2) as avg_knowledge
         FROM feedback WHERE agent_id = $1`,
        [agentId]
      )

      const row = result.rows[0]

      return {
        agentId,
        totalFeedback: parseInt(row.total_feedback),
        averageRating: parseFloat(row.avg_rating) || 0,
        avgResponseTime: parseFloat(row.avg_response_time) || 0,
        avgResolution: parseFloat(row.avg_resolution) || 0,
        avgProfessionalism: parseFloat(row.avg_professionalism) || 0,
        avgKnowledge: parseFloat(row.avg_knowledge) || 0,
      }
    } catch (error) {
      this.monitoring.error('Failed to get agent feedback summary', { agentId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('feedback.agent_summary', Date.now() - startTime)
    }
  }

  /**
   * Private helper methods
   */

  private async updateAgentSatisfactionScore(agentId: string): Promise<void> {
    try {
      const result = await this.database.query(
        `SELECT AVG(rating)::decimal(10,2) as avg_rating FROM feedback WHERE agent_id = $1`,
        [agentId]
      )

      const avgRating = parseFloat(result.rows[0].avg_rating) || 5

      await this.database.query(
        `UPDATE support_agents SET customer_satisfaction_score = $1, updated_at = $2 WHERE id = $3`,
        [avgRating, new Date(), agentId]
      )
    } catch (error) {
      this.monitoring.error('Failed to update agent satisfaction score', { agentId, error })
    }
  }

  private formatFeedback(row: any): SupportFeedback {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      customerId: row.customer_id,
      agentId: row.agent_id,
      rating: row.rating,
      comment: row.comment,
      categories: {
        responseTime: row.response_time_rating,
        resolution: row.resolution_rating,
        professionalism: row.professionalism_rating,
        knowledge: row.knowledge_rating,
      },
      wouldRecommend: row.would_recommend,
      followUpRequired: row.follow_up_required,
      createdAt: new Date(row.created_at),
    }
  }

  private formatSurvey(row: any): SurveySatisfaction {
    return {
      id: row.id,
      customerId: row.customer_id,
      overallRating: row.overall_rating,
      supportQuality: row.support_quality_rating,
      responseTime: row.response_time_rating,
      resolution: row.resolution_rating,
      comment: row.comment,
      email: row.email,
      completedAt: new Date(row.completed_at),
    }
  }
}

// Export singleton
const database = DatabaseService.getInstance()
const cache = CacheService.getInstance()
const eventBus = EventBusService.getInstance()
const monitoring = MonitoringService.getInstance()

export const feedbackService = new FeedbackService(database, cache, eventBus, monitoring)
