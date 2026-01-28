/**
 * TourService - Discovery Pillar
 * Основной сервис для управления турами
 * Integrates: Database, Cache, Monitoring, EventBus, Notifications
 */

import { 
  databaseService, 
  DatabaseService 
} from '@core-infrastructure/lib/database';
import { 
  cacheService, 
  CacheService 
} from '@core-infrastructure/lib/cache';
import { 
  monitoringService, 
  MonitoringService 
} from '@core-infrastructure/lib/monitoring';
import { 
  eventBusService, 
  EventBusService 
} from '@core-infrastructure/lib/eventbus';
import { 
  notificationsService, 
  NotificationsService 
} from '@core-infrastructure/lib/notifications';

import {
  Tour,
  TourCreate,
  TourUpdate,
  TourFilters,
  TourSearchParams,
  TourSearchResult,
  TourStats,
  TourNotFoundError,
  TourValidationError,
  TourAlreadyPublishedError,
} from '../types';

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class TourService {
  private static instance: TourService;
  private readonly cachePrefix = 'tour:';
  private readonly cacheTTL = 3600; // 1 hour

  private constructor(
    private db: DatabaseService,
    private cache: CacheService,
    private monitoring: MonitoringService,
    private eventBus: EventBusService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Получить singleton инстанс TourService
   */
  static getInstance(): TourService {
    if (!TourService.instance) {
      TourService.instance = new TourService(
        databaseService,
        cacheService,
        monitoringService,
        eventBusService,
        notificationsService,
      );
    }
    return TourService.instance;
  }

  // ========================================================================
  // CRUD ОПЕРАЦИИ
  // ========================================================================

  /**
   * Создать новый тур
   */
  async create(data: TourCreate): Promise<Tour> {
    const startTime = Date.now();

    try {
      // Валидация
      this.validateTourCreate(data);

      // Сохранение в БД
      const tour = await this.db.query(
        `INSERT INTO tours (
          title, description, short_description,
          activity, difficulty, tags,
          duration, meeting_point, meeting_time,
          min_participants, max_participants,
          price_from, price_to, currency,
          equipment_included, equipment_required,
          weather_requirements, safety_requirements,
          images, status, is_active, operator_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24
        ) RETURNING *`,
        [
          data.title,
          data.description,
          data.shortDescription || null,
          data.activity,
          data.difficulty,
          JSON.stringify(data.tags || []),
          data.duration,
          data.meetingPoint,
          data.meetingTime,
          data.minParticipants,
          data.maxParticipants,
          data.priceFrom,
          data.priceTo || null,
          data.currency || 'RUB',
          JSON.stringify(data.equipmentIncluded || []),
          JSON.stringify(data.equipmentRequired || []),
          JSON.stringify(data.weatherRequirements || []),
          JSON.stringify(data.safetyRequirements || []),
          JSON.stringify(data.images || []),
          'draft',
          true,
          data.operatorId,
          new Date(),
          new Date(),
        ]
      );

      const createdTour = tour.rows[0];
      const mappedTour = this.mapTourFromDB(createdTour);

      // Логирование
      this.monitoring.log('info', `Tour created: ${mappedTour.id}`, {
        tourId: mappedTour.id,
        operatorId: data.operatorId,
      });

      // Публикация события
      this.eventBus.publish('tour.created', {
        tourId: mappedTour.id,
        operatorId: data.operatorId,
        title: mappedTour.title,
        activity: mappedTour.activity,
        timestamp: new Date(),
      });

      // Метрики
      this.monitoring.recordMetric('tour.create', Date.now() - startTime);

      return mappedTour;
    } catch (error) {
      this.monitoring.log('error', 'Failed to create tour', { error });
      throw error;
    }
  }

  /**
   * Получить тур по ID
   */
  async read(id: string): Promise<Tour> {
    const startTime = Date.now();

    try {
      // Проверка кеша
      const cacheKey = `${this.cachePrefix}${id}`;
      const cached = await this.cache.get<Tour>(cacheKey);
      if (cached) {
        this.monitoring.recordMetric('tour.cache.hit', 1);
        return cached;
      }

      // Получение из БД
      const result = await this.db.query(
        `SELECT t.*, 
                COUNT(r.id) as reviews_count,
                AVG(r.rating)::float as rating
         FROM tours t
         LEFT JOIN reviews r ON t.id = r.tour_id AND r.status = 'approved'
         WHERE t.id = $1
         GROUP BY t.id`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TourNotFoundError(id);
      }

      const tour = this.mapTourFromDB(result.rows[0]);

      // Кеширование
      await this.cache.set(cacheKey, tour, this.cacheTTL);

      // Метрики
      this.monitoring.recordMetric('tour.read', Date.now() - startTime);

      return tour;
    } catch (error) {
      this.monitoring.log('error', 'Failed to read tour', { tourId: id, error });
      throw error;
    }
  }

  /**
   * Обновить тур
   */
  async update(id: string, data: TourUpdate): Promise<Tour> {
    const startTime = Date.now();

    try {
      // Проверка существования
      await this.read(id);

      // Построение динамического запроса
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.title) {
        updates.push(`title = $${paramCount++}`);
        values.push(data.title);
      }
      if (data.description) {
        updates.push(`description = $${paramCount++}`);
        values.push(data.description);
      }
      if (data.activity) {
        updates.push(`activity = $${paramCount++}`);
        values.push(data.activity);
      }
      if (data.difficulty) {
        updates.push(`difficulty = $${paramCount++}`);
        values.push(data.difficulty);
      }
      if (data.priceFrom) {
        updates.push(`price_from = $${paramCount++}`);
        values.push(data.priceFrom);
      }
      if (data.duration) {
        updates.push(`duration = $${paramCount++}`);
        values.push(data.duration);
      }
      if (data.minParticipants) {
        updates.push(`min_participants = $${paramCount++}`);
        values.push(data.minParticipants);
      }
      if (data.maxParticipants) {
        updates.push(`max_participants = $${paramCount++}`);
        values.push(data.maxParticipants);
      }
      if (data.images) {
        updates.push(`images = $${paramCount++}`);
        values.push(JSON.stringify(data.images));
      }
      if (data.isActive !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(data.isActive);
      }

      updates.push(`updated_at = $${paramCount++}`);
      values.push(new Date());

      values.push(id);

      const result = await this.db.query(
        `UPDATE tours
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );

      const updatedTour = this.mapTourFromDB(result.rows[0]);

      // Инвалидировать кеш
      const cacheKey = `${this.cachePrefix}${id}`;
      await this.cache.delete(cacheKey);

      // Логирование
      this.monitoring.log('info', `Tour updated: ${id}`, { tourId: id });

      // Публикация события
      this.eventBus.publish('tour.updated', {
        tourId: id,
        title: updatedTour.title,
        timestamp: new Date(),
      });

      // Метрики
      this.monitoring.recordMetric('tour.update', Date.now() - startTime);

      return updatedTour;
    } catch (error) {
      this.monitoring.log('error', 'Failed to update tour', { tourId: id, error });
      throw error;
    }
  }

  /**
   * Удалить тур
   */
  async delete(id: string): Promise<boolean> {
    const startTime = Date.now();

    try {
      // Проверка существования
      await this.read(id);

      // Удаление из БД
      const result = await this.db.query(
        `DELETE FROM tours WHERE id = $1 RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TourNotFoundError(id);
      }

      // Инвалидировать кеш
      const cacheKey = `${this.cachePrefix}${id}`;
      await this.cache.delete(cacheKey);

      // Логирование
      this.monitoring.log('info', `Tour deleted: ${id}`, { tourId: id });

      // Публикация события
      this.eventBus.publish('tour.deleted', {
        tourId: id,
        timestamp: new Date(),
      });

      // Метрики
      this.monitoring.recordMetric('tour.delete', Date.now() - startTime);

      return true;
    } catch (error) {
      this.monitoring.log('error', 'Failed to delete tour', { tourId: id, error });
      throw error;
    }
  }

  // ========================================================================
  // ПОИСК И ФИЛЬТРАЦИЯ
  // ========================================================================

  /**
   * Искать туры с фильтрами
   */
  async search(params: TourSearchParams): Promise<TourSearchResult> {
    const startTime = Date.now();

    try {
      const {
        query = '',
        filters = {},
        sortBy = 'rating',
        sortOrder = 'desc',
        limit = 20,
        offset = 0,
      } = params;

      // Построение WHERE условий
      const conditions: string[] = ['t.status = \'published\'', 't.is_active = true'];
      const values: any[] = [];
      let paramCount = 1;

      // Полнотекстовый поиск
      if (query) {
        conditions.push(
          `(t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`
        );
        values.push(`%${query}%`);
        paramCount++;
      }

      // Фильтры
      if (filters.activity) {
        conditions.push(`t.activity = $${paramCount}`);
        values.push(filters.activity);
        paramCount++;
      }

      if (filters.difficulty) {
        conditions.push(`t.difficulty = $${paramCount}`);
        values.push(filters.difficulty);
        paramCount++;
      }

      if (filters.minPrice) {
        conditions.push(`t.price_from >= $${paramCount}`);
        values.push(filters.minPrice);
        paramCount++;
      }

      if (filters.maxPrice) {
        conditions.push(`t.price_from <= $${paramCount}`);
        values.push(filters.maxPrice);
        paramCount++;
      }

      if (filters.minDuration) {
        conditions.push(`t.duration >= $${paramCount}`);
        values.push(filters.minDuration);
        paramCount++;
      }

      if (filters.maxDuration) {
        conditions.push(`t.duration <= $${paramCount}`);
        values.push(filters.maxDuration);
        paramCount++;
      }

      if (filters.rating) {
        conditions.push(`COALESCE(AVG(r.rating), 0) >= $${paramCount}`);
        values.push(filters.rating);
        paramCount++;
      }

      // Построение ORDER BY
      const orderByMap: Record<string, string> = {
        'rating': 'AVG(r.rating) DESC NULLS LAST',
        'price': 't.price_from ASC',
        'duration': 't.duration ASC',
        'newest': 't.created_at DESC',
        'popular': 't.view_count DESC NULLS LAST',
      };

      const orderBy = orderByMap[sortBy] || 'AVG(r.rating) DESC NULLS LAST';

      // Получение общего количества
      const countResult = await this.db.query(
        `SELECT COUNT(DISTINCT t.id) as total
         FROM tours t
         LEFT JOIN reviews r ON t.id = r.tour_id AND r.status = 'approved'
         WHERE ${conditions.join(' AND ')}`
        ,
        values
      );

      const total = parseInt(countResult.rows[0]?.total || '0');

      // Получение туров
      values.push(limit);
      values.push(offset);

      const result = await this.db.query(
        `SELECT t.*,
                COUNT(DISTINCT r.id) as reviews_count,
                AVG(r.rating)::float as rating
         FROM tours t
         LEFT JOIN reviews r ON t.id = r.tour_id AND r.status = 'approved'
         WHERE ${conditions.join(' AND ')}
         GROUP BY t.id
         ORDER BY ${orderBy}
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        values
      );

      const tours = result.rows.map(row => this.mapTourFromDB(row));

      // Метрики
      this.monitoring.recordMetric('tour.search', Date.now() - startTime);
      this.monitoring.log('info', 'Tour search executed', {
        query,
        resultsCount: tours.length,
        duration: Date.now() - startTime,
      });

      return {
        tours,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      this.monitoring.log('error', 'Failed to search tours', { params, error });
      throw error;
    }
  }

  // ========================================================================
  // ПУБЛИКАЦИЯ
  // ========================================================================

  /**
   * Опубликовать тур
   */
  async publish(id: string): Promise<Tour> {
    try {
      const tour = await this.read(id);

      if (tour.status === 'published') {
        throw new TourAlreadyPublishedError(id);
      }

      const result = await this.db.query(
        `UPDATE tours
         SET status = 'published', published_at = NOW(), updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      const publishedTour = this.mapTourFromDB(result.rows[0]);

      // Инвалидировать кеш
      const cacheKey = `${this.cachePrefix}${id}`;
      await this.cache.delete(cacheKey);

      // Логирование
      this.monitoring.log('info', `Tour published: ${id}`, { tourId: id });

      // Публикация события
      this.eventBus.publish('tour.published', {
        tourId: id,
        operatorId: tour.operatorId,
        title: tour.title,
        status: 'published',
        timestamp: new Date(),
      });

      // Отправить уведомление оператору
      await this.notifications.send({
        userId: tour.operatorId,
        type: 'email',
        subject: 'Ваш тур опубликован!',
        body: `Тур "${tour.title}" успешно опубликован и доступен для бронирования.`,
      });

      return publishedTour;
    } catch (error) {
      this.monitoring.log('error', 'Failed to publish tour', { tourId: id, error });
      throw error;
    }
  }

  /**
   * Снять тур с публикации
   */
  async unpublish(id: string): Promise<Tour> {
    try {
      const tour = await this.read(id);

      const result = await this.db.query(
        `UPDATE tours
         SET status = 'draft', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      const unpublishedTour = this.mapTourFromDB(result.rows[0]);

      // Инвалидировать кеш
      const cacheKey = `${this.cachePrefix}${id}`;
      await this.cache.delete(cacheKey);

      // Логирование
      this.monitoring.log('info', `Tour unpublished: ${id}`, { tourId: id });

      // Публикация события
      this.eventBus.publish('tour.unpublished', {
        tourId: id,
        operatorId: tour.operatorId,
        title: tour.title,
        timestamp: new Date(),
      });

      return unpublishedTour;
    } catch (error) {
      this.monitoring.log('error', 'Failed to unpublish tour', { tourId: id, error });
      throw error;
    }
  }

  // ========================================================================
  // РЕЙТИНГИ И СТАТИСТИКА
  // ========================================================================

  /**
   * Обновить рейтинг тура
   */
  async updateRating(id: string): Promise<void> {
    try {
      const result = await this.db.query(
        `SELECT AVG(rating)::float as avg_rating, COUNT(*) as count
         FROM reviews
         WHERE tour_id = $1 AND status = 'approved'`,
        [id]
      );

      const avgRating = result.rows[0]?.avg_rating || 0;
      const count = parseInt(result.rows[0]?.count || '0');

      await this.db.query(
        `UPDATE tours
         SET rating = $1, reviews_count = $2, updated_at = NOW()
         WHERE id = $3`,
        [avgRating, count, id]
      );

      // Инвалидировать кеш
      const cacheKey = `${this.cachePrefix}${id}`;
      await this.cache.delete(cacheKey);

      this.monitoring.log('info', `Tour rating updated: ${id}`, {
        tourId: id,
        rating: avgRating,
      });
    } catch (error) {
      this.monitoring.log('error', 'Failed to update tour rating', {
        tourId: id,
        error,
      });
    }
  }

  /**
   * Получить статистику тура
   */
  async getStats(id: string): Promise<TourStats> {
    try {
      const result = await this.db.query(
        `SELECT 
          COUNT(DISTINCT b.id)::int as total_bookings,
          COALESCE(SUM(b.total_price), 0)::float as total_revenue,
          COALESCE(AVG(r.rating), 0)::float as avg_rating,
          COUNT(DISTINCT r.id)::int as total_reviews,
          COALESCE(t.view_count, 0)::int as view_count
         FROM tours t
         LEFT JOIN bookings b ON t.id = b.tour_id AND b.payment_status = 'paid'
         LEFT JOIN reviews r ON t.id = r.tour_id AND r.status = 'approved'
         WHERE t.id = $1
         GROUP BY t.id, t.view_count`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TourNotFoundError(id);
      }

      const row = result.rows[0];
      const conversionRate =
        row.view_count > 0
          ? Math.round((row.total_bookings / row.view_count) * 100) / 100
          : 0;

      return {
        tourId: id,
        totalBookings: row.total_bookings,
        totalRevenue: row.total_revenue,
        averageRating: row.avg_rating,
        totalReviews: row.total_reviews,
        viewCount: row.view_count,
        conversionRate,
      };
    } catch (error) {
      this.monitoring.log('error', 'Failed to get tour stats', {
        tourId: id,
        error,
      });
      throw error;
    }
  }

  // ========================================================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // ========================================================================

  /**
   * Валидация данных при создании тура
   */
  private validateTourCreate(data: TourCreate): void {
    if (!data.title || data.title.trim().length === 0) {
      throw new TourValidationError('Название тура не может быть пустым');
    }

    if (!data.description || data.description.trim().length === 0) {
      throw new TourValidationError('Описание тура не может быть пустым');
    }

    if (data.duration <= 0) {
      throw new TourValidationError('Длительность тура должна быть больше 0');
    }

    if (data.priceFrom <= 0) {
      throw new TourValidationError('Цена не может быть меньше или равна 0');
    }

    if (data.minParticipants <= 0) {
      throw new TourValidationError('Минимальное количество участников должно быть больше 0');
    }

    if (data.maxParticipants < data.minParticipants) {
      throw new TourValidationError(
        'Максимальное количество участников не может быть меньше минимального'
      );
    }
  }

  /**
   * Маппинг данных из БД в Tour объект
   */
  private mapTourFromDB(row: any): Tour {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      shortDescription: row.short_description,
      activity: row.activity,
      difficulty: row.difficulty,
      tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]'),
      duration: row.duration,
      meetingPoint: row.meeting_point,
      meetingTime: row.meeting_time,
      minParticipants: row.min_participants,
      maxParticipants: row.max_participants,
      priceFrom: row.price_from,
      priceTo: row.price_to,
      currency: row.currency || 'RUB',
      equipmentIncluded: Array.isArray(row.equipment_included)
        ? row.equipment_included
        : JSON.parse(row.equipment_included || '[]'),
      equipmentRequired: Array.isArray(row.equipment_required)
        ? row.equipment_required
        : JSON.parse(row.equipment_required || '[]'),
      weatherRequirements: Array.isArray(row.weather_requirements)
        ? row.weather_requirements
        : JSON.parse(row.weather_requirements || '[]'),
      safetyRequirements: Array.isArray(row.safety_requirements)
        ? row.safety_requirements
        : JSON.parse(row.safety_requirements || '[]'),
      rating: row.rating || 0,
      reviewsCount: row.reviews_count || 0,
      status: row.status,
      isActive: row.is_active,
      operatorId: row.operator_id,
      operatorName: row.operator_name || 'Unknown',
      operatorRating: row.operator_rating || 0,
      operatorEmail: row.operator_email || '',
      images: Array.isArray(row.images) ? row.images : JSON.parse(row.images || '[]'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      publishedAt: row.published_at ? new Date(row.published_at) : undefined,
      viewCount: row.view_count || 0,
    };
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const tourService = TourService.getInstance();
