/**
 * Engagement Pillar Index
 * 
 * Экспортирует публичный API для взаимодействия с пользователями
 * 
 * Зависит от:
 * - Core Infrastructure
 * - Discovery (для рекомендаций)
 * - Booking (для истории)
 */

// ============ REVIEWS ============
export * from './lib/reviews/index';

// ============ LOYALTY ============
export * from './lib/loyalty/index';

// ============ CHAT & NOTIFICATIONS ============
export * from './lib/chat/index';

// ============ TYPES ============
export * from './types/index';
