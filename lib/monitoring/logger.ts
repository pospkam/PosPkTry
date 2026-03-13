// СИСТЕМА ЛОГИРОВАНИЯ
// Winston-based logging для production

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  userId?: string;
  requestId?: string;
}

class Logger {
  private logs: LogEntry[] = [];

  log(level: LogLevel, message: string, context?: Record<string, unknown>) {
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

    if (level === 'error' && typeof window === 'undefined') {
      this.sendToErrorTracking(entry);
    }
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log('error', message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context);
    }
  }

  private async sendToErrorTracking(_entry: LogEntry) {
    // External error tracking integration placeholder
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