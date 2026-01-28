/**
 * Partner Service
 * Manages partner onboarding, lifecycle, account management, and tier system
 */

import { DatabaseService } from '@/pillars/core-infrastructure-infrastructure/services/database.service'
import { CacheService } from '@/pillars/core-infrastructure-infrastructure/services/cache.service'
import { EventBusService } from '@/pillars/core-infrastructure-infrastructure/services/event-bus.service'
import { MonitoringService } from '@/pillars/core-infrastructure-infrastructure/services/monitoring.service'
import {
  Partner,
  PartnerStatus,
  PartnerType,
  PartnerTier,
  PartnerError,
  PartnerNotFoundError,
  InvalidPartnerStatusError,
  CreatePartnerDTO,
  UpdatePartnerDTO,
  PartnerFilter,
  PartnerListResponse,
} from '../types'

export class PartnerService {
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
   * Create new partner
   */
  async createPartner(data: CreatePartnerDTO): Promise<Partner> {
    const startTime = Date.now()

    try {
      // Validate input
      this.validatePartnerInput(data)

      // Check if email already exists
      const existing = await this.database.query(
        `SELECT id FROM partners WHERE LOWER(contact_email) = LOWER($1)`,
        [data.contactEmail]
      )

      if (existing.rows.length > 0) {
        throw new PartnerError('Email already registered', 'PARTNER_EMAIL_EXISTS')
      }

      // Create partner
      const result = await this.database.query(
        `INSERT INTO partners (
          company_name, contact_email, contact_phone, contact_name,
          type, tier, website, description, address, city, state, country, postal_code,
          status, commission_percentage, min_payout_amount, payout_frequency,
          total_commission_earned, total_commission_paid, total_bookings, total_revenue,
          partner_since, last_active_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING *`,
        [
          data.companyName,
          data.contactEmail,
          data.contactPhone,
          data.contactName,
          data.type,
          data.tier || PartnerTier.BRONZE,
          data.website || null,
          data.description || null,
          data.address || null,
          data.city || null,
          data.state || null,
          data.country || null,
          data.postalCode || null,
          PartnerStatus.PENDING,
          0,
          data.minPayoutAmount || 100,
          data.payoutFrequency || 'MONTHLY',
          0,
          0,
          0,
          0,
          new Date(),
          new Date(),
          new Date(),
          new Date(),
        ]
      )

      const partner = this.formatPartner(result.rows[0])

      // Cache partner
      await this.cache.set(`partner:${partner.id}`, partner, 3600)

      // Publish event
      this.eventBus.publish('partner.created', {
        partnerId: partner.id,
        email: partner.contactEmail,
        type: partner.type,
        timestamp: new Date(),
      })

      // Track metrics
      this.monitoring.trackEvent('partner_created', {
        partnerId: partner.id,
        type: partner.type,
        tier: partner.tier,
      })

      return partner
    } catch (error) {
      this.monitoring.error('Failed to create partner', { error })
      throw error
    } finally {
      this.monitoring.trackDuration('partner.create', Date.now() - startTime)
    }
  }

