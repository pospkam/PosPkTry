/**
 * Monitoring services - Public API
 * @module @core-infrastructure/lib/monitoring/services
 */

export { MonitoringService, monitoring } from './MonitoringService';
export {
  recordMetric,
  log,
  recordRequest,
  recordDatabaseQuery,
  checkHealth,
  getPerformanceMetrics,
  getErrorMetrics,
  getSystemMetrics,
} from './MonitoringService';
