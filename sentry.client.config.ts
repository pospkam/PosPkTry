/**
 * Sentry Client Configuration
 * Конфигурация для клиентской части (браузер)
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Настройка трассировки производительности
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Окружение
  environment: process.env.NODE_ENV,
  
  // Включить отладку в development
  debug: process.env.NODE_ENV === 'development',
  
  // Фильтрация ошибок
  beforeSend(event, hint) {
    // Игнорировать сетевые ошибки CORS
    if (event.exception?.values?.[0]?.type === 'NetworkError') {
      return null;
    }
    
    // Игнорировать известные ошибки браузера
    if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
      return null;
    }
    
    return event;
  },
  
  // Настройка Breadcrumbs
  beforeBreadcrumb(breadcrumb, hint) {
    // Фильтровать чувствительные данные из console.log
    if (breadcrumb.category === 'console' && breadcrumb.message) {
      // Удаляем токены, пароли и т.д.
      breadcrumb.message = breadcrumb.message.replace(/token[=:]\s*[\w-]+/gi, 'token=[FILTERED]');
      breadcrumb.message = breadcrumb.message.replace(/password[=:]\s*\S+/gi, 'password=[FILTERED]');
    }
    
    return breadcrumb;
  },
  
  // Интеграции
  integrations: [
    new Sentry.BrowserTracing({
      // Трассировка навигации
      tracePropagationTargets: ['localhost', /^https:\/\/kamhub\.ru/],
    }),
    new Sentry.Replay({
      // Session Replay для отладки
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Session Replay частота
  replaysSessionSampleRate: 0.1, // 10% сессий
  replaysOnErrorSampleRate: 1.0, // 100% сессий с ошибками
});





