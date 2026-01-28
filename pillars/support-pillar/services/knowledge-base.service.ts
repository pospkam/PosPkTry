/**
 * Knowledge Base Service
 * Manages support knowledge base articles and FAQs
 */

import { DatabaseService } from '@core-infrastructure/services/database.service'
import { CacheService } from '@core-infrastructure/services/cache.service'
import { EventBusService } from '@core-infrastructure/services/event-bus.service'
import { MonitoringService } from '@core-infrastructure/services/monitoring.service'
import {
  KnowledgeBaseArticle,
  FAQ,
  KnowledgeBaseFilter,
  KnowledgeBaseListResponse,
  KnowledgeBaseError,
} from '../types'

export class KnowledgeBaseService {
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
   * Create knowledge base article
   */
  async createArticle(data: Partial<KnowledgeBaseArticle>, author: string): Promise<KnowledgeBaseArticle> {
    const startTime = Date.now()

    try {
      const slug = this.generateSlug(data.title!)

      const result = await this.database.query(
        `INSERT INTO knowledge_base_articles (
          title, slug, content, category, tags, author, views, helpful, unhelpful, 
          is_published, published_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          data.title,
          slug,
          data.content,
          data.category,
          data.tags ? JSON.stringify(data.tags) : null,
          author,
          0,
          0,
          0,
          data.isPublished || false,
          data.isPublished ? new Date() : null,
          new Date(),
          new Date(),
        ]
      )

      const article = this.formatArticle(result.rows[0])

      await this.cache.set(`article:${article.id}`, article, 7200)

      this.eventBus.publish('article.created', {
        articleId: article.id,
        title: article.title,
        author,
        timestamp: new Date(),
      })

      return article
    } catch (error) {
      this.monitoring.error('Failed to create article', { data, error })
      throw error
    } finally {
      this.monitoring.trackDuration('knowledge_base.create_article', Date.now() - startTime)
    }
  }

  /**
   * Publish article
   */
  async publishArticle(articleId: string): Promise<KnowledgeBaseArticle> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `UPDATE knowledge_base_articles 
         SET is_published = true, published_at = $1, updated_at = $2
         WHERE id = $3 RETURNING *`,
        [new Date(), new Date(), articleId]
      )

      if (result.rows.length === 0) {
        throw new KnowledgeBaseError(`Article not found: ${articleId}`)
      }

      const article = this.formatArticle(result.rows[0])

      await this.cache.delete(`article:${articleId}`)

      this.eventBus.publish('article.published', {
        articleId,
        timestamp: new Date(),
      })

      return article
    } catch (error) {
      this.monitoring.error('Failed to publish article', { articleId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('knowledge_base.publish_article', Date.now() - startTime)
    }
  }

  /**
   * Search articles
   */
  async searchArticles(filter: KnowledgeBaseFilter): Promise<KnowledgeBaseListResponse> {
    const startTime = Date.now()

    try {
      const page = filter.page || 1
      const limit = filter.limit || 20
      const offset = (page - 1) * limit

      let query = `SELECT * FROM knowledge_base_articles WHERE is_published = true`
      const values: any[] = []
      let paramIndex = 1

      if (filter.category) {
        query += ` AND category = $${paramIndex++}`
        values.push(filter.category)
      }

      if (filter.search) {
        query += ` AND (title ILIKE $${paramIndex++} OR content ILIKE $${paramIndex++})`
        const searchTerm = `%${filter.search}%`
        values.push(searchTerm, searchTerm)
      }

      if (filter.tags && filter.tags.length > 0) {
        query += ` AND tags @> $${paramIndex++}`
        values.push(JSON.stringify(filter.tags))
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
        data: result.rows.map((row: any) => this.formatArticle(row)),
        total,
        page,
        limit,
      }
    } catch (error) {
      this.monitoring.error('Failed to search articles', { filter, error })
      throw error
    } finally {
      this.monitoring.trackDuration('knowledge_base.search', Date.now() - startTime)
    }
  }

  /**
   * Get article by slug
   */
  async getArticleBySlug(slug: string): Promise<KnowledgeBaseArticle> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `SELECT * FROM knowledge_base_articles WHERE slug = $1 AND is_published = true`,
        [slug]
      )

      if (result.rows.length === 0) {
        throw new KnowledgeBaseError(`Article not found: ${slug}`)
      }

      const article = this.formatArticle(result.rows[0])

      // Increment view count
      await this.database.query(
        `UPDATE knowledge_base_articles SET views = views + 1 WHERE id = $1`,
        [article.id]
      )

      return article
    } catch (error) {
      this.monitoring.error('Failed to get article', { slug, error })
      throw error
    } finally {
      this.monitoring.trackDuration('knowledge_base.get_article', Date.now() - startTime)
    }
  }

  /**
   * Mark article as helpful
   */
  async markAsHelpful(articleId: string): Promise<KnowledgeBaseArticle> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `UPDATE knowledge_base_articles 
         SET helpful = helpful + 1, updated_at = $1
         WHERE id = $2 RETURNING *`,
        [new Date(), articleId]
      )

      if (result.rows.length === 0) {
        throw new KnowledgeBaseError(`Article not found: ${articleId}`)
      }

      return this.formatArticle(result.rows[0])
    } catch (error) {
      this.monitoring.error('Failed to mark article as helpful', { articleId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('knowledge_base.mark_helpful', Date.now() - startTime)
    }
  }

  /**
   * Create FAQ
   */
  async createFAQ(data: Partial<FAQ>): Promise<FAQ> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `INSERT INTO faqs (question, answer, category, priority, views, helpful, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [data.question, data.answer, data.category, data.priority || 1, 0, 0, new Date(), new Date()]
      )

      const faq = this.formatFAQ(result.rows[0])

      await this.cache.set(`faq:${faq.id}`, faq, 7200)

      return faq
    } catch (error) {
      this.monitoring.error('Failed to create FAQ', { data, error })
      throw error
    } finally {
      this.monitoring.trackDuration('knowledge_base.create_faq', Date.now() - startTime)
    }
  }

  /**
   * Get all FAQs for category
   */
  async getFAQsByCategory(category: string): Promise<FAQ[]> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `SELECT * FROM faqs WHERE category = $1 ORDER BY priority ASC, views DESC`,
        [category]
      )

      return result.rows.map((row: any) => this.formatFAQ(row))
    } catch (error) {
      this.monitoring.error('Failed to get FAQs', { category, error })
      throw error
    } finally {
      this.monitoring.trackDuration('knowledge_base.get_faqs', Date.now() - startTime)
    }
  }

  /**
   * Helper methods
   */

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  private getSortColumn(sortBy: string): string {
    const mapping: Record<string, string> = {
      views: 'views',
      createdAt: 'created_at',
    }
    return mapping[sortBy] || 'created_at'
  }

  private formatArticle(row: any): KnowledgeBaseArticle {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      author: row.author,
      views: row.views,
      helpful: row.helpful,
      unhelpful: row.unhelpful,
      isPublished: row.is_published,
      publishedAt: row.published_at ? new Date(row.published_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  private formatFAQ(row: any): FAQ {
    return {
      id: row.id,
      question: row.question,
      answer: row.answer,
      category: row.category,
      priority: row.priority,
      views: row.views,
      helpful: row.helpful,
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

export const knowledgeBaseService = new KnowledgeBaseService(
  database,
  cache,
  eventBus,
  monitoring
)
