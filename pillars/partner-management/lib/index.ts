/**
 * Partner Management Pillar Index
 * 
 * Экспортирует публичный API для администрирования
 * 
 * Может зависеть от:
 * - Core Infrastructure
 * - Все остальные Pillars (через API)
 */

// ============ ADMIN PANEL ============
export * from './lib/admin/index';

// ============ OPERATOR PANEL ============
export * from './lib/operator/index';

// ============ AGENT PANEL ============
export * from './lib/agent/index';

// ============ ROLE & PERMISSIONS ============
export * from './lib/roles/index';

// ============ TYPES ============
export * from './types/index';
