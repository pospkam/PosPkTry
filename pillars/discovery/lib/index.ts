/**
 * Discovery Pillar Index
 * 
 * Экспортирует публичный API для поиска и обнаружения туристических продуктов
 * 
 * Используется:
 * - Booking Pillar (для проверки доступности)
 * - Engagement Pillar (для рекомендаций)
 * - Partner Management (для аналитики)
 */

// ============ TOURS ============
export * from './lib/tours/index';

// ============ ACCOMMODATIONS ============
export * from './lib/accommodations/index';

// ============ TRANSPORT ============
export * from './lib/transport/index';

// ============ WEATHER ============
export * from './lib/weather/index';

// ============ GEAR ============
export * from './lib/gear/index';

// ============ SEARCH & FILTERS ============
export * from './lib/search/index';

// ============ TYPES ============
export * from './types/index';

/**
 * Discovery может зависеть только от Core Infrastructure
 * Другие Pillars обращаются к Discovery ТОЛЬКО через API endpoints
 */
