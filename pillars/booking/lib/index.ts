/**
 * Booking Pillar Index
 * 
 * Экспортирует публичный API для бронирования и платежей
 * 
 * Зависит от:
 * - Core Infrastructure
 * - Discovery (через API для проверки доступности)
 * 
 * Событием общается:
 * - Discovery (booking:created event)
 */

// ============ CART ============
export * from './lib/cart/index';

// ============ BOOKINGS ============
export * from './lib/bookings/index';

// ============ PAYMENTS ============
export * from './lib/payments/index';

// ============ TYPES ============
export * from './types/index';

/**
 * Booking обращается к Discovery ТОЛЬКО через API или Events
 * Никогда не импортируется напрямую из '../pillars/discovery/lib'
 */
