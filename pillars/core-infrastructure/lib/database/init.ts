/**
 * Database Initialization Module
 * Core Infrastructure - Database Init
 * 
 * Handles database connection lifecycle:
 * - Initialization on app startup
 * - Graceful shutdown
 * - Health monitoring
 * 
 * Usage:
 * import { initializeDatabase } from '@core-infrastructure/lib/database'
 * 
 * // In app startup
 * await initializeDatabase()
 */

import { database } from './services/DatabaseService';

/**
 * Initialize database connection pool
 * Should be called once on app startup (main.ts, middleware, or _app.tsx)
 * 
 * @throws Error if initialization fails
 * @returns Promise<void>
 * 
 * @example
 * // In middleware.ts or app initialization
 * import { initializeDatabase } from '@core-infrastructure/lib/database'
 * 
 * export const middleware = async () => {
 *   await initializeDatabase()
 * }
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🗄️  Database: Initializing connection pool...');

    // Initialize the database service
    await database.initialize();

    console.log('✅ Database: Connection pool ready');
    console.log('   Max connections: 20');
    console.log('   Idle timeout: 30s');
    console.log('   Connection timeout: 2s');
  } catch (error) {
    console.error('❌ Database initialization failed');
    console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Gracefully shutdown database connection pool
 * Should be called on app shutdown (process.on('SIGTERM'), etc.)
 * 
 * Ensures all connections are closed properly
 * 
 * @example
 * // On app shutdown
 * process.on('SIGTERM', async () => {
 *   await shutdownDatabase()
 *   process.exit(0)
 * })
 */
export async function shutdownDatabase(): Promise<void> {
  try {
    console.log('🗄️  Database: Closing connection pool...');
    await database.disconnect();
    console.log('✅ Database: Connection pool closed');
  } catch (error) {
    console.error('⚠️  Database shutdown error');
    console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Don't throw - we want graceful shutdown
  }
}

/**
 * Check database health status
 * Can be used for health checks, monitoring, readiness probes
 * 
 * @returns Promise<{status: 'healthy' | 'unhealthy', message: string, timestamp: Date}>
 * 
 * @example
 * // In health check endpoint
 * app.get('/health/db', async (req, res) => {
 *   const health = await checkDatabaseHealth()
 *   res.status(health.status === 'healthy' ? 200 : 503).json(health)
 * })
 */
export async function checkDatabaseHealth() {
  return database.healthCheck();
}

/**
 * Check if database is initialized
 * 
 * @returns boolean
 */
export function isDatabaseInitialized(): boolean {
  return database.isInitialized();
}

/**
 * Get database instance (for advanced operations)
 * 
 * @returns DatabaseService instance
 * 
 * @example
 * // Direct database access
 * const db = getDatabaseInstance()
 * const result = await db.query('SELECT ...')
 */
export function getDatabaseInstance() {
  return database;
}
