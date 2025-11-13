/**
 * Sentry Server Configuration
 * Конфигурация для серверной части (Node.js)
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Настройка трассировки производительности
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Окружение
  environment: process.env.NODE_ENV,
  
  // Включить отладку в development
  debug: process.env.NODE_ENV === 'development',
  
  // Фильтрация ошибок
  beforeSend(event, hint) {
    // Не отправлять ошибки в development
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
      return null;
    }
    
    // Фильтруем чувствительные данные
    if (event.request?.data) {
      const data = event.request.data as any;
      if (data.password) data.password = '[FILTERED]';
      if (data.token) data.token = '[FILTERED]';
      if (data.apiKey) data.apiKey = '[FILTERED]';
    }
    
    return event;
  },
  
  // Настройка контекста
  beforeBreadcrumb(breadcrumb, hint) {
    // Фильтровать SQL запросы с чувствительными данными
    if (breadcrumb.category === 'query' && breadcrumb.message) {
      breadcrumb.message = breadcrumb.message.replace(/password\s*=\s*'[^']*'/gi, "password='[FILTERED]'");
    }
    
    return breadcrumb;
  },
  
  // Интеграции
  integrations: [
    // PostgreSQL трассировка
    new Sentry.Integrations.Postgres(),
  ],
});

// Глобальный обработчик unhandled rejections
process.on('unhandledRejection', (reason: any) => {
  Sentry.captureException(reason);
});

// Глобальный обработчик uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  Sentry.captureException(error);
  // Даем Sentry время отправить ошибку перед завершением
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});





