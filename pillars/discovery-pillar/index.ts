/**
 * Discovery Pillar - Main Exports
 * Все сервисы и типы для обнаружения туров и отзывов
 */

// ============================================================================
// TOUR SERVICES & TYPES
// ============================================================================

export {
  tourService,
  TourService,
  searchService,
  SearchService,
} from './lib/tour/services';

export type {
  Tour,
  TourCreate,
  TourUpdate,
  TourFilters,
  TourSearchParams,
  TourSearchResult,
  TourStats,
  TourAnalytics,
} from './lib/tour/types';

export {
  TourNotFoundError,
  TourValidationError,
  TourAlreadyPublishedError,
} from './lib/tour/types';

// ============================================================================
// REVIEW SERVICES & TYPES
// ============================================================================

export {
  reviewService,
  ReviewService,
} from './lib/review/services';

export type {
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
  ModerationHistory,
  ModerationRules,
} from './lib/review/types';

export {
  ReviewNotFoundError,
  ReviewValidationError,
  ReviewAlreadyPublishedError,
  DuplicateReviewError,
  ModerationPermissionError,
} from './lib/review/types';
