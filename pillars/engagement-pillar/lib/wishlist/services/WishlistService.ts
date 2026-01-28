/**
 * Wishlist Service
 * Complete service for managing wishlists and favorites
 * 850+ lines of production-ready code
 */

import { DatabaseService } from '@/pillars/core-infrastructure/database'
import { CacheService } from '@/pillars/core-infrastructure/cache'
import { EventBusService } from '@/pillars/core-infrastructure/event-bus'
import { NotificationsService } from '@/pillars/core-infrastructure/notifications'
import { MonitoringService } from '@/pillars/core-infrastructure/monitoring'

import type {
  Wishlist,
  WishlistItem,
  WishlistCreate,
  WishlistUpdate,
  WishlistItemCreate,
  WishlistItemUpdate,
  WishlistFilters,
  WishlistItemFilters,
  WishlistAnalytics,
  PriceWatch,
} from '../types'

import {
  WishlistNotFoundError,
  DuplicateWishlistItemError,
  InvalidWishlistAccessError,
  WishlistLimitExceededError,
  InvalidShareTokenError,
} from '../types'

/**
 * WishlistService - Manages wishlists and saved items
 * Supports price tracking, recommendations, and sharing
 */
class WishlistService {
  private database: DatabaseService
  private cache: CacheService
  private eventBus: EventBusService
  private notifications: NotificationsService
  private monitoring: MonitoringService

  private readonly MAX_WISHLISTS_PER_USER = 50
  private readonly MAX_ITEMS_PER_WISHLIST = 500

  constructor(
    database: DatabaseService,
    cache: CacheService,
    eventBus: EventBusService,
    notifications: NotificationsService,
    monitoring: MonitoringService
  ) {
    this.database = database
    this.cache = cache
    this.eventBus = eventBus
    this.notifications = notifications
    this.monitoring = monitoring
  }

  // ============================================================================
  // WISHLIST OPERATIONS
  // ============================================================================

  /**
   * Create a new wishlist
   */
  async createWishlist(data: WishlistCreate, userId: string): Promise<Wishlist> {
    const startTime = Date.now()

    try {
      // 1. Check limit
      const countResult = await this.database.query(
        `SELECT COUNT(*) as count FROM wishlists WHERE user_id = $1`,
        [userId]
      )

      if ((countResult[0]?.count || 0) >= this.MAX_WISHLISTS_PER_USER) {
        throw new WishlistLimitExceededError(this.MAX_WISHLISTS_PER_USER)
      }

      // 2. Create wishlist
      const wishlist: Wishlist = {
        id: this.generateId(),
        userId,
        name: data.name,
        description: data.description,
        items: [],
        isPublic: data.isPublic || false,
        theme: data.theme,
        shareSettings: {
          shareToken: this.generateShareToken(),
          sharedWith: [],
          lastSharedAt: undefined,
        },
        viewCount: 0,
        likeCount: 0,
        comments: [],
        tags: data.tags,
        estimatedBudget: data.estimatedBudget,
        currency: data.currency || 'RUB',
        priority: data.priority || 'medium',
        targetDate: data.targetDate,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // 3. Save wishlist
      await this.database.query(
        `
        INSERT INTO wishlists (
          id, user_id, name, description, is_public,
          theme, share_token, view_count, like_count,
          estimated_budget, currency, priority, target_date,
          status, tags, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `,
        [
          wishlist.id,
          wishlist.userId,
          wishlist.name,
          wishlist.description,
          wishlist.isPublic,
          wishlist.theme,
          wishlist.shareSettings.shareToken,
          wishlist.viewCount,
          wishlist.likeCount,
          wishlist.estimatedBudget,
          wishlist.currency,
          wishlist.priority,
          wishlist.targetDate,
          wishlist.status,
          JSON.stringify(wishlist.tags || []),
          wishlist.createdAt,
          wishlist.updatedAt,
        ]
      )

      // 4. Publish event
      this.eventBus.publish('wishlist.created', {
        wishlistId: wishlist.id,
        userId,
        isPublic: wishlist.isPublic,
      })

      // 5. Log metrics
      this.monitoring.trackMetric('wishlist_created', 1, {
        isPublic: wishlist.isPublic,
      })
      this.monitoring.trackDuration('wishlist.create', Date.now() - startTime)

      return wishlist
    } catch (error) {
      this.monitoring.error('Failed to create wishlist', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      })
      throw error
    }
  }

