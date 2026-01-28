/**
 * @module @core-infrastructure/lib/monitoring
 *
 * Core Infrastructure Monitoring Module
 *
 * Comprehensive monitoring, metrics collection, and logging service for the entire application.
 *
 * Features:
 * - Metrics collection (performance, errors, custom metrics)
 * - Structured logging with multiple severity levels
 * - Health checks for system components
 * - Performance tracking (latency, throughput, error rates)
 * - Error tracking and aggregation
 * - Memory and CPU monitoring
 * - Audit trail logging
 *
 * @example
 * ```typescript
 * import { monitoring, recordMetric, checkHealth } from '@core-infrastructure/lib/monitoring';
 *
 * // Initialize monitoring
 * await monitoring.initialize({
 *   enableMetrics: true,
 *   enableLogging: true,
 *   logLevel: 'info',
 *   metricsRetention: 86400000, // 24 hours
 * });
 *
 * // Record metrics
 * recordMetric('api_request', 'latency', 150, { endpoint: '/users', method: 'GET' });
 *
 * // Log events
 * monitoring.log('info', 'User authenticated', { userId: '123', provider: 'oauth' });
 *
 * // Check system health
 * const health = await checkHealth();
 * console.log(`System status: ${health.status}`);
 * console.log(`Heap usage: ${health.heapUsagePercent}%`);
 * console.log(`Error rate: ${health.errorRate}%`);
 *
 * // Record API requests
 * const startTime = Date.now();
 * try {
 *   const response = await fetch('https://api.example.com/data');
 *   const latency = Date.now() - startTime;
 *   recordRequest('/api/data', 'GET', response.status, latency);
 * } catch (error) {
 *   const latency = Date.now() - startTime;
 *   recordRequest('/api/data', 'GET', 500, latency, error as Error);
 * }
 *
 * // Get performance metrics
 * const performance = monitoring.getPerformanceMetrics();
 * console.log(`Avg latency: ${performance.avgLatency}ms`);
 * console.log(`Request count: ${performance.requestCount}`);
 *
 * // Graceful shutdown
 * await monitoring.disconnect();
 * ```
 */

export * from './services/index';
export * from './types/index';
