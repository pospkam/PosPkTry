/**
 * Core Infrastructure - Database Module
 * Public API for database operations
 */

export * from './services';
export * from './repositories';
export * from './types';
export {
  initializeDatabase,
  shutdownDatabase,
  checkDatabaseHealth,
  isDatabaseInitialized,
  getDatabaseInstance,
} from './init';
