/**
 * MonitoringService - Мониторинг производительности и ошибок
 */
export interface MetricData {
  [key: string]: any
}

export class MonitoringService {
  private static instance: MonitoringService
  private metrics: Map<string, number> = new Map()

  private constructor() {}

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService()
    }
    return MonitoringService.instance
  }

  log(message: string, data?: MetricData): void {
    console.log(`[LOG] ${message}`, data)
  }

  error(message: string, data?: MetricData): void {
    console.error(`[ERROR] ${message}`, data)
  }

  warn(message: string, data?: MetricData): void {
    console.warn(`[WARN] ${message}`, data)
  }

  info(message: string, data?: MetricData): void {
    console.info(`[INFO] ${message}`, data)
  }

  debug(message: string, data?: MetricData): void {
    if (process.env.DEBUG) {
      console.debug(`[DEBUG] ${message}`, data)
    }
  }

  trackEvent(event: string, data?: MetricData): void {
    console.log(`[EVENT] ${event}`, data)
  }

  logInfo(message: string, data?: MetricData): void {
    this.info(message, data)
  }

  logWarning(message: string, data?: MetricData): void {
    this.warn(message, data)
  }

  logError(message: string, data?: MetricData): void {
    this.error(message, data)
  }

  trackDuration(operation: string, duration: number): void {
    this.metrics.set(operation, duration)
    if (duration > 1000) {
      this.warn(`Operation took longer than 1s: ${operation}`, { duration })
    }
  }

  recordMetric(name: string, value: number): void {
    this.metrics.set(name, value)
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics)
  }

  clearMetrics(): void {
    this.metrics.clear()
  }
}

export const monitoringService = MonitoringService.getInstance()
