/**
 * ReviewService - Discovery Pillar
 * Сервис для управления отзывами и модерацией
 */

import {
  databaseService,
  DatabaseService,
} from '@core-infrastructure/lib/database';
import {
  cacheService,
  CacheService,
} from '@core-infrastructure/lib/cache';
import {
  monitoringService,
  MonitoringService,
} from '@core-infrastructure/lib/monitoring';
import {
  eventBusService,
  EventBusService,
} from '@core-infrastructure/lib/eventbus';
import {
  notificationsService,
  NotificationsService,
} from '@core-infrastructure/lib/notifications';

import {
  Review,
  ReviewCreate,
  ReviewUpdate,
  ReviewFilters,
  ReviewSearchParams,
  ReviewSearchResult,
  ReviewStats,
  ReviewAnalytics,
  OperatorRating,
  ModerationAction,
  ReviewNotFoundError,
  ReviewValidationError,
  ReviewAlreadyPublishedError,
  DuplicateReviewError,
} from '../types';

import { tourService } from '../tour/services/TourService';

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class ReviewService {
  private static instance: ReviewService;
  private readonly cachePrefix = 'review:';
  private readonly cacheTTL = 1800; // 30 minutes

  private constructor(
    private db: DatabaseService,
    private cache: CacheService,
    private monitoring: MonitoringService,
    private eventBus: EventBusService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Получить singleton инстанс ReviewService
   */
  static getInstance(): ReviewService {
    if (!ReviewService.instance) {
      ReviewService.instance = new ReviewService(
        databaseService,
        cacheService,
        monitoringService,
        eventBusService,
        notificationsService,
      );
    }
    return ReviewService.instance;
  }

  // ========================================================================
  // CRUD ОПЕРАЦИИ
  // ========================================================================

  /**
   * Создать новый отзыв
   */
  async create(data: ReviewCreate): Promise<Review> {
    const startTime = Date.now();

    try {
      // Валидация
      this.validateReviewCreate(data);

      // Проверка на дубликат
      const existingReview = await this.db.query(
        `SELECT id FROM reviews
         WHERE tour_id = $1 AND user_id = $2`,
        [data.tourId, data.userId]
      );

      if (existingReview.rows.length > 0) {
        throw new DuplicateReviewError(data.userId, data.tourId);
      }

      // Проверка существования тура
      await tourService.read(data.tourId);

      // Сохранение в БД
      const result = await this.db.query(
        `INSERT INTO reviews (
          tour_id, user_id, user_name, user_email, user_avatar,
          rating, title, comment, aspect_ratings,
          highlights, improvements, would_recommend,
          visit_date, status,
          photos, videos,
          is_verified_purchase,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        ) RETURNING *`,
        [
          data.tourId,
          data.userId,
          data.userName,
          data.userEmail,
          data.userAvatar || null,
          data.rating,
          data.title,
          data.comment,
          JSON.stringify(data.aspectRatings || {}),
          JSON.stringify(data.highlights || []),
          JSON.stringify(data.improvements || []),
          data.wouldRecommend,
          data.visitDate,
          'pending', // По умолчанию требуется модерация
          JSON.stringify(data.photos || []),
          JSON.stringify(data.videos || []),
          false, // isVerifiedPurchase - проверяется отдельно
          new Date(),
          new Date(),
        ]
      );

      const createdReview = this.mapReviewFromDB(result.rows[0]);

      // Логирование
      this.monitoring.log('info', `Review created: ${createdReview.id}`, {
        reviewId: createdReview.id,
        tourId: data.tourId,
        rating: data.rating,
      });

      // Публикация события
      this.eventBus.publish('review.created', {
        reviewId: createdReview.id,
        tourId: data.tourId,
        userId: data.userId,
        rating: data.rating,
        timestamp: new Date(),
      });

      // Метрики
      this.monitoring.recordMetric('review.create', Date.now() - startTime);

      return createdReview;
    } catch (error) {
      this.monitoring.log('error', 'Failed to create review', { error });
      throw error;
    }
  }

  /**
   * Получить отзыв по ID
   */
  async read(id: string): Promise<Review> {
    const startTime = Date.now();

    try {
      // Проверка кеша
      const cacheKey = `${this.cachePrefix}${id}`;
      const cached = await this.cache.get<Review>(cacheKey);
      if (cached) {
        this.monitoring.recordMetric('review.cache.hit', 1);
        return cached;
      }

      // Получение из БД
      const result = await this.db.query(
        `SELECT * FROM reviews WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new ReviewNotFoundError(id);
      }

      const review = this.mapReviewFromDB(result.rows[0]);

      // Кеширование
      await this.cache.set(cacheKey, review, this.cacheTTL);

      // Метрики
      this.monitoring.recordMetric('review.read', Date.now() - startTime);

      return review;
    } catch (error) {
      this.monitoring.log('error', 'Failed to read review', {
        reviewId: id,
        error,
      });
      throw error;
    }
  }

  /**
   * Обновить отзыв
   */
  async update(id: string, data: ReviewUpdate): Promise<Review> {
    const startTime = Date.now();

    try {
      // Проверка существования
      const review = await this.read(id);

      if (review.status === 'published' && !data.status) {
        throw new ReviewValidationError('Cannot update published review');
      }

      // Построение динамического запроса
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.rating) {
        updates.push(`rating = $${paramCount++}`);
        values.push(data.rating);
      }
      if (data.title) {
        updates.push(`title = $${paramCount++}`);
        values.push(data.title);
      }
      if (data.comment) {
        updates.push(`comment = $${paramCount++}`);
        values.push(data.comment);
      }
      if (data.aspectRatings) {
        updates.push(`aspect_ratings = $${paramCount++}`);
        values.push(JSON.stringify(data.aspectRatings));
      }
      if (data.highlights) {
        updates.push(`highlights = $${paramCount++}`);
        values.push(JSON.stringify(data.highlights));
      }
      if (data.improvements) {
        updates.push(`improvements = $${paramCount++}`);
        values.push(JSON.stringify(data.improvements));
      }
      if (data.wouldRecommend !== undefined) {
        updates.push(`would_recommend = $${paramCount++}`);
        values.push(data.wouldRecommend);
      }
      if (data.status) {
        updates.push(`status = $${paramCount++}`);
        values.push(data.status);
      }
      if (data.responseFromOperator) {
        updates.push(`response_from_operator = $${paramCount++}`);
        values.push(data.responseFromOperator);
        updates.push(`response_date = $${paramCount++}`);
        values.push(new Date());
      }

      updates.push(`updated_at = $${paramCount++}`);
      values.push(new Date());

      values.push(id);

      const result = await this.db.query(
        `UPDATE reviews
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );

      const updatedReview = this.mapReviewFromDB(result.rows[0]);

      // Инвалидировать кеш
      const cacheKey = `${this.cachePrefix}${id}`;
      await this.cache.delete(cacheKey);

      // Инвалидировать статистику тура
      const statsKey = `tour-stats:${review.tourId}`;
      await this.cache.delete(statsKey);

      // Логирование
      this.monitoring.log('info', `Review updated: ${id}`, { reviewId: id });

      // Публикация события
      this.eventBus.publish('review.updated', {
        reviewId: id,
        tourId: review.tourId,
        status: updatedReview.status,
        timestamp: new Date(),
      });

      // Обновить рейтинг тура
      if (updatedReview.status === 'approved') {
        await tourService.updateRating(review.tourId);
      }

      // Метрики
      this.monitoring.recordMetric('review.update', Date.now() - startTime);

      return updatedReview;
    } catch (error) {
      this.monitoring.log('error', 'Failed to update review', {
        reviewId: id,
        error,
      });
      throw error;
    }
  }

  /**
   * Удалить отзыв
   */
  async delete(id: string): Promise<boolean> {
    const startTime = Date.now();

    try {
      // Получить перед удалением для публикации события
      const review = await this.read(id);

      // Удаление из БД
      const result = await this.db.query(
        `DELETE FROM reviews WHERE id = $1 RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new ReviewNotFoundError(id);
      }

      // Инвалидировать кеш
      const cacheKey = `${this.cachePrefix}${id}`;
      await this.cache.delete(cacheKey);

      // Инвалидировать статистику тура
      const statsKey = `tour-stats:${review.tourId}`;
      await this.cache.delete(statsKey);

      // Логирование
      this.monitoring.log('info', `Review deleted: ${id}`, { reviewId: id });

      // Публикация события
      this.eventBus.publish('review.deleted', {
        reviewId: id,
        tourId: review.tourId,
        timestamp: new Date(),
      });

      // Обновить рейтинг тура
      await tourService.updateRating(review.tourId);

      // Метрики
      this.monitoring.recordMetric('review.delete', Date.now() - startTime);

      return true;
    } catch (error) {
      this.monitoring.log('error', 'Failed to delete review', {
        reviewId: id,
        error,
      });
      throw error;
    }
  }

  // ========================================================================
  // ПОИСК И ФИЛЬТРАЦИЯ
  // ========================================================================

  /**
   * Искать отзывы с фильтрами
   */
  async search(params: ReviewSearchParams): Promise<ReviewSearchResult> {
    const startTime = Date.now();

    try {
      const {
        filters = {},
        sortBy = 'newest',
        sortOrder = 'desc',
        limit = 20,
        offset = 0,
      } = params;

      // Построение WHERE условий
      const conditions: string[] = ["status = 'approved'"]; // По умолчанию только одобренные
      const values: any[] = [];
      let paramCount = 1;

      // Фильтры
      if (filters.tourId) {
        conditions.push(`tour_id = $${paramCount}`);
        values.push(filters.tourId);
        paramCount++;
      }

      if (filters.userId) {
        conditions.push(`user_id = $${paramCount}`);
        values.push(filters.userId);
        paramCount++;
      }

      if (filters.status) {
        conditions.push(`status = $${paramCount}`);
        values.push(filters.status);
        paramCount++;
      }

      if (filters.minRating) {
        conditions.push(`rating >= $${paramCount}`);
        values.push(filters.minRating);
        paramCount++;
      }

      if (filters.maxRating) {
        conditions.push(`rating <= $${paramCount}`);
        values.push(filters.maxRating);
        paramCount++;
      }

      if (filters.onlyVerifiedPurchases) {
        conditions.push(`is_verified_purchase = true`);
      }

      if (filters.dateFrom) {
        conditions.push(`created_at >= $${paramCount}`);
        values.push(filters.dateFrom);
        paramCount++;
      }

      if (filters.dateTo) {
        conditions.push(`created_at <= $${paramCount}`);
        values.push(filters.dateTo);
        paramCount++;
      }

      if (filters.hasPhotos) {
        conditions.push(`jsonb_array_length(photos) > 0`);
      }

      if (filters.hasResponse) {
        conditions.push(`response_from_operator IS NOT NULL`);
      }

      if (filters.wouldRecommend !== undefined) {
        conditions.push(`would_recommend = $${paramCount}`);
        values.push(filters.wouldRecommend);
        paramCount++;
      }

      // Построение ORDER BY
      const orderByMap: Record<string, string> = {
        'rating': 'rating DESC',
        'helpful': 'helpful_count DESC',
        'newest': 'created_at DESC',
        'oldest': 'created_at ASC',
      };

      const orderBy = orderByMap[sortBy] || 'created_at DESC';

      // Получение общего количества
      const countResult = await this.db.query(
        `SELECT COUNT(*) as total FROM reviews
         WHERE ${conditions.join(' AND ')}`,
        values
      );

      const total = parseInt(countResult.rows[0]?.total || '0');

      // Получение отзывов
      values.push(limit);
      values.push(offset);

      const result = await this.db.query(
        `SELECT * FROM reviews
         WHERE ${conditions.join(' AND ')}
         ORDER BY ${orderBy}
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        values
      );

      const reviews = result.rows.map(row => this.mapReviewFromDB(row));

      // Метрики
      this.monitoring.recordMetric('review.search', Date.now() - startTime);

      return {
        reviews,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      this.monitoring.log('error', 'Failed to search reviews', {
        params,
        error,
      });
      throw error;
    }
  }

  // ========================================================================
  // СТАТИСТИКА
  // ========================================================================

  /**
   * Получить статистику отзывов для тура
   */
  async getStats(tourId: string): Promise<ReviewStats> {
    try {
      // Проверка кеша
      const cacheKey = `tour-stats:${tourId}`;
      const cached = await this.cache.get<ReviewStats>(cacheKey);
      if (cached) {
        return cached;
      }

      // Получить все одобренные отзывы
      const result = await this.db.query(
        `SELECT 
          COUNT(*) as total,
          AVG(rating)::float as avg_rating,
          SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1,
          SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2,
          SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3,
          SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4,
          SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5,
          SUM(CASE WHEN would_recommend = true THEN 1 ELSE 0 END)::float as recommended,
          SUM(CASE WHEN jsonb_array_length(photos) > 0 THEN 1 ELSE 0 END) as with_photos,
          SUM(CASE WHEN jsonb_array_length(videos) > 0 THEN 1 ELSE 0 END) as with_videos,
          SUM(CASE WHEN is_verified_purchase = true THEN 1 ELSE 0 END) as verified,
          SUM(CASE WHEN response_from_operator IS NOT NULL THEN 1 ELSE 0 END) as responded
         FROM reviews
         WHERE tour_id = $1 AND status = 'approved'`,
        [tourId]
      );

      const row = result.rows[0];
      const total = parseInt(row.total || '0');

      const stats: ReviewStats = {
        tourId,
        totalReviews: total,
        averageRating: parseFloat(row.avg_rating || '0'),
        ratingDistribution: {
          1: parseInt(row.rating_1 || '0'),
          2: parseInt(row.rating_2 || '0'),
          3: parseInt(row.rating_3 || '0'),
          4: parseInt(row.rating_4 || '0'),
          5: parseInt(row.rating_5 || '0'),
        },
        percentageRecommended:
          total > 0 ? Math.round((parseInt(row.recommended || '0') / total) * 100) : 0,
        totalPhotos: parseInt(row.with_photos || '0'),
        totalVideos: parseInt(row.with_videos || '0'),
        verifiedPurchaseCount: parseInt(row.verified || '0'),
        respondedCount: parseInt(row.responded || '0'),
        averageResponseTime: undefined, // Может быть вычислено отдельно
      };

      // Кеширование на 1 час
      await this.cache.set(cacheKey, stats, 3600);

      return stats;
    } catch (error) {
      this.monitoring.log('error', 'Failed to get review stats', {
        tourId,
        error,
      });
      throw error;
    }
  }

  /**
   * Получить рейтинг оператора
   */
  async getOperatorRating(operatorId: string): Promise<OperatorRating> {
    try {
      const result = await this.db.query(
        `SELECT 
          AVG(r.rating)::float as avg_rating,
          COUNT(DISTINCT r.id) as total_reviews,
          SUM(CASE WHEN r.would_recommend = true THEN 1 ELSE 0 END)::float as recommended,
          SUM(CASE WHEN r.response_from_operator IS NOT NULL THEN 1 ELSE 0 END)::float as responded
         FROM reviews r
         JOIN tours t ON r.tour_id = t.id
         WHERE t.operator_id = $1 AND r.status = 'approved'`,
        [operatorId]
      );

      const row = result.rows[0];
      const totalReviews = parseInt(row.total_reviews || '0');

      // Получить последние отзывы
      const recentResult = await this.db.query(
        `SELECT r.* FROM reviews r
         JOIN tours t ON r.tour_id = t.id
         WHERE t.operator_id = $1 AND r.status = 'approved'
         ORDER BY r.created_at DESC
         LIMIT 10`,
        [operatorId]
      );

      return {
        operatorId,
        averageRating: parseFloat(row.avg_rating || '0'),
        totalReviews,
        percentageRecommended:
          totalReviews > 0 ? Math.round((parseInt(row.recommended || '0') / totalReviews) * 100) : 0,
        recentReviews: recentResult.rows.map(r => this.mapReviewFromDB(r)),
        responseRate:
          totalReviews > 0 ? Math.round((parseInt(row.responded || '0') / totalReviews) * 100) : 0,
        averageResponseTime: 0, // Может быть вычислено отдельно
      };
    } catch (error) {
      this.monitoring.log('error', 'Failed to get operator rating', {
        operatorId,
        error,
      });
      throw error;
    }
  }

  // ========================================================================
  // МОДЕРАЦИЯ
  // ========================================================================

  /**
   * Одобрить отзыв
   */
  async approve(id: string, moderatorId: string): Promise<Review> {
    try {
      const review = await this.read(id);

      const result = await this.db.query(
        `UPDATE reviews
         SET status = 'approved', moderated_by = $1, updated_at = NOW(), published_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [moderatorId, id]
      );

      const approvedReview = this.mapReviewFromDB(result.rows[0]);

      // Инвалидировать кеш
      await this.cache.delete(`${this.cachePrefix}${id}`);
      await this.cache.delete(`tour-stats:${review.tourId}`);

      // Обновить рейтинг тура
      await tourService.updateRating(review.tourId);

      // Логирование
      this.monitoring.log('info', `Review approved: ${id}`, {
        reviewId: id,
        moderatorId,
      });

      // Публикация события
      this.eventBus.publish('review.approved', {
        reviewId: id,
        tourId: review.tourId,
        timestamp: new Date(),
      });

      // Уведомить пользователя
      await this.notifications.send({
        userId: review.userId,
        type: 'email',
        subject: 'Ваш отзыв опубликован!',
        body: `Ваш отзыв о туре "${review.title}" был одобрен и опубликован.`,
      });

      return approvedReview;
    } catch (error) {
      this.monitoring.log('error', 'Failed to approve review', {
        reviewId: id,
        error,
      });
      throw error;
    }
  }

  /**
   * Отклонить отзыв
   */
  async reject(
    id: string,
    moderatorId: string,
    reason: string
  ): Promise<Review> {
    try {
      const review = await this.read(id);

      const result = await this.db.query(
        `UPDATE reviews
         SET status = 'rejected', moderated_by = $1, rejection_reason = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [moderatorId, reason, id]
      );

      const rejectedReview = this.mapReviewFromDB(result.rows[0]);

      // Инвалидировать кеш
      await this.cache.delete(`${this.cachePrefix}${id}`);

      // Логирование
      this.monitoring.log('info', `Review rejected: ${id}`, {
        reviewId: id,
        moderatorId,
        reason,
      });

      // Публикация события
      this.eventBus.publish('review.rejected', {
        reviewId: id,
        tourId: review.tourId,
        reason,
        timestamp: new Date(),
      });

      // Уведомить пользователя
      await this.notifications.send({
        userId: review.userId,
        type: 'email',
        subject: 'Ваш отзыв отклонён',
        body: `К сожалению, ваш отзыв не был опубликован. Причина: ${reason}`,
      });

      return rejectedReview;
    } catch (error) {
      this.monitoring.log('error', 'Failed to reject review', {
        reviewId: id,
        error,
      });
      throw error;
    }
  }

  /**
   * Ответить на отзыв (оператор)
   */
  async respondToReview(
    id: string,
    operatorId: string,
    response: string
  ): Promise<Review> {
    try {
      const review = await this.read(id);

      // Проверить, что оператор владеет этим туром
      const tour = await tourService.read(review.tourId);
      if (tour.operatorId !== operatorId) {
        throw new Error('Operator does not own this tour');
      }

      const result = await this.db.query(
        `UPDATE reviews
         SET response_from_operator = $1, response_date = NOW(), updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [response, id]
      );

      const respondedReview = this.mapReviewFromDB(result.rows[0]);

      // Инвалидировать кеш
      await this.cache.delete(`${this.cachePrefix}${id}`);

      // Логирование
      this.monitoring.log('info', `Review responded: ${id}`, {
        reviewId: id,
        operatorId,
      });

      // Публикация события
      this.eventBus.publish('review.responded', {
        reviewId: id,
        tourId: review.tourId,
        operatorId,
        timestamp: new Date(),
      });

      // Уведомить автора отзыва
      await this.notifications.send({
        userId: review.userId,
        type: 'email',
        subject: 'Ответ на ваш отзыв',
        body: `Оператор ответил на ваш отзыв: ${response}`,
      });

      return respondedReview;
    } catch (error) {
      this.monitoring.log('error', 'Failed to respond to review', {
        reviewId: id,
        error,
      });
      throw error;
    }
  }

  // ========================================================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // ========================================================================

  /**
   * Валидация данных при создании отзыва
   */
  private validateReviewCreate(data: ReviewCreate): void {
    if (!data.title || data.title.trim().length === 0) {
      throw new ReviewValidationError('Заголовок отзыва не может быть пустым');
    }

    if (data.title.length < 10) {
      throw new ReviewValidationError('Заголовок должен содержать не менее 10 символов');
    }

    if (!data.comment || data.comment.trim().length === 0) {
      throw new ReviewValidationError('Текст отзыва не может быть пустым');
    }

    if (data.comment.length < 50) {
      throw new ReviewValidationError('Отзыв должен содержать не менее 50 символов');
    }

    if (data.comment.length > 5000) {
      throw new ReviewValidationError('Отзыв не может быть длиннее 5000 символов');
    }

    if (data.rating < 1 || data.rating > 5) {
      throw new ReviewValidationError('Рейтинг должен быть от 1 до 5');
    }

    if (!data.visitDate || new Date(data.visitDate) > new Date()) {
      throw new ReviewValidationError('Дата посещения не может быть в будущем');
    }
  }

  /**
   * Маппинг данных из БД в Review объект
   */
  private mapReviewFromDB(row: any): Review {
    return {
      id: row.id,
      tourId: row.tour_id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      userAvatar: row.user_avatar,
      rating: row.rating,
      title: row.title,
      comment: row.comment,
      aspectRatings: row.aspect_ratings ? JSON.parse(row.aspect_ratings) : undefined,
      highlights: Array.isArray(row.highlights)
        ? row.highlights
        : JSON.parse(row.highlights || '[]'),
      improvements: Array.isArray(row.improvements)
        ? row.improvements
        : JSON.parse(row.improvements || '[]'),
      wouldRecommend: row.would_recommend,
      visitDate: new Date(row.visit_date),
      status: row.status,
      moderatedBy: row.moderated_by,
      moderationComment: row.moderation_comment,
      rejectionReason: row.rejection_reason,
      photos: Array.isArray(row.photos) ? row.photos : JSON.parse(row.photos || '[]'),
      videos: Array.isArray(row.videos) ? row.videos : JSON.parse(row.videos || '[]'),
      isVerifiedPurchase: row.is_verified_purchase,
      helpfulCount: row.helpful_count || 0,
      unhelpfulCount: row.unhelpful_count || 0,
      responseFromOperator: row.response_from_operator,
      responseDate: row.response_date ? new Date(row.response_date) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      publishedAt: row.published_at ? new Date(row.published_at) : undefined,
    };
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const reviewService = ReviewService.getInstance();
