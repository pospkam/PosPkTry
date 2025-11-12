/**
 * Sentry Utility Functions
 * Утилиты для работы с Sentry
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Захватывает ошибку с дополнительным контекстом
 */
export function captureError(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    user?: { id: string; email?: string; role?: string };
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  }
) {
  Sentry.withScope((scope) => {
    // Добавляем теги
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    // Добавляем дополнительные данные
    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    // Добавляем информацию о пользователе
    if (context?.user) {
      scope.setUser(context.user);
    }
    
    // Устанавливаем уровень
    if (context?.level) {
      scope.setLevel(context.level);
    }
    
    // Захватываем ошибку
    Sentry.captureException(error);
  });
}

/**
 * Записывает сообщение в Sentry
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
) {
  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    Sentry.captureMessage(message, level);
  });
}

/**
 * Начинает транзакцию для трассировки производительности
 */
export function startTransaction(
  name: string,
  op: string,
  data?: Record<string, any>
) {
  const transaction = Sentry.startTransaction({
    name,
    op,
    data,
  });
  
  return {
    transaction,
    finish: () => transaction.finish(),
    setData: (key: string, value: any) => transaction.setData(key, value),
    setTag: (key: string, value: string) => transaction.setTag(key, value),
  };
}

/**
 * Добавляет breadcrumb для отслеживания действий пользователя
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Устанавливает информацию о пользователе
 */
export function setUser(user: {
  id: string;
  email?: string;
  username?: string;
  role?: string;
} | null) {
  Sentry.setUser(user);
}

/**
 * Очищает информацию о пользователе
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Устанавливает глобальный тег
 */
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

/**
 * Устанавливает глобальный контекст
 */
export function setContext(name: string, context: Record<string, any>) {
  Sentry.setContext(name, context);
}

/**
 * Wrapper для async функций с автоматической обработкой ошибок
 */
export function withSentry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: {
    operation: string;
    tags?: Record<string, string>;
  }
): T {
  return (async (...args: any[]) => {
    const transaction = context
      ? startTransaction(context.operation, 'function')
      : null;
    
    if (context?.tags && transaction) {
      Object.entries(context.tags).forEach(([key, value]) => {
        transaction.setTag(key, value);
      });
    }
    
    try {
      const result = await fn(...args);
      transaction?.finish();
      return result;
    } catch (error) {
      captureError(error as Error, {
        tags: context?.tags,
        extra: { args },
      });
      transaction?.finish();
      throw error;
    }
  }) as T;
}

/**
 * Измеряет время выполнения функции
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const transaction = startTransaction(name, 'measure');
  
  try {
    const result = await fn();
    transaction.finish();
    return result;
  } catch (error) {
    transaction.finish();
    throw error;
  }
}





