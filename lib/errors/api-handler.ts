/**
 * lib/errors/api-handler.ts
 *
 * withErrorHandler — HOF для API routes.
 * Гарантирует что ни один stack trace / error.message не попадёт в ответ в production.
 *
 * Использование:
 *   export const POST = withErrorHandler(async (req) => { ... });
 *
 * Для постепенной миграции — оборачивай новые и критичные роуты.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

const IS_PROD = process.env.NODE_ENV === 'production';

// ── Карта известных PG error codes → понятные сообщения ──────────
const PG_ERROR_MESSAGES: Record<string, string> = {
  '23505': 'Запись с такими данными уже существует.',
  '23503': 'Связанные данные не найдены.',
  '23502': 'Обязательное поле не заполнено.',
  '42P01': 'Таблица не найдена. Обратитесь в поддержку.',
  '08006': 'Потеряно соединение с базой данных. Попробуйте позже.',
  '08001': 'Не удалось подключиться к базе данных.',
  '57014': 'Запрос занял слишком много времени. Попробуйте позже.',
};

// ── Ключевые слова в error.message → понятные сообщения ──────────
const MESSAGE_PATTERNS: Array<[RegExp, string]> = [
  [/not found/i,                  'Запись не найдена.'],
  [/unauthorized|не авторизован/i,'Необходима авторизация.'],
  [/forbidden|доступ запрещён/i,  'Доступ запрещён.'],
  [/duplicate|already exists/i,   'Такая запись уже существует.'],
  [/timeout|timed out/i,          'Превышено время ожидания. Попробуйте позже.'],
  [/connection refused/i,         'Сервис временно недоступен. Попробуйте позже.'],
  [/invalid.*token|jwt/i,         'Сессия истекла. Войдите снова.'],
];

interface PgError extends Error {
  code?: string;
}

export function classifyError(error: unknown): { message: string; status: number } {
  // Zod validation
  if (error instanceof ZodError) {
    const first = error.errors[0];
    return {
      message: first?.message ?? 'Неверные данные запроса.',
      status: 400,
    };
  }

  // Business logic errors (thrown with code)
  if (error instanceof Error) {
    // PG errors
    const pgErr = error as PgError;
    if (pgErr.code && PG_ERROR_MESSAGES[pgErr.code]) {
      return { message: PG_ERROR_MESSAGES[pgErr.code], status: 500 };
    }

    // Known message patterns — safe to expose (user-friendly)
    for (const [pattern, msg] of MESSAGE_PATTERNS) {
      if (pattern.test(error.message)) {
        return { message: msg, status: error.message.match(/not found/i) ? 404 : 400 };
      }
    }

    // In development: show raw message (helpful for debugging)
    if (!IS_PROD) {
      return { message: error.message, status: 500 };
    }
  }

  // Production fallback: never expose raw errors
  return {
    message: 'Внутренняя ошибка сервера. Попробуйте позже.',
    status: 500,
  };
}

// ── Context для роутов с параметрами ([id]/route.ts) ─────────────
type RouteContext = { params?: Record<string, string> };

type Handler = (
  req: NextRequest,
  ctx?: RouteContext,
) => Promise<NextResponse> | NextResponse;

export function withErrorHandler(handler: Handler): Handler {
  return async (req: NextRequest, ctx?: RouteContext) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      const { message, status } = classifyError(error);
      return NextResponse.json(
        { success: false, error: message },
        { status },
      );
    }
  };
}
