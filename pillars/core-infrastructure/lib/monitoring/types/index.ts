/**
 * Type definitions for Monitoring module
 */

/**
 * Supported metric types
 */
export type MetricType = 'latency' | 'throughput' | 'count' | 'gauge';

/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Health check status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Single metric entry
 */
export interface MetricEntry {
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  tags: Record<string, string | number>;
}

/**
 * Log entry
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  metadata: Record<string, unknown>;
}

/**
 * Monitoring service configuration
 */
export interface MonitoringConfig {
  enableMetrics: boolean;
  enableLogging: boolean;
  enableHealthChecks: boolean;
  logLevel: LogLevel;
  metricsRetention: number; // milliseconds
  samplingRate: number; // 0-1
  enablePerformanceTracking: boolean;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  uptime: number;
  requestCount: number;
  errorCount: number;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  throughput: number;
  errorRate: number; // percentage
}

/**
 * Error metrics
 */
export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  lastError?: LogEntry;
  errorRate: number; // percentage
}

/**
 * Memory usage breakdown
 */
export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  arrayBuffers: number;
}

/**
 * CPU usage
 */
export interface CpuUsage {
  user: number;
  system: number;
}

/**
 * System metrics
 */
export interface SystemMetrics {
  memoryUsage: MemoryUsage;
  uptime: number;
  cpuUsage: CpuUsage;
}

/**
 * Aggregated metrics for health check
 */
export interface AggregatedMetrics {
  memory: MemoryUsage;
  cpu: CpuUsage;
  performance: PerformanceMetrics;
  errors: ErrorMetrics;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: number;
  heapUsagePercent: number;
  errorRate: number;
  avgLatency: number;
  uptime: number;
  metrics: AggregatedMetrics;
}

/**
 * Metrics by time range
 */
export interface MetricsByTimeRange {
  startTime: number;
  endTime: number;
  metrics: MetricEntry[];
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
}

/**
 * Monitoring event
 */
export interface MonitoringEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

/**
 * Alert threshold configuration
 */
export interface AlertThreshold {
  metric: string;
  threshold: number;
  operator: '>' | '<' | '==' | '!=' | '>=' | '<=';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Alert
 */
export interface Alert {
  id: string;
  threshold: AlertThreshold;
  triggeredAt: number;
  value: number;
  resolved: boolean;
  resolvedAt?: number;
}

/**
 * Monitoring dashboard data
 */
export interface MonitoringDashboard {
  timestamp: number;
  uptime: number;
  performance: PerformanceMetrics;
  errors: ErrorMetrics;
  system: SystemMetrics;
  health: HealthCheckResult;
  recentLogs: LogEntry[];
}
