import {
  MetricType,
  MetricEntry,
  LogLevel,
  LogEntry,
  MonitoringConfig,
  HealthCheckResult,
  PerformanceMetrics,
  ErrorMetrics,
  SystemMetrics,
} from '../types/index';

/**
 * MonitoringService - Singleton service for application monitoring, metrics collection, and logging
 *
 * Features:
 * - Metrics collection (performance, errors, custom)
 * - Structured logging with multiple levels
 * - Health checks for system components
 * - Performance tracking (latency, throughput)
 * - Error tracking and aggregation
 * - Memory and CPU monitoring
 * - Event logging for audit trails
 *
 * @example
 * const monitoring = MonitoringService.getInstance();
 * await monitoring.initialize();
 *
 * // Track performance
 * monitoring.recordMetric('api_request', 'latency', 150, { endpoint: '/users' });
 *
 * // Log events
 * monitoring.log('info', 'User login', { userId: '123' });
 *
 * // Check health
 * const health = await monitoring.checkHealth();
 */
class MonitoringService {
  private static instance: MonitoringService;
  private metrics: Map<string, MetricEntry[]> = new Map();
  private logs: LogEntry[] = [];
  private config: MonitoringConfig;
  private startTime: number = Date.now();
  private requestCounter: number = 0;
  private errorCounter: number = 0;
  private initialized: boolean = false;
  private memorySnapshots: number[] = [];
  private cpuSnapshots: number[] = [];
  private maxMetricsPerKey: number = 10000;
  private maxLogs: number = 50000;

  private constructor() {
    this.config = {
      enableMetrics: true,
      enableLogging: true,
      enableHealthChecks: true,
      logLevel: 'info',
      metricsRetention: 86400000, // 24 hours
      samplingRate: 1.0,
      enablePerformanceTracking: true,
    };
  }

  /**
   * Get singleton instance of MonitoringService
   */
  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Initialize monitoring service with custom config
   */
  async initialize(config?: Partial<MonitoringConfig>): Promise<void> {
    if (this.initialized) {
      console.warn('MonitoringService already initialized');
      return;
    }

    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.startTime = Date.now();
    this.initialized = true;

    this.log('info', 'MonitoringService initialized', {
      config: this.config,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Record a metric
   * @param name - Metric name (e.g., 'api_request', 'db_query')
   * @param type - Metric type ('latency', 'throughput', 'count', 'gauge')
   * @param value - Metric value
   * @param tags - Optional tags for categorization
   */
  recordMetric(
    name: string,
    type: MetricType,
    value: number,
    tags?: Record<string, string | number>
  ): void {
    if (!this.config.enableMetrics) return;

    // Apply sampling
    if (Math.random() > this.config.samplingRate) return;

    const key = this.getMetricKey(name, type, tags);
    const entry: MetricEntry = {
      name,
      type,
      value,
      timestamp: Date.now(),
      tags: tags || {},
    };

    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const entries = this.metrics.get(key)!;
    entries.push(entry);

    // Keep only recent metrics
    if (entries.length > this.maxMetricsPerKey) {
      entries.shift();
    }

    // Auto-cleanup old metrics
    this.cleanupOldMetrics();
  }

  /**
   * Get metrics by name and optional filters
   */
  getMetrics(
    name: string,
    type?: MetricType,
    tags?: Record<string, string | number>
  ): MetricEntry[] {
    const key = this.getMetricKey(name, type, tags);
    return this.metrics.get(key) || [];
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, MetricEntry[]> {
    return new Map(this.metrics);
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const now = Date.now();
    const uptime = now - this.startTime;

    const latencyMetrics = this.getMetrics('api_request', 'latency');
    const throughputMetrics = this.getMetrics('api_request', 'throughput');

    const avgLatency =
      latencyMetrics.length > 0
        ? latencyMetrics.reduce((sum, m) => sum + m.value, 0) / latencyMetrics.length
        : 0;

    const maxLatency =
      latencyMetrics.length > 0
        ? Math.max(...latencyMetrics.map((m) => m.value))
        : 0;

    const minLatency =
      latencyMetrics.length > 0
        ? Math.min(...latencyMetrics.map((m) => m.value))
        : 0;

    const throughput =
      throughputMetrics.length > 0
        ? throughputMetrics.reduce((sum, m) => sum + m.value, 0)
        : 0;

    return {
      uptime,
      requestCount: this.requestCounter,
      errorCount: this.errorCounter,
      avgLatency,
      maxLatency,
      minLatency,
      throughput,
      errorRate: this.requestCounter > 0 ? (this.errorCounter / this.requestCounter) * 100 : 0,
    };
  }

  /**
   * Get error metrics summary
   */
  getErrorMetrics(): ErrorMetrics {
    const errorLogs = this.logs.filter((log) => log.level === 'error');
    const errorsByType: Record<string, number> = {};

    errorLogs.forEach((log) => {
      const type = log.metadata?.errorType || 'unknown';
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    });

    return {
      totalErrors: errorLogs.length,
      errorsByType,
      lastError: errorLogs.length > 0 ? errorLogs[errorLogs.length - 1] : undefined,
      errorRate: this.requestCounter > 0 ? (this.errorCounter / this.requestCounter) * 100 : 0,
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memory = process.memoryUsage();

    return {
      memoryUsage: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        rss: memory.rss,
        external: memory.external,
        arrayBuffers: memory.arrayBuffers,
      },
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
    };
  }

  /**
   * Log a message with level and optional metadata
   */
  log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.enableLogging) return;

    // Check log level
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    if (levels[level] < levels[this.config.logLevel]) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      metadata: metadata || {},
    };

    this.logs.push(logEntry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const logFn = console[level] || console.log;
      logFn(`[${level.toUpperCase()}] ${message}`, metadata || {});
    }
  }

  /**
   * Get logs with optional filtering
   */
  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filtered = this.logs;

    if (level) {
      filtered = filtered.filter((log) => log.level === level);
    }

    if (limit && limit > 0) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  /**
   * Record an API request
   */
  recordRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    latency: number,
    error?: Error
  ): void {
    this.requestCounter++;

    if (statusCode >= 400) {
      this.errorCounter++;
      this.log('error', `API Error: ${method} ${endpoint}`, {
        statusCode,
        latency,
        errorMessage: error?.message,
        errorStack: error?.stack,
      });
    } else if (statusCode >= 300) {
      this.log('warn', `API Redirect: ${method} ${endpoint}`, {
        statusCode,
        latency,
      });
    } else {
      this.log('debug', `API Request: ${method} ${endpoint}`, {
        statusCode,
        latency,
      });
    }

    this.recordMetric('api_request', 'latency', latency, {
      endpoint,
      method,
      statusCode,
    });
  }

