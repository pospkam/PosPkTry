// =============================================
// СИСТЕМА МОНИТОРИНГА И ЛОГИРОВАНИЯ
// Kamchatour Hub - Monitoring System
// =============================================

interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

interface LogEntry {
  timestamp: Date;
  level: keyof LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  context?: Record<string, any>;
}

interface ErrorReport {
  error: Error;
  context: Record<string, any>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  timestamp: Date;
}

class MonitoringSystem {
  private logs: LogEntry[] = [];
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorReport[] = [];

  // Логирование
  log(level: keyof LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
    };

    this.logs.push(entry);

    // Отправка в консоль для разработки
    if (process.env.NODE_ENV === 'development') {
      (console as any)[level](`[${entry.timestamp.toISOString()}] ${message}`, context);
    }

    // Отправка в внешний сервис для продакшена
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(entry);
    }
  }

  // Метрики производительности
  recordMetric(name: string, value: number, unit: string, context?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      context,
    };

    this.metrics.push(metric);

    // Отправка в внешний сервис
    if (process.env.NODE_ENV === 'production') {
      this.sendMetricToExternalService(metric);
    }
  }

  // Обработка ошибок
  reportError(error: Error, context?: Record<string, any>) {
    const errorReport: ErrorReport = {
      error,
      context: context || {},
      timestamp: new Date(),
    };

    this.errors.push(errorReport);

    // Логирование ошибки
    this.log('ERROR', error.message, {
      stack: error.stack,
      ...context,
    });

    // Отправка в внешний сервис
    if (process.env.NODE_ENV === 'production') {
      this.sendErrorToExternalService(errorReport);
    }
  }

  // Отправка в внешний сервис (заглушка)
  private async sendToExternalService(entry: LogEntry) {
    try {
      // Здесь будет интеграция с внешним сервисом логирования
      // Например, Sentry, LogRocket, или собственный сервис
      console.log('Sending log to external service:', entry);
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  private async sendMetricToExternalService(metric: PerformanceMetric) {
    try {
      // Здесь будет интеграция с сервисом метрик
      // Например, DataDog, New Relic, или собственный сервис
      console.log('Sending metric to external service:', metric);
    } catch (error) {
      console.error('Failed to send metric to external service:', error);
    }
  }

  private async sendErrorToExternalService(errorReport: ErrorReport) {
    try {
      // Здесь будет интеграция с сервисом ошибок
      // Например, Sentry, Bugsnag, или собственный сервис
      console.log('Sending error to external service:', errorReport);
    } catch (error) {
      console.error('Failed to send error to external service:', error);
    }
  }

  // Получение статистики
  getStats() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentLogs = this.logs.filter(log => log.timestamp > last24Hours);
    const recentMetrics = this.metrics.filter(metric => metric.timestamp > last24Hours);
    const recentErrors = this.errors.filter(error => error.timestamp > last24Hours);

    return {
      logs: {
        total: this.logs.length,
        last24Hours: recentLogs.length,
        byLevel: recentLogs.reduce((acc, log) => {
          acc[log.level] = (acc[log.level] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      metrics: {
        total: this.metrics.length,
        last24Hours: recentMetrics.length,
        byName: recentMetrics.reduce((acc, metric) => {
          if (!acc[metric.name]) {
            acc[metric.name] = [];
          }
          acc[metric.name].push(metric.value);
          return acc;
        }, {} as Record<string, number[]>),
      },
      errors: {
        total: this.errors.length,
        last24Hours: recentErrors.length,
        byType: recentErrors.reduce((acc, error) => {
          const type = error.error.name || 'Unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    };
  }

  // Очистка старых данных
  cleanup() {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 дней

    this.logs = this.logs.filter(log => log.timestamp > cutoff);
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff);
    this.errors = this.errors.filter(error => error.timestamp > cutoff);
  }
}

// Создаем глобальный экземпляр
export const monitoring = new MonitoringSystem();

// Экспортируем типы
export type { LogEntry, PerformanceMetric, ErrorReport };

// Утилиты для удобства
export const logger = {
  error: (message: string, context?: Record<string, any>) => 
    monitoring.log('ERROR', message, context),
  warn: (message: string, context?: Record<string, any>) => 
    monitoring.log('WARN', message, context),
  info: (message: string, context?: Record<string, any>) => 
    monitoring.log('INFO', message, context),
  debug: (message: string, context?: Record<string, any>) => 
    monitoring.log('DEBUG', message, context),
};

export const metrics = {
  record: (name: string, value: number, unit: string, context?: Record<string, any>) =>
    monitoring.recordMetric(name, value, unit, context),
};

export const errors = {
  report: (error: Error, context?: Record<string, any>) =>
    monitoring.reportError(error, context),
};

// Middleware для Next.js API routes
export function withMonitoring(handler: Function) {
  return async (req: any, res: any) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);

    try {
      // Логируем начало запроса
      logger.info('API request started', {
        method: req.method,
        url: req.url,
        requestId,
      });

      // Выполняем обработчик
      const result = await handler(req, res);

      // Логируем успешное завершение
      const duration = Date.now() - startTime;
      logger.info('API request completed', {
        method: req.method,
        url: req.url,
        requestId,
        duration: `${duration}ms`,
      });

      // Записываем метрику производительности
      metrics.record('api_request_duration', duration, 'ms', {
        method: req.method,
        url: req.url,
      });

      return result;
    } catch (error) {
      // Логируем ошибку
      const duration = Date.now() - startTime;
      logger.error('API request failed', {
        method: req.method,
        url: req.url,
        requestId,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Отправляем отчет об ошибке
      errors.report(error instanceof Error ? error : new Error('Unknown error'), {
        method: req.method,
        url: req.url,
        requestId,
      });

      throw error;
    }
  };
}
// monitoringService alias with extended API
export const monitoringService = {
  ...monitoring,
  getMetrics() {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  },
};