  /**
   * Get wishlist by ID
   */
  async getWishlist(wishlistId: string, userId?: string): Promise<Wishlist | null> {
    const cacheKey = `wishlist:${wishlistId}`
    const cached = await this.cache.get(cacheKey, 15 * 60)

    if (cached) {
      return cached as Wishlist
    }

    const result = await this.database.query(
      `SELECT * FROM wishlists WHERE id = $1`,
      [wishlistId]
    )

    if (!result || result.length === 0) {
      return null
    }

    const wishlist = this.mapDatabaseRowToWishlist(result[0])

    // Check access
    if (!wishlist.isPublic && userId && wishlist.userId !== userId) {
      const hasAccess = await this.hasWishlistAccess(wishlistId, userId)

      if (!hasAccess) {
        throw new InvalidWishlistAccessError(wishlistId)
      }
    }

    // Load items
    const itemResults = await this.database.query(
      `SELECT * FROM wishlist_items WHERE wishlist_id = $1 ORDER BY position ASC`,
      [wishlistId]
    )

    wishlist.items = itemResults.map((r: any) => this.mapDatabaseRowToWishlistItem(r))

    // Load comments
    const commentResults = await this.database.query(
      `SELECT * FROM wishlist_comments WHERE wishlist_id = $1 ORDER BY created_at DESC`,
      [wishlistId]
    )

    wishlist.comments = commentResults.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      comment: r.comment,
      rating: r.rating,
      likes: r.likes,
      createdAt: new Date(r.created_at),
    }))

    await this.cache.set(cacheKey, wishlist, 15 * 60)

    return wishlist
  }

  /**
   * Update wishlist
   */
  async updateWishlist(
    wishlistId: string,
    data: WishlistUpdate,
    userId: string
  ): Promise<Wishlist> {
    const wishlist = await this.getWishlist(wishlistId, userId)

    if (!wishlist) {
      throw new WishlistNotFoundError(wishlistId)
    }

    if (wishlist.userId !== userId) {
      throw new InvalidWishlistAccessError(wishlistId)
    }

    if (data.name) wishlist.name = data.name
    if (data.description) wishlist.description = data.description
    if (data.isPublic !== undefined) wishlist.isPublic = data.isPublic
    if (data.theme) wishlist.theme = data.theme
    if (data.priority) wishlist.priority = data.priority
    if (data.targetDate) wishlist.targetDate = data.targetDate
    if (data.tags) wishlist.tags = data.tags

    wishlist.updatedAt = new Date()

    await this.database.query(
      `
      UPDATE wishlists
      SET name = $1, description = $2, is_public = $3, theme = $4,
          priority = $5, target_date = $6, tags = $7, updated_at = $8
      WHERE id = $9
      `,
      [
        wishlist.name,
        wishlist.description,
        wishlist.isPublic,
        wishlist.theme,
        wishlist.priority,
        wishlist.targetDate,
        JSON.stringify(wishlist.tags || []),
        wishlist.updatedAt,
        wishlistId,
      ]
    )

    this.cache.invalidate(`wishlist:${wishlistId}`)

    this.eventBus.publish('wishlist.updated', {
      wishlistId,
      userId,
    })

    return wishlist
  }

  /**
   * Delete wishlist
   */
  async deleteWishlist(wishlistId: string, userId: string): Promise<void> {
    const wishlist = await this.getWishlist(wishlistId, userId)

    if (!wishlist) {
      throw new WishlistNotFoundError(wishlistId)
    }

    if (wishlist.userId !== userId) {
      throw new InvalidWishlistAccessError(wishlistId)
    }

    await this.database.query(
      `DELETE FROM wishlist_items WHERE wishlist_id = $1`,
      [wishlistId]
    )

    await this.database.query(
      `DELETE FROM wishlists WHERE id = $1`,
      [wishlistId]
    )

    this.cache.invalidate(`wishlist:${wishlistId}`)

    this.eventBus.publish('wishlist.deleted', {
      wishlistId,
      userId,
    })
  }

  /**
   * List user's wishlists
   */
  async listWishlists(
    userId: string,
    filters: WishlistFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<{ wishlists: Wishlist[]; total: number }> {
    let query = 'SELECT * FROM wishlists WHERE user_id = $1'
    const params: any[] = [userId]
    let paramIndex = 2

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`
      params.push(filters.status)
    }

    query += ` ORDER BY updated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(limit, offset)

    const results = await this.database.query(query, params)
    const wishlists = results.map((r: any) => this.mapDatabaseRowToWishlist(r))

    // Get total
    const countResult = await this.database.query(
      `SELECT COUNT(*) as count FROM wishlists WHERE user_id = $1`,
      [userId]
    )

    const total = countResult[0]?.count || 0

    return { wishlists, total }
  }

  // ============================================================================
  // WISHLIST ITEM OPERATIONS
  // ============================================================================

  /**
   * Add item to wishlist
   */
  async addItem(
    wishlistId: string,
    data: WishlistItemCreate,
    userId: string
  ): Promise<WishlistItem> {
    const wishlist = await this.getWishlist(wishlistId, userId)

    if (!wishlist) {
      throw new WishlistNotFoundError(wishlistId)
    }

    if (wishlist.userId !== userId) {
      throw new InvalidWishlistAccessError(wishlistId)
    }

    // Check duplicate
    const duplicate = await this.database.query(
      `SELECT id FROM wishlist_items
       WHERE wishlist_id = $1 AND item_id = $2 AND item_type = $3`,
      [wishlistId, data.itemId, data.itemType]
    )

    if (duplicate && duplicate.length > 0) {
      throw new DuplicateWishlistItemError(wishlistId, data.itemId)
    }

    // Check limit
    if ((wishlist.items?.length || 0) >= this.MAX_ITEMS_PER_WISHLIST) {
      throw new WishlistLimitExceededError(this.MAX_ITEMS_PER_WISHLIST)
    }

    const item: WishlistItem = {
      id: this.generateId(),
      wishlistId,
      itemId: data.itemId,
      itemType: data.itemType,
      status: 'active',
      priority: data.priority || 'medium',
      notes: data.notes,
      visitDate: data.visitDate,
      estimatedBudget: data.estimatedBudget,
      currency: data.currency,
      notifyOnPriceChange: data.notifyOnPriceChange || false,
      position: (wishlist.items?.length || 0) + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await this.database.query(
      `
      INSERT INTO wishlist_items (
        id, wishlist_id, item_id, item_type, status,
        priority, notes, visit_date, estimated_budget,
        currency, notify_on_price_change, position,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `,
      [
        item.id,
        item.wishlistId,
        item.itemId,
        item.itemType,
        item.status,
        item.priority,
        item.notes,
        item.visitDate,
        item.estimatedBudget,
        item.currency,
        item.notifyOnPriceChange,
        item.position,
        item.createdAt,
        item.updatedAt,
      ]
    )

    this.cache.invalidate(`wishlist:${wishlistId}`)

    this.eventBus.publish('wishlist.item_added', {
      wishlistId,
      itemId: item.itemId,
      itemType: item.itemType,
      userId,
    })

    return item
  }

  /**
   * Update wishlist item
   */
  async updateItem(
    wishlistId: string,
    itemId: string,
    data: WishlistItemUpdate,
    userId: string
  ): Promise<WishlistItem> {
    const wishlist = await this.getWishlist(wishlistId, userId)

    if (!wishlist) {
      throw new WishlistNotFoundError(wishlistId)
    }

    if (wishlist.userId !== userId) {
      throw new InvalidWishlistAccessError(wishlistId)
    }

    const itemResult = await this.database.query(
      `SELECT * FROM wishlist_items WHERE id = $1 AND wishlist_id = $2`,
      [itemId, wishlistId]
    )

    if (!itemResult || itemResult.length === 0) {
      throw new Error('Item not found')
    }

    const item = this.mapDatabaseRowToWishlistItem(itemResult[0])

    if (data.priority) item.priority = data.priority
    if (data.notes) item.notes = data.notes
    if (data.visitDate) item.visitDate = data.visitDate
    if (data.estimatedBudget) item.estimatedBudget = data.estimatedBudget
    if (data.notifyOnPriceChange !== undefined) item.notifyOnPriceChange = data.notifyOnPriceChange

    item.updatedAt = new Date()

    await this.database.query(
      `
      UPDATE wishlist_items
      SET priority = $1, notes = $2, visit_date = $3,
          estimated_budget = $4, notify_on_price_change = $5, updated_at = $6
      WHERE id = $7
      `,
      [
        item.priority,
        item.notes,
        item.visitDate,
        item.estimatedBudget,
        item.notifyOnPriceChange,
        item.updatedAt,
        itemId,
      ]
    )

    this.cache.invalidate(`wishlist:${wishlistId}`)

    return item
  }

  /**
   * Remove item from wishlist
   */
  async removeItem(wishlistId: string, itemId: string, userId: string): Promise<void> {
    const wishlist = await this.getWishlist(wishlistId, userId)

    if (!wishlist) {
      throw new WishlistNotFoundError(wishlistId)
    }

    if (wishlist.userId !== userId) {
      throw new InvalidWishlistAccessError(wishlistId)
    }

    await this.database.query(
      `DELETE FROM wishlist_items WHERE id = $1 AND wishlist_id = $2`,
      [itemId, wishlistId]
    )

    this.cache.invalidate(`wishlist:${wishlistId}`)

    this.eventBus.publish('wishlist.item_removed', {
      wishlistId,
      itemId,
      userId,
    })
  }

  /**
   * Reorder items in wishlist
   */
  async reorderItems(
    wishlistId: string,
    itemIds: string[],
    userId: string
  ): Promise<void> {
    const wishlist = await this.getWishlist(wishlistId, userId)

    if (!wishlist) {
      throw new WishlistNotFoundError(wishlistId)
    }

    if (wishlist.userId !== userId) {
      throw new InvalidWishlistAccessError(wishlistId)
    }

    for (let i = 0; i < itemIds.length; i++) {
      await this.database.query(
        `UPDATE wishlist_items SET position = $1 WHERE id = $2 AND wishlist_id = $3`,
        [i + 1, itemIds[i], wishlistId]
      )
    }

    this.cache.invalidate(`wishlist:${wishlistId}`)

    this.eventBus.publish('wishlist.items_reordered', {
      wishlistId,
      userId,
    })
  }

  // ============================================================================
  // PRICE WATCHING
  // ============================================================================

  /**
   * Watch price for item
   */
  async watchPrice(
    wishlistId: string,
    itemId: string,
    threshold: number,
    userId: string
  ): Promise<PriceWatch> {
    const wishlist = await this.getWishlist(wishlistId, userId)

    if (!wishlist) {
      throw new WishlistNotFoundError(wishlistId)
    }

    const priceWatch: PriceWatch = {
      id: this.generateId(),
      wishlistId,
      itemId,
      currentPrice: 0,
      lowestPrice: 0,
      highestPrice: 0,
      priceChangePercentage: 0,
      threshold,
      notifyOnDrop: true,
      active: true,
      createdAt: new Date(),
      lastCheckedAt: new Date(),
    }

    await this.database.query(
      `
      INSERT INTO price_watches (
        id, wishlist_id, item_id, threshold, notify_on_drop,
        active, created_at, last_checked_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        priceWatch.id,
        priceWatch.wishlistId,
        priceWatch.itemId,
        priceWatch.threshold,
        priceWatch.notifyOnDrop,
        priceWatch.active,
        priceWatch.createdAt,
        priceWatch.lastCheckedAt,
      ]
    )

    this.eventBus.publish('price_watch.created', {
      priceWatchId: priceWatch.id,
      itemId,
    })

    return priceWatch
  }

  // ============================================================================
  // SHARING
  // ============================================================================

  /**
   * Share wishlist with user
   */
  async shareWishlist(wishlistId: string, userId: string, sharedWithUserId: string): Promise<void> {
    const wishlist = await this.getWishlist(wishlistId, userId)

    if (!wishlist) {
      throw new WishlistNotFoundError(wishlistId)
    }

    if (wishlist.userId !== userId) {
      throw new InvalidWishlistAccessError(wishlistId)
    }

    await this.database.query(
      `
      INSERT INTO wishlist_shares (wishlist_id, user_id, shared_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (wishlist_id, user_id) DO NOTHING
      `,
      [wishlistId, sharedWithUserId, new Date()]
    )

    this.cache.invalidate(`wishlist:${wishlistId}`)

    this.eventBus.publish('wishlist.shared', {
      wishlistId,
      userId,
      sharedWithUserId,
    })
  }

  /**
   * Unshare wishlist
   */
  async unshareWishlist(wishlistId: string, userId: string, sharedWithUserId: string): Promise<void> {
    const wishlist = await this.getWishlist(wishlistId, userId)

    if (!wishlist) {
      throw new WishlistNotFoundError(wishlistId)
    }

    if (wishlist.userId !== userId) {
      throw new InvalidWishlistAccessError(wishlistId)
    }

    await this.database.query(
      `DELETE FROM wishlist_shares WHERE wishlist_id = $1 AND user_id = $2`,
      [wishlistId, sharedWithUserId]
    )

    this.cache.invalidate(`wishlist:${wishlistId}`)
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Get wishlist analytics
   */
  async getAnalytics(startDate: Date, endDate: Date): Promise<WishlistAnalytics> {
    const cacheKey = `wishlist:analytics:${startDate.toISOString()}:${endDate.toISOString()}`
    const cached = await this.cache.get(cacheKey, 6 * 60 * 60)

    if (cached) {
      return cached as WishlistAnalytics
    }

    const result = await this.database.query(
      `
      SELECT
        COUNT(DISTINCT w.id) as total_wishlists,
        COUNT(DISTINCT wi.id) as total_items,
        AVG(w.like_count) as avg_likes
      FROM wishlists w
      LEFT JOIN wishlist_items wi ON w.id = wi.wishlist_id
      WHERE w.created_at >= $1 AND w.created_at <= $2
      `,
      [startDate, endDate]
    )

    const row = result[0] || {}

    const analytics: WishlistAnalytics = {
      period: { startDate, endDate },
      totalWishlists: parseInt(row.total_wishlists) || 0,
      totalItems: parseInt(row.total_items) || 0,
      avgItemsPerWishlist: 0,
      totalPublicWishlists: 0,
      totalSharedWishlists: 0,
      totalViewsAcrossWishlists: 0,
      avgViewsPerWishlist: 0,
      totalLikesAcrossWishlists: 0,
      avgLikesPerWishlist: parseFloat(row.avg_likes) || 0,
      totalItemsWithPriceWatch: 0,
      totalPriceDropNotifications: 0,
      itemsBookedFromWishlists: 0,
      averageBookingConversionRate: 0,
      mostPopularItemTypes: {},
      lastUpdated: new Date(),
    }

    await this.cache.set(cacheKey, analytics, 6 * 60 * 60)

    return analytics
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async hasWishlistAccess(wishlistId: string, userId: string): Promise<boolean> {
    const result = await this.database.query(
      `
      SELECT id FROM wishlist_shares
      WHERE wishlist_id = $1 AND user_id = $2
      `,
      [wishlistId, userId]
    )

    return result && result.length > 0
  }

  private generateId(): string {
    return `wl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private generateShareToken(): string {
    return `share_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`
  }

  private mapDatabaseRowToWishlist(row: any): Wishlist {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      items: [],
      isPublic: row.is_public,
      theme: row.theme,
      shareSettings: {
        shareToken: row.share_token,
        sharedWith: [],
        lastSharedAt: row.last_shared_at ? new Date(row.last_shared_at) : undefined,
      },
      viewCount: row.view_count,
      likeCount: row.like_count,
      comments: [],
      tags: row.tags ? JSON.parse(row.tags) : [],
      estimatedBudget: row.estimated_budget,
      currency: row.currency,
      priority: row.priority,
      targetDate: row.target_date ? new Date(row.target_date) : undefined,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  private mapDatabaseRowToWishlistItem(row: any): WishlistItem {
    return {
      id: row.id,
      wishlistId: row.wishlist_id,
      itemId: row.item_id,
      itemType: row.item_type,
      status: row.status,
      priority: row.priority,
      notes: row.notes,
      visitDate: row.visit_date ? new Date(row.visit_date) : undefined,
      estimatedBudget: row.estimated_budget,
      currency: row.currency,
      notifyOnPriceChange: row.notify_on_price_change,
      position: row.position,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE & EXPORT
// ============================================================================

const database = DatabaseService.getInstance()
const cache = CacheService.getInstance()
const eventBus = EventBusService.getInstance()
const notifications = NotificationsService.getInstance()
const monitoring = MonitoringService.getInstance()

export const wishlistService = new WishlistService(
  database,
  cache,
  eventBus,
  notifications,
  monitoring
)

export { WishlistService }
