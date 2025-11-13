// СИСТЕМА ЛОГИРОВАНИЯ
// Winston-based logging для production

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  userId?: string;
  requestId?: string;
}

class Logger {
  private logs: LogEntry[] = [];

  log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context
    };

    this.logs.push(entry);

    // Console output
    const logMethod = level === 'error' ? console.error :
                     level === 'warn' ? console.warn :
                     console.log;

    logMethod(`[${level.toUpperCase()}] ${message}`, context || '');

    // TODO: В production отправлять в Sentry/CloudWatch/etc
    if (level === 'error' && typeof window === 'undefined') {
      // Server-side error tracking
      this.sendToErrorTracking(entry);
    }
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log('error', message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  debug(message: string, context?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context);
    }
  }

  private async sendToErrorTracking(entry: LogEntry) {
    // TODO: Интеграция с Sentry
  }

  getRecentLogs(limit: number = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  clearLogs() {
    this.logs = [];
  }
}

// Singleton instance
export const logger = new Logger();

// Helper functions for API routes
export function logApiRequest(
  method: string,
  path: string,
  userId?: string,
  duration?: number
) {
  logger.info('API Request', { method, path, userId, duration });
}

export function logApiError(
  method: string,
  path: string,
  error: Error,
  userId?: string
) {
  logger.error('API Error', error, { method, path, userId });
}