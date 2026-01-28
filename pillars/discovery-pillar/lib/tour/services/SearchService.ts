/**
 * SearchService - Discovery Pillar
 * Сервис расширенного поиска и фильтрации туров
 * Интегрирует базу данных, кеширование и анализ
 */

import {
  databaseService,
  DatabaseService,
} from '@/pillars/core-infrastructure-infrastructure/lib/database';
import {
  cacheService,
  CacheService,
} from '@/pillars/core-infrastructure-infrastructure/lib/cache';
import {
  monitoringService,
  MonitoringService,
} from '@/pillars/core-infrastructure-infrastructure/lib/monitoring';

import {
  Tour,
  TourFilters,
  TourSearchParams,
  TourSearchResult,
} from '../types';

// ============================================================================
// ТИПЫ
// ============================================================================

/**
 * Расширенные параметры поиска с поддержкой геолокации
 */
export interface AdvancedSearchParams extends TourSearchParams {
  // Геолокация
  latitude?: number;
  longitude?: number;
  radiusKm?: number; // Радиус поиска в км

  // Дополнительные параметры
  hasEquipment?: boolean;
  groupSizeOptions?: boolean; // Есть ли варианты для разных размеров группы
  groupSize?: number;

  // Поиск по тегам
  tags?: string[];
  tagMatchType?: 'all' | 'any'; // all = все теги, any = любой из тегов

  // Дополнительные фильтры
  hasResponses?: boolean; // Только туры с ответами на отзывы
  minReviewCount?: number;
  favoriteOnly?: boolean;
  bookingAvailable?: boolean;
}

/**
 * Результаты продвинутого поиска с метаданными
 */
