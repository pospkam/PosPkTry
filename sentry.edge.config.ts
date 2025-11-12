/**
 * Sentry Edge Configuration
 * Конфигурация для Edge Runtime (Middleware, Edge API Routes)
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Edge runtime имеет ограничения, поэтому упрощенная конфигурация
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
  
  environment: process.env.NODE_ENV,
  
  debug: false, // Edge не поддерживает debug mode
  
  // Минимальная фильтрация для Edge
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    return event;
  },
});