  /**
   * Record a database query
   */
  recordDatabaseQuery(
    query: string,
    duration: number,
    rowsAffected?: number,
    error?: Error
  ): void {
    if (error) {
      this.log('error', `Database Error: ${query.substring(0, 100)}`, {
        duration,
        errorMessage: error.message,
      });
    } else {
      this.log('debug', `Database Query: ${query.substring(0, 100)}`, {
        duration,
        rowsAffected,
      });
    }

    this.recordMetric('database_query', 'latency', duration, {
      rowsAffected: rowsAffected || 0,
    });
  }

  /**
   * Check health of system components
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const systemMetrics = this.getSystemMetrics();
    const errorMetrics = this.getErrorMetrics();
    const performanceMetrics = this.getPerformanceMetrics();

    const heapUsagePercent =
      (systemMetrics.memoryUsage.heapUsed / systemMetrics.memoryUsage.heapTotal) * 100;

    const isHealthy =
      heapUsagePercent < 90 &&
      errorMetrics.errorRate < 5 &&
      systemMetrics.memoryUsage.heapUsed < 1024 * 1024 * 1024; // 1GB

    const status = isHealthy
      ? ('healthy' as const)
      : heapUsagePercent > 90
        ? ('degraded' as const)
        : ('unhealthy' as const);

    return {
      status,
      timestamp: Date.now(),
      heapUsagePercent,
      errorRate: errorMetrics.errorRate,
      avgLatency: performanceMetrics.avgLatency,
      uptime: performanceMetrics.uptime,
      metrics: {
        memory: systemMetrics.memoryUsage,
        cpu: systemMetrics.cpuUsage,
        performance: performanceMetrics,
        errors: errorMetrics,
      },
    };
  }

  /**
   * Reset all metrics and logs
   */
  reset(): void {
    this.metrics.clear();
    this.logs = [];
    this.requestCounter = 0;
    this.errorCounter = 0;
    this.log('info', 'MonitoringService reset', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Clear metrics older than retention period
   */
  private cleanupOldMetrics(): void {
    const now = Date.now();
    const cutoffTime = now - this.config.metricsRetention;

    this.metrics.forEach((entries) => {
      const i = entries.findIndex((entry) => entry.timestamp > cutoffTime);
      if (i > 0) {
        entries.splice(0, i);
      }
    });
  }

  /**
   * Generate metric key for grouping
   */
  private getMetricKey(
    name: string,
    type?: MetricType,
    tags?: Record<string, string | number>
  ): string {
    const parts = [name, type || 'all'];

    if (tags) {
      const tagString = Object.entries(tags)
        .map(([k, v]) => `${k}:${v}`)
        .join(',');
      parts.push(tagString);
    }

    return parts.join('|');
  }

  /**
   * Get monitoring configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    this.log('info', 'MonitoringService shutting down', {
      metrics: this.metrics.size,
      logs: this.logs.length,
      timestamp: new Date().toISOString(),
    });

    this.initialized = false;
  }
}

// Create singleton instance export
export const monitoring = MonitoringService.getInstance();

// Convenience functions for direct usage
export const recordMetric = (
  name: string,
  type: MetricType,
  value: number,
  tags?: Record<string, string | number>
) => monitoring.recordMetric(name, type, value, tags);

export const log = (
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>
) => monitoring.log(level, message, metadata);

export const recordRequest = (
  endpoint: string,
  method: string,
  statusCode: number,
  latency: number,
  error?: Error
) => monitoring.recordRequest(endpoint, method, statusCode, latency, error);

export const recordDatabaseQuery = (
  query: string,
  duration: number,
  rowsAffected?: number,
  error?: Error
) => monitoring.recordDatabaseQuery(query, duration, rowsAffected, error);

export const checkHealth = async () => monitoring.checkHealth();

export const getPerformanceMetrics = () => monitoring.getPerformanceMetrics();

export const getErrorMetrics = () => monitoring.getErrorMetrics();

export const getSystemMetrics = () => monitoring.getSystemMetrics();

export { MonitoringService };