export interface AdvancedSearchResult extends TourSearchResult {
  facets: {
    activities: Array<{ name: string; count: number }>;
    difficulties: Array<{ name: string; count: number }>;
    priceRanges: Array<{
      range: string;
      min: number;
      max: number;
      count: number;
    }>;
    ratings: Array<{ stars: number; count: number }>;
    operators: Array<{ operatorId: string; name: string; count: number }>;
  };
  executionTime: number;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class SearchService {
  private static instance: SearchService;
  private readonly cachePrefix = 'search:';
  private readonly cacheTTL = 1800; // 30 minutes

  private constructor(
    private db: DatabaseService,
    private cache: CacheService,
    private monitoring: MonitoringService,
  ) {}

  /**
   * Получить singleton инстанс SearchService
   */
  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService(
        databaseService,
        cacheService,
        monitoringService,
      );
    }
    return SearchService.instance;
  }

  // ========================================================================
  // БАЗОВЫЙ ПОИСК
  // ========================================================================

  /**
   * Выполнить поиск туров с кешированием
   */
  async search(params: TourSearchParams): Promise<TourSearchResult> {
    const startTime = Date.now();

    try {
      // Генерирование ключа кеша
      const cacheKey = this.generateCacheKey(params);

      // Проверка кеша
      const cached = await this.cache.get<TourSearchResult>(cacheKey);
      if (cached) {
        this.monitoring.recordMetric('search.cache.hit', 1);
        this.monitoring.log('debug', 'Search results from cache', { cacheKey });
        return cached;
      }

      // Выполнить поиск
      const result = await this.executeSearch(params);

      // Кеширование результатов
      await this.cache.set(cacheKey, result, this.cacheTTL);

      // Метрики
      const duration = Date.now() - startTime;
      this.monitoring.recordMetric('search.duration', duration);
      this.monitoring.log('info', 'Search executed', {
        query: params.query,
        resultsCount: result.tours.length,
        duration,
      });

      return result;
    } catch (error) {
      this.monitoring.log('error', 'Search failed', { params, error });
      throw error;
    }
  }

  /**
   * Выполнить расширенный поиск с фасетами
   */
  async advancedSearch(params: AdvancedSearchParams): Promise<AdvancedSearchResult> {
    const startTime = Date.now();

    try {
      // Выполнить поиск
      const searchResult = await this.executeAdvancedSearch(params);

      // Получить фасеты
      const facets = await this.getFacets(params.filters || {});

      const duration = Date.now() - startTime;

      const result: AdvancedSearchResult = {
        ...searchResult,
        facets,
        executionTime: duration,
      };

      // Метрики
      this.monitoring.recordMetric('search.advanced.duration', duration);

      return result;
    } catch (error) {
      this.monitoring.log('error', 'Advanced search failed', { params, error });
      throw error;
    }
  }

  /**
   * Автодополнение для поиска
   */
  async autocomplete(query: string, limit: number = 10): Promise<string[]> {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const result = await this.db.query(
        `SELECT DISTINCT title
         FROM tours
         WHERE status = 'published' AND is_active = true
         AND title ILIKE $1
         LIMIT $2`,
        [`${query}%`, limit]
      );

      return result.rows.map(row => row.title);
    } catch (error) {
      this.monitoring.log('error', 'Autocomplete failed', { query, error });
      return [];
    }
  }

  /**
   * Популярные теги
   */
  async getPopularTags(limit: number = 20): Promise<Array<{ tag: string; count: number }>> {
    try {
      const cacheKey = `${this.cachePrefix}popular-tags`;
      const cached = await this.cache.get<Array<{ tag: string; count: number }>>(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await this.db.query(
        `SELECT tag, COUNT(*) as count
         FROM (
           SELECT jsonb_each_text(tags) as tag
           FROM tours
           WHERE status = 'published' AND is_active = true
         ) t
         GROUP BY tag
         ORDER BY count DESC
         LIMIT $1`,
        [limit]
      );

      const tags = result.rows.map(row => ({
        tag: row.tag,
        count: parseInt(row.count || '0'),
      }));

      await this.cache.set(cacheKey, tags, 3600);

      return tags;
    } catch (error) {
      this.monitoring.log('error', 'Failed to get popular tags', { error });
      return [];
    }
  }

  /**
   * Рекомендованные туры (популярные, с хорошим рейтингом)
   */
  async getRecommended(
    limit: number = 10,
    operatorId?: string
  ): Promise<Tour[]> {
    try {
      const cacheKey = `${this.cachePrefix}recommended:${operatorId || 'all'}`;
      const cached = await this.cache.get<Tour[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const operatorFilter = operatorId ? `AND t.operator_id = '${operatorId}'` : '';

      const result = await this.db.query(
        `SELECT t.*,
                COUNT(DISTINCT r.id) as reviews_count,
                AVG(r.rating)::float as rating
         FROM tours t
         LEFT JOIN reviews r ON t.id = r.tour_id AND r.status = 'approved'
         WHERE t.status = 'published' 
         AND t.is_active = true
         AND AVG(r.rating) >= 4.5
         ${operatorFilter}
         GROUP BY t.id
         ORDER BY t.view_count DESC, AVG(r.rating) DESC
         LIMIT $1`,
        [limit]
      );

      const tours = result.rows.map(row => this.mapTourFromDB(row));

      await this.cache.set(cacheKey, tours, 3600);

      return tours;
    } catch (error) {
      this.monitoring.log('error', 'Failed to get recommended tours', { error });
      return [];
    }
  }

  /**
   * Трендовые туры (быстро растущие в популярности)
   */
  async getTrending(limit: number = 10): Promise<Tour[]> {
    try {
      const cacheKey = `${this.cachePrefix}trending`;
      const cached = await this.cache.get<Tour[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await this.db.query(
        `SELECT t.*,
                COUNT(DISTINCT b.id) as booking_count,
                AVG(r.rating)::float as rating
         FROM tours t
         LEFT JOIN bookings b ON t.id = b.tour_id 
         AND b.created_at >= $1
         LEFT JOIN reviews r ON t.id = r.tour_id AND r.status = 'approved'
         WHERE t.status = 'published' AND t.is_active = true
         GROUP BY t.id
         ORDER BY COUNT(DISTINCT b.id) DESC
         LIMIT $2`,
        [sevenDaysAgo, limit]
      );

      const tours = result.rows.map(row => this.mapTourFromDB(row));

      await this.cache.set(cacheKey, tours, 3600);

      return tours;
    } catch (error) {
      this.monitoring.log('error', 'Failed to get trending tours', { error });
      return [];
    }
  }

  /**
   * Похожие туры
   */
  async getSimilar(tourId: string, limit: number = 5): Promise<Tour[]> {
    try {
      const cacheKey = `${this.cachePrefix}similar:${tourId}`;
      const cached = await this.cache.get<Tour[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Получить параметры исходного тура
      const originalResult = await this.db.query(
        `SELECT activity, difficulty, price_from FROM tours WHERE id = $1`,
        [tourId]
      );

      if (originalResult.rows.length === 0) {
        return [];
      }

      const original = originalResult.rows[0];

      // Найти похожие туры
      const result = await this.db.query(
        `SELECT t.*,
                AVG(r.rating)::float as rating
         FROM tours t
         LEFT JOIN reviews r ON t.id = r.tour_id AND r.status = 'approved'
         WHERE t.id != $1
         AND t.status = 'published'
         AND t.is_active = true
         AND (
           t.activity = $2
           OR t.difficulty = $3
           OR (t.price_from BETWEEN $4 - 1000 AND $4 + 1000)
         )
         GROUP BY t.id
         ORDER BY 
           CASE WHEN t.activity = $2 THEN 0 ELSE 1 END,
           ABS(t.price_from - $4) ASC,
           AVG(r.rating) DESC
         LIMIT $5`,
        [tourId, original.activity, original.difficulty, original.price_from, limit]
      );

      const tours = result.rows.map(row => this.mapTourFromDB(row));

      await this.cache.set(cacheKey, tours, 3600);

      return tours;
    } catch (error) {
      this.monitoring.log('error', 'Failed to get similar tours', { tourId, error });
      return [];
    }
  }

  // ========================================================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // ========================================================================

  /**
   * Выполнить базовый поиск без кеша
   */
  private async executeSearch(params: TourSearchParams): Promise<TourSearchResult> {
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
       WHERE ${conditions.join(' AND ')}`,
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

    return {
      tours,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Выполнить расширенный поиск без кеша
   */
  private async executeAdvancedSearch(params: AdvancedSearchParams): Promise<TourSearchResult> {
    // Пока что используем базовый поиск
    // В будущем можно добавить геолокацию и другие продвинутые фильтры
    return this.executeSearch(params);
  }

  /**
   * Получить фасеты для фильтрации
   */
  private async getFacets(
    filters: TourFilters
  ): Promise<AdvancedSearchResult['facets']> {
    try {
      const results = await Promise.all([
        // Активности
        this.db.query(
          `SELECT activity, COUNT(*) as count
           FROM tours WHERE status = 'published' AND is_active = true
           GROUP BY activity ORDER BY count DESC`
        ),
        // Сложность
        this.db.query(
          `SELECT difficulty, COUNT(*) as count
           FROM tours WHERE status = 'published' AND is_active = true
           GROUP BY difficulty ORDER BY count DESC`
        ),
        // Ценовые диапазоны
        this.db.query(
          `SELECT 
            COUNT(CASE WHEN price_from < 5000 THEN 1 END) as cheap,
            COUNT(CASE WHEN price_from >= 5000 AND price_from < 15000 THEN 1 END) as medium,
            COUNT(CASE WHEN price_from >= 15000 AND price_from < 50000 THEN 1 END) as expensive,
            COUNT(CASE WHEN price_from >= 50000 THEN 1 END) as luxury
           FROM tours WHERE status = 'published' AND is_active = true`
        ),
        // Рейтинги
        this.db.query(
          `SELECT 
            COUNT(DISTINCT t.id) as count,
            FLOOR(COALESCE(AVG(r.rating), 0)) as stars
           FROM tours t
           LEFT JOIN reviews r ON t.id = r.tour_id AND r.status = 'approved'
           WHERE t.status = 'published' AND t.is_active = true
           GROUP BY FLOOR(COALESCE(AVG(r.rating), 0))
           ORDER BY stars DESC`
        ),
        // Операторы
        this.db.query(
          `SELECT operator_id, operator_name, COUNT(*) as count
           FROM tours WHERE status = 'published' AND is_active = true
           GROUP BY operator_id, operator_name
           ORDER BY count DESC
           LIMIT 10`
        ),
      ]);

      return {
        activities: results[0].rows.map(row => ({
          name: row.activity,
          count: parseInt(row.count || '0'),
        })),
        difficulties: results[1].rows.map(row => ({
          name: row.difficulty,
          count: parseInt(row.count || '0'),
        })),
        priceRanges: [
          {
            range: 'До 5,000 ₽',
            min: 0,
            max: 5000,
            count: parseInt(results[2].rows[0]?.cheap || '0'),
          },
          {
            range: '5,000 - 15,000 ₽',
            min: 5000,
            max: 15000,
            count: parseInt(results[2].rows[0]?.medium || '0'),
          },
          {
            range: '15,000 - 50,000 ₽',
            min: 15000,
            max: 50000,
            count: parseInt(results[2].rows[0]?.expensive || '0'),
          },
          {
            range: 'Свыше 50,000 ₽',
            min: 50000,
            max: Infinity,
            count: parseInt(results[2].rows[0]?.luxury || '0'),
          },
        ],
        ratings: results[3].rows.map(row => ({
          stars: parseInt(row.stars || '0'),
          count: parseInt(row.count || '0'),
        })),
        operators: results[4].rows.map(row => ({
          operatorId: row.operator_id,
          name: row.operator_name,
          count: parseInt(row.count || '0'),
        })),
      };
    } catch (error) {
      this.monitoring.log('error', 'Failed to get facets', { error });
      return {
        activities: [],
        difficulties: [],
        priceRanges: [],
        ratings: [],
        operators: [],
      };
    }
  }

  /**
   * Генерировать ключ кеша из параметров
   */
  private generateCacheKey(params: TourSearchParams): string {
    const key = {
      query: params.query || '',
      activity: params.filters?.activity || '',
      difficulty: params.filters?.difficulty || '',
      minPrice: params.filters?.minPrice || '',
      maxPrice: params.filters?.maxPrice || '',
      rating: params.filters?.rating || '',
      sortBy: params.sortBy || 'rating',
      limit: params.limit || 20,
      offset: params.offset || 0,
    };
    return `${this.cachePrefix}${JSON.stringify(key)}`;
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

export const searchService = SearchService.getInstance();