  /**
   * Get partner by ID
   */
  async getPartner(partnerId: string): Promise<Partner> {
    const startTime = Date.now()

    try {
      // Check cache
      const cached = await this.cache.get(`partner:${partnerId}`)
      if (cached) {
        return cached as Partner
      }

      // Query database
      const result = await this.database.query(`SELECT * FROM partners WHERE id = $1`, [
        partnerId,
      ])

      if (result.rows.length === 0) {
        throw new PartnerNotFoundError(partnerId)
      }

      const partner = this.formatPartner(result.rows[0])

      // Cache partner
      await this.cache.set(`partner:${partnerId}`, partner, 3600)

      return partner
    } catch (error) {
      this.monitoring.error('Failed to get partner', { partnerId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('partner.get', Date.now() - startTime)
    }
  }

  /**
   * Update partner
   */
  async updatePartner(partnerId: string, data: UpdatePartnerDTO): Promise<Partner> {
    const startTime = Date.now()

    try {
      // Get existing partner
      const partner = await this.getPartner(partnerId)

      // Build update query
      const updates: string[] = []
      const values: any[] = []
      let paramIndex = 1

      if (data.companyName) {
        updates.push(`company_name = $${paramIndex++}`)
        values.push(data.companyName)
      }
      if (data.contactEmail) {
        updates.push(`contact_email = $${paramIndex++}`)
        values.push(data.contactEmail)
      }
      if (data.contactPhone) {
        updates.push(`contact_phone = $${paramIndex++}`)
        values.push(data.contactPhone)
      }
      if (data.website) {
        updates.push(`website = $${paramIndex++}`)
        values.push(data.website)
      }
      if (data.tier) {
        updates.push(`tier = $${paramIndex++}`)
        values.push(data.tier)
      }
      if (data.status) {
        updates.push(`status = $${paramIndex++}`)
        values.push(data.status)
      }

      updates.push(`updated_at = $${paramIndex++}`)
      values.push(new Date())
      values.push(partnerId)

      // Execute update
      const result = await this.database.query(
        `UPDATE partners SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      )

      const updated = this.formatPartner(result.rows[0])

      // Invalidate cache
      await this.cache.delete(`partner:${partnerId}`)

      // Publish event
      this.eventBus.publish('partner.updated', {
        partnerId: partner.id,
        changes: data,
        timestamp: new Date(),
      })

      return updated
    } catch (error) {
      this.monitoring.error('Failed to update partner', { partnerId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('partner.update', Date.now() - startTime)
    }
  }

  /**
   * List partners with filtering
   */
  async listPartners(filter: PartnerFilter): Promise<PartnerListResponse> {
    const startTime = Date.now()

    try {
      const page = filter.page || 1
      const limit = filter.limit || 20
      const offset = (page - 1) * limit

      let query = `SELECT * FROM partners WHERE 1=1`
      const values: any[] = []
      let paramIndex = 1

      if (filter.status) {
        query += ` AND status = $${paramIndex++}`
        values.push(filter.status)
      }

      if (filter.type) {
        query += ` AND type = $${paramIndex++}`
        values.push(filter.type)
      }

      if (filter.tier) {
        query += ` AND tier = $${paramIndex++}`
        values.push(filter.tier)
      }

      if (filter.country) {
        query += ` AND country = $${paramIndex++}`
        values.push(filter.country)
      }

      if (filter.minRevenue) {
        query += ` AND total_revenue >= $${paramIndex++}`
        values.push(filter.minRevenue)
      }

      if (filter.maxRevenue) {
        query += ` AND total_revenue <= $${paramIndex++}`
        values.push(filter.maxRevenue)
      }

      if (filter.search) {
        query += ` AND (company_name ILIKE $${paramIndex++} OR contact_email ILIKE $${paramIndex++})`
        const searchTerm = `%${filter.search}%`
        values.push(searchTerm)
        values.push(searchTerm)
      }

      // Get total count
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

      // Execute query
      const result = await this.database.query(query, values)

      return {
        success: true,
        data: result.rows.map((row: any) => this.formatPartner(row)),
        total,
        page,
        limit,
      }
    } catch (error) {
      this.monitoring.error('Failed to list partners', { filter, error })
      throw error
    } finally {
      this.monitoring.trackDuration('partner.list', Date.now() - startTime)
    }
  }

  /**
   * Update partner tier based on performance
   */
  async updatePartnerTier(partnerId: string): Promise<Partner> {
    const startTime = Date.now()

    try {
      const partner = await this.getPartner(partnerId)

      // Calculate tier based on total bookings and revenue
      let newTier = PartnerTier.BRONZE

      if (partner.totalRevenue >= 100000 && partner.totalBookings >= 500) {
        newTier = PartnerTier.PLATINUM
      } else if (partner.totalRevenue >= 50000 && partner.totalBookings >= 250) {
        newTier = PartnerTier.GOLD
      } else if (partner.totalRevenue >= 20000 && partner.totalBookings >= 100) {
        newTier = PartnerTier.SILVER
      }

      if (newTier !== partner.tier) {
        const updated = await this.updatePartner(partnerId, { tier: newTier })

        this.eventBus.publish('partner.tier_updated', {
          partnerId,
          previousTier: partner.tier,
          newTier,
          reason: 'performance_based',
          timestamp: new Date(),
        })

        return updated
      }

      return partner
    } catch (error) {
      this.monitoring.error('Failed to update partner tier', { partnerId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('partner.update_tier', Date.now() - startTime)
    }
  }

  /**
   * Activate partner
   */
  async activatePartner(partnerId: string): Promise<Partner> {
    const startTime = Date.now()

    try {
      const partner = await this.getPartner(partnerId)

      if (partner.status === PartnerStatus.ACTIVE) {
        return partner
      }

      const updated = await this.updatePartner(partnerId, {
        status: PartnerStatus.ACTIVE,
      })

      this.eventBus.publish('partner.activated', {
        partnerId,
        previousStatus: partner.status,
        timestamp: new Date(),
      })

      this.monitoring.trackEvent('partner_activated', { partnerId })

      return updated
    } catch (error) {
      this.monitoring.error('Failed to activate partner', { partnerId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('partner.activate', Date.now() - startTime)
    }
  }

  /**
   * Suspend partner
   */
  async suspendPartner(partnerId: string, reason: string): Promise<Partner> {
    const startTime = Date.now()

    try {
      const partner = await this.getPartner(partnerId)

      if (partner.status === PartnerStatus.SUSPENDED) {
        return partner
      }

      if (![PartnerStatus.ACTIVE].includes(partner.status)) {
        throw new InvalidPartnerStatusError(partner.status, PartnerStatus.SUSPENDED)
      }

      const updated = await this.updatePartner(partnerId, {
        status: PartnerStatus.SUSPENDED,
      })

      this.eventBus.publish('partner.suspended', {
        partnerId,
        reason,
        previousStatus: partner.status,
        timestamp: new Date(),
      })

      this.monitoring.trackEvent('partner_suspended', { partnerId, reason })

      return updated
    } catch (error) {
      this.monitoring.error('Failed to suspend partner', { partnerId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('partner.suspend', Date.now() - startTime)
    }
  }

  /**
   * Helper methods
   */

  private validatePartnerInput(data: CreatePartnerDTO): void {
    if (!data.companyName || data.companyName.trim().length === 0) {
      throw new PartnerError('Company name is required', 'INVALID_INPUT')
    }

    if (!data.contactEmail || !this.isValidEmail(data.contactEmail)) {
      throw new PartnerError('Valid email is required', 'INVALID_EMAIL')
    }

    if (!data.contactPhone || data.contactPhone.trim().length === 0) {
      throw new PartnerError('Contact phone is required', 'INVALID_INPUT')
    }

    if (!data.contactName || data.contactName.trim().length === 0) {
      throw new PartnerError('Contact name is required', 'INVALID_INPUT')
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private getSortColumn(sortBy: string): string {
    const mapping: Record<string, string> = {
      revenue: 'total_revenue',
      bookings: 'total_bookings',
      commission: 'total_commission_earned',
      createdAt: 'created_at',
    }
    return mapping[sortBy] || 'created_at'
  }

  private formatPartner(row: any): Partner {
    return {
      id: row.id,
      companyName: row.company_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      contactName: row.contact_name,
      legalName: row.legal_name,
      registrationNumber: row.registration_number,
      taxId: row.tax_id,
      status: row.status,
      type: row.type,
      tier: row.tier,
      website: row.website,
      description: row.description,
      logoUrl: row.logo_url,
      coverImageUrl: row.cover_image_url,
      address: row.address,
      city: row.city,
      state: row.state,
      country: row.country,
      postalCode: row.postal_code,
      commissionPercentage: row.commission_percentage,
      minPayoutAmount: row.min_payout_amount,
      payoutFrequency: row.payout_frequency,
      lastPayoutDate: row.last_payout_date ? new Date(row.last_payout_date) : undefined,
      totalCommissionEarned: row.total_commission_earned,
      totalCommissionPaid: row.total_commission_paid,
      totalBookings: row.total_bookings,
      totalRevenue: row.total_revenue,
      partnerSince: new Date(row.partner_since),
      lastActiveDate: new Date(row.last_active_date),
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

export const partnerService = new PartnerService(database, cache, eventBus, monitoring)
