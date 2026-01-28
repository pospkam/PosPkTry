/**
 * Core Infrastructure Pillar
 * 
 * Экспортирует общедоступный API для всех компонентов системы
 * 
 * Использование:
 * import { getUser, checkAuth } from '@/pillars/core-infrastructure-infrastructure/lib/auth';
 * import { getDatabase } from '@/pillars/core-infrastructure-infrastructure/lib/database';
 */

// ============ AUTH & AUTHORIZATION ============
export * from './auth/index';

// ============ DATABASE ============
export * from './database/index';

// ============ CACHE ============
export * from './cache/index';

// ============ MONITORING ============
export * from './monitoring/index';

// ============ NOTIFICATIONS ============
export * from './notifications/index';

// ============ PAYMENTS ============
export * from './payments/index';

// ============ TYPES & INTERFACES ============
export * from '../types/index';

/**
 * Core Infrastructure должен быть доступен всем Pillars
 * Никакие другие Pillars не должны импортироваться здесь
 */
