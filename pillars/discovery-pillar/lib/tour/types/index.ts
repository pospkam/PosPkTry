/**
 * Tour Types - Discovery Pillar
 * Типы данных для работы с турами
 */

// ============================================================================
// ОСНОВНЫЕ ТИПЫ
// ============================================================================

export type TourDifficulty = 'easy' | 'moderate' | 'hard' | 'extreme';
export type TourStatus = 'draft' | 'published' | 'archived';
export type TourActivity = 
  | 'hiking'
  | 'mountaineering'
  | 'photography'
  | 'cultural'
  | 'extreme'
  | 'fishing'
  | 'beach'
  | 'nature'
  | 'coastal'
  | 'adventure';

// ============================================================================
// ОСНОВНАЯ МОДЕЛЬ
// ============================================================================

export interface Tour {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  
  // Классификация
  activity: TourActivity;
  difficulty: TourDifficulty;
  tags: string[];
  
  // Информация о туре
  duration: number; // часы
  meetingPoint: string;
  meetingTime: string;
  
  // Участники
  minParticipants: number;
  maxParticipants: number;
  
  // Цены
  priceFrom: number;
  priceTo?: number;
  currency: string; // 'RUB', 'USD', 'EUR'
  
  // Оборудование
  equipmentIncluded: string[];
  equipmentRequired: string[];
  
  // Требования
  weatherRequirements: string[];
  safetyRequirements: string[];
  
  // Рейтинги и отзывы
  rating: number; // 0-5
  reviewsCount: number;
  
  // Статус и видимость
  status: TourStatus;
  isActive: boolean;
  
  // Оператор
  operatorId: string;
  operatorName: string;
  operatorRating: number;
  operatorEmail: string;
  
  // Медиа
  images: string[];
  
  // Метаданные
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  viewCount?: number;
}

// ============================================================================
// DTO ДЛЯ СОЗДАНИЯ
// ============================================================================

export interface TourCreate {
  title: string;
  description: string;
  shortDescription?: string;
  
  activity: TourActivity;
  difficulty: TourDifficulty;
  tags?: string[];
  
  duration: number;
  meetingPoint: string;
  meetingTime: string;
  
  minParticipants: number;
  maxParticipants: number;
  
  priceFrom: number;
  priceTo?: number;
  currency?: string;
  
  equipmentIncluded?: string[];
  equipmentRequired?: string[];
  
  weatherRequirements?: string[];
  safetyRequirements?: string[];
  
  images?: string[];
  
  operatorId: string;
}

// ============================================================================
// DTO ДЛЯ ОБНОВЛЕНИЯ
// ============================================================================

export interface TourUpdate {
  title?: string;
  description?: string;
  shortDescription?: string;
  
  activity?: TourActivity;
  difficulty?: TourDifficulty;
  tags?: string[];
  
  duration?: number;
  meetingPoint?: string;
  meetingTime?: string;
  
  minParticipants?: number;
  maxParticipants?: number;
  
  priceFrom?: number;
  priceTo?: number;
  currency?: string;
  
  equipmentIncluded?: string[];
  equipmentRequired?: string[];
  
  weatherRequirements?: string[];
  safetyRequirements?: string[];
  
  images?: string[];
  
  isActive?: boolean;
}

// ============================================================================
// ФИЛЬТРЫ И ПОИСК
// ============================================================================

export interface TourFilters {
  activity?: TourActivity;
  difficulty?: TourDifficulty;
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
  minParticipants?: number;
  maxParticipants?: number;
  rating?: number;
  tags?: string[];
  operatorId?: string;
  status?: TourStatus;
  isActive?: boolean;
}

export interface TourSearchParams {
  query?: string;
  filters?: TourFilters;
  sortBy?: 'rating' | 'price' | 'duration' | 'newest' | 'popular';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface TourSearchResult {
  tours: Tour[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ============================================================================
// СТАТИСТИКА И АНАЛИТИКА
// ============================================================================

export interface TourStats {
  tourId: string;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  viewCount: number;
  conversionRate: number;
}

export interface TourAnalytics {
  tourId: string;
  stats: TourStats;
  dailyViews: { date: string; count: number }[];
  bookingTrend: { date: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
}

// ============================================================================
// ПУБЛИКАЦИЯ И WORKFLOW
// ============================================================================

export interface PublishRequest {
  tourId: string;
  publishedAt?: Date;
}

export interface UnpublishRequest {
  tourId: string;
  reason?: string;
}

// ============================================================================
// ОШИБКИ
// ============================================================================

export class TourNotFoundError extends Error {
  constructor(tourId: string) {
    super(`Тур с ID ${tourId} не найден`);
    this.name = 'TourNotFoundError';
  }
}

export class TourValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TourValidationError';
  }
}

export class TourAlreadyPublishedError extends Error {
  constructor(tourId: string) {
    super(`Тур ${tourId} уже опубликован`);
    this.name = 'TourAlreadyPublishedError';
  }
}
