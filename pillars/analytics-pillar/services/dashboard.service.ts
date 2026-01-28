/**
 * Dashboard Service
 * Manages dashboards, widgets, and visualizations
 */

import { DatabaseService } from '@core-infrastructure/services/database.service'
import { CacheService } from '@core-infrastructure/services/cache.service'
import { EventBusService } from '@core-infrastructure/services/event-bus.service'
import { MonitoringService } from '@core-infrastructure/services/monitoring.service'
import {
  Dashboard,
  DashboardWidget,
  DashboardNotFoundError,
  AnalyticsError,
} from '../types'

export class DashboardService {
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
   * Create dashboard
   */
  async createDashboard(data: Partial<Dashboard>, ownerId: string): Promise<Dashboard> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `INSERT INTO dashboards (
          name, description, type, owner, refresh_interval, is_public, widgets, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          data.name,
          data.description || null,
          data.type || 'CUSTOM',
          ownerId,
          data.refreshInterval || 300000,
          data.isPublic || false,
          JSON.stringify(data.widgets || []),
          new Date(),
          new Date(),
        ]
      )

      const dashboard = this.formatDashboard(result.rows[0])

      await this.cache.set(`dashboard:${dashboard.id}`, dashboard, 3600)

      this.eventBus.publish('dashboard.created', {
        dashboardId: dashboard.id,
        owner: ownerId,
        timestamp: new Date(),
      })

      this.monitoring.trackEvent('dashboard_created', { dashboardId: dashboard.id })

      return dashboard
    } catch (error) {
      this.monitoring.error('Failed to create dashboard', { data, error })
      throw error
    } finally {
      this.monitoring.trackDuration('dashboard.create', Date.now() - startTime)
    }
  }

  /**
   * Get dashboard by ID
   */
  async getDashboard(dashboardId: string): Promise<Dashboard> {
    const startTime = Date.now()

    try {
      const cached = await this.cache.get(`dashboard:${dashboardId}`)
      if (cached) {
        return cached as Dashboard
      }

      const result = await this.database.query(`SELECT * FROM dashboards WHERE id = $1`, [
        dashboardId,
      ])

      if (result.rows.length === 0) {
        throw new DashboardNotFoundError(dashboardId)
      }

      const dashboard = this.formatDashboard(result.rows[0])

      await this.cache.set(`dashboard:${dashboardId}`, dashboard, 3600)

      return dashboard
    } catch (error) {
      this.monitoring.error('Failed to get dashboard', { dashboardId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('dashboard.get', Date.now() - startTime)
    }
  }

  /**
   * Update dashboard
   */
  async updateDashboard(dashboardId: string, data: Partial<Dashboard>): Promise<Dashboard> {
    const startTime = Date.now()

    try {
      const updates: string[] = []
      const values: any[] = []
      let paramIndex = 1

      if (data.name) {
        updates.push(`name = $${paramIndex++}`)
        values.push(data.name)
      }
      if (data.description) {
        updates.push(`description = $${paramIndex++}`)
        values.push(data.description)
      }
      if (data.type) {
        updates.push(`type = $${paramIndex++}`)
        values.push(data.type)
      }
      if (data.widgets) {
        updates.push(`widgets = $${paramIndex++}`)
        values.push(JSON.stringify(data.widgets))
      }
      if (data.refreshInterval) {
        updates.push(`refresh_interval = $${paramIndex++}`)
        values.push(data.refreshInterval)
      }

      updates.push(`updated_at = $${paramIndex++}`)
      values.push(new Date())
      values.push(dashboardId)

      const result = await this.database.query(
        `UPDATE dashboards SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      )

      if (result.rows.length === 0) {
        throw new DashboardNotFoundError(dashboardId)
      }

      const dashboard = this.formatDashboard(result.rows[0])

      await this.cache.delete(`dashboard:${dashboardId}`)

      this.eventBus.publish('dashboard.updated', {
        dashboardId,
        timestamp: new Date(),
      })

      return dashboard
    } catch (error) {
      this.monitoring.error('Failed to update dashboard', { dashboardId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('dashboard.update', Date.now() - startTime)
    }
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(dashboardId: string): Promise<void> {
    const startTime = Date.now()

    try {
      await this.database.query(`DELETE FROM dashboards WHERE id = $1`, [dashboardId])

      await this.cache.delete(`dashboard:${dashboardId}`)

      this.eventBus.publish('dashboard.deleted', {
        dashboardId,
        timestamp: new Date(),
      })

      this.monitoring.trackEvent('dashboard_deleted', { dashboardId })
    } catch (error) {
      this.monitoring.error('Failed to delete dashboard', { dashboardId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('dashboard.delete', Date.now() - startTime)
    }
  }

  /**
   * Add widget to dashboard
   */
  async addWidget(dashboardId: string, widget: DashboardWidget): Promise<Dashboard> {
    const startTime = Date.now()

    try {
      const dashboard = await this.getDashboard(dashboardId)

      const widgets = [...dashboard.widgets, widget]

      return this.updateDashboard(dashboardId, { widgets })
    } catch (error) {
      this.monitoring.error('Failed to add widget', { dashboardId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('dashboard.add_widget', Date.now() - startTime)
    }
  }

  /**
   * Remove widget from dashboard
   */
  async removeWidget(dashboardId: string, widgetId: string): Promise<Dashboard> {
    const startTime = Date.now()

    try {
      const dashboard = await this.getDashboard(dashboardId)

      const widgets = dashboard.widgets.filter((w) => w.id !== widgetId)

      return this.updateDashboard(dashboardId, { widgets })
    } catch (error) {
      this.monitoring.error('Failed to remove widget', { dashboardId, widgetId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('dashboard.remove_widget', Date.now() - startTime)
    }
  }

  /**
   * Get user dashboards
   */
  async getUserDashboards(userId: string): Promise<Dashboard[]> {
    const startTime = Date.now()

    try {
      const result = await this.database.query(
        `SELECT * FROM dashboards WHERE owner = $1 ORDER BY created_at DESC`,
        [userId]
      )

      return result.rows.map((row: any) => this.formatDashboard(row))
    } catch (error) {
      this.monitoring.error('Failed to get user dashboards', { userId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('dashboard.get_user_dashboards', Date.now() - startTime)
    }
  }

  /**
   * Share dashboard with user
   */
  async shareDashboard(
    dashboardId: string,
    userId: string,
    permission: 'VIEW' | 'EDIT' = 'VIEW'
  ): Promise<Dashboard> {
    const startTime = Date.now()

    try {
      const dashboard = await this.getDashboard(dashboardId)

      const sharedWith = dashboard.sharedWith || []
      if (!sharedWith.includes(userId)) {
        sharedWith.push(userId)
      }

      await this.cache.delete(`dashboard:${dashboardId}`)

      return this.updateDashboard(dashboardId, { sharedWith })
    } catch (error) {
      this.monitoring.error('Failed to share dashboard', { dashboardId, userId, error })
      throw error
    } finally {
      this.monitoring.trackDuration('dashboard.share', Date.now() - startTime)
    }
  }

  private formatDashboard(row: any): Dashboard {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      owner: row.owner,
      widgets: row.widgets ? JSON.parse(row.widgets) : [],
      refreshInterval: row.refresh_interval,
      isPublic: row.is_public,
      sharedWith: row.shared_with,
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

export const dashboardService = new DashboardService(database, cache, eventBus, monitoring)
