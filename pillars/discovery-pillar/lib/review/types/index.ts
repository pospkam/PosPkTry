/**
 * Review Types - Discovery Pillar
 * Типы для системы отзывов и рейтингов
 */

// ============================================================================
// ПЕРЕЧИСЛЕНИЯ И ТИПЫ
// ============================================================================

/**
 * Статусы отзыва (workflow модерации)
 */
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'archived';

/**
 * Типы отзываемых объектов
 */
export type ReviewableType = 'tour' | 'operator' | 'driver' | 'accommodation';

/**
 * Рейтинговая шкала (1-5 звёзд)
 */
export type Rating = 1 | 2 | 3 | 4 | 5;

/**
 * Аспекты оценки тура
 */
export type TourAspect = 'guide' | 'difficulty' | 'safety' | 'value' | 'overall';

// ============================================================================
// ОСНОВНЫЕ ИНТЕРФЕЙСЫ
// ============================================================================

/**
 * Основной интерфейс отзыва
 */
export interface Review {
  // Идентификаторы
  id: string;
  tourId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;

  // Контент
  rating: Rating;
  title: string;
  comment: string;
  aspectRatings?: Record<TourAspect, Rating>; // Дополнительные оценки по аспектам

  // Улучшения для туров
  highlights?: string[]; // Что понравилось: ["beautiful views", "friendly guide"]
  improvements?: string[]; // Что улучшить: ["better meals", "shorter drive"]
  wouldRecommend: boolean;
  visitDate: Date;

  // Статус и модерация
  status: ReviewStatus;
  moderatedBy?: string;
  moderationComment?: string;
  rejectionReason?: string;

  // Медиа
  photos?: string[]; // URLs к фото из отзыва
  videos?: string[]; // URLs к видео

  // Метаданные
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  responseFromOperator?: string;
  responseDate?: Date;

  // Временные метки
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

/**
 * DTO для создания отзыва
 */
export interface ReviewCreate {
  tourId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;

  rating: Rating;
  title: string;
  comment: string;
  aspectRatings?: Record<TourAspect, Rating>;

  highlights?: string[];
  improvements?: string[];
  wouldRecommend: boolean;
  visitDate: Date;

  photos?: string[];
  videos?: string[];
}

/**
 * DTO для обновления отзыва
 */
export interface ReviewUpdate {
  rating?: Rating;
  title?: string;
  comment?: string;
  aspectRatings?: Record<TourAspect, Rating>;
  highlights?: string[];
  improvements?: string[];
  wouldRecommend?: boolean;
  status?: ReviewStatus;
  responseFromOperator?: string;
}

/**
 * Фильтры для поиска отзывов
 */
export interface ReviewFilters {
  tourId?: string;
  userId?: string;
  status?: ReviewStatus;
  minRating?: Rating;
  maxRating?: Rating;
  onlyVerifiedPurchases?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  hasPhotos?: boolean;
  hasResponse?: boolean;
  wouldRecommend?: boolean;
}

/**
 * Параметры поиска отзывов
 */
export interface ReviewSearchParams {
  filters?: ReviewFilters;
  sortBy?: 'rating' | 'helpful' | 'newest' | 'oldest';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Результат поиска отзывов
 */
export interface ReviewSearchResult {
  reviews: Review[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ============================================================================
// СТАТИСТИКА И АНАЛИТИКА
// ============================================================================

/**
 * Статистика отзывов для тура
 */
export interface ReviewStats {
  tourId: string;
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<Rating, number>; // { 1: 5, 2: 3, 3: 10, 4: 25, 5: 57 }
  percentageRecommended: number; // 0-100
  aspectAverages?: Record<TourAspect, number>;
  totalPhotos: number;
  totalVideos: number;
  verifiedPurchaseCount: number;
  respondedCount: number;
  averageResponseTime?: number; // в днях
}

/**
 * Аналитика отзывов по времени
 */
export interface ReviewAnalytics {
  tourId: string;
  stats: ReviewStats;
  dailyReviews: Array<{
    date: Date;
    count: number;
    averageRating: number;
  }>;
  reviewTrend: Array<{
    period: string; // "2025-01", "2025-02"
    count: number;
    averageRating: number;
  }>;
  topHighlights: Array<{
    text: string;
    frequency: number;
  }>;
  topImprovements: Array<{
    text: string;
    frequency: number;
  }>;
}

/**
 * Рейтинг оператора
 */
export interface OperatorRating {
  operatorId: string;
  averageRating: number;
  totalReviews: number;
  percentageRecommended: number;
  recentReviews: Review[]; // Последние 10 отзывов
  responseRate: number; // % от отзывов, на которые дан ответ
  averageResponseTime: number; // в днях
}

// ============================================================================
// МОДЕРАЦИЯ
// ============================================================================

/**
 * Запрос на модерацию отзыва
 */
export interface ModerationAction {
  reviewId: string;
  action: 'approve' | 'reject' | 'archive';
  moderatorId: string;
  reason?: string;
  comment?: string;
}

/**
 * История модерации
 */
export interface ModerationHistory {
  reviewId: string;
  actions: Array<{
    action: 'created' | 'submitted' | 'approved' | 'rejected' | 'archived';
    by: string;
    at: Date;
    reason?: string;
    comment?: string;
  }>;
}

/**
 * Правила модерации
 */
export interface ModerationRules {
  minCharacterLength: number;
  maxCharacterLength: number;
  forbiddenWords: string[];
  autoApproveVerified: boolean;
  requirePhotoForLowRating: boolean;
  requirePhotoForHighRating: boolean;
  autoRejectIfSpam: boolean;
}

// ============================================================================
// ПОЛЬЗОВАТЕЛЬСКИЕ ОШИБКИ
// ============================================================================

/**
 * Ошибка: отзыв не найден
 */
export class ReviewNotFoundError extends Error {
  constructor(id: string) {
    super(`Review with ID ${id} not found`);
    this.name = 'ReviewNotFoundError';
  }
}

/**
 * Ошибка: неверные данные отзыва
 */
export class ReviewValidationError extends Error {
  constructor(message: string) {
    super(`Review validation failed: ${message}`);
    this.name = 'ReviewValidationError';
  }
}

/**
 * Ошибка: отзыв уже опубликован
 */
export class ReviewAlreadyPublishedError extends Error {
  constructor(id: string) {
    super(`Review ${id} is already published`);
    this.name = 'ReviewAlreadyPublishedError';
  }
}

/**
 * Ошибка: пользователь уже оставил отзыв на этот тур
 */
export class DuplicateReviewError extends Error {
  constructor(userId: string, tourId: string) {
    super(`User ${userId} has already reviewed tour ${tourId}`);
    this.name = 'DuplicateReviewError';
  }
}

/**
 * Ошибка: недостаточно прав на модерацию
 */
export class ModerationPermissionError extends Error {
  constructor(userId: string) {
    super(`User ${userId} does not have moderation permissions`);
    this.name = 'ModerationPermissionError';
  }
}
