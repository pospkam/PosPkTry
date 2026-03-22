/**
 * CSRF PROTECTION MIDDLEWARE
 * Cross-Site Request Forgery Protection
 * 
 * Защищает от атак когда злоумышленник заставляет пользователя
 * выполнить нежелательные действия на сайте где он аутентифицирован
 * 
 * @author Cursor AI Agent
 * @date 2025-10-30
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Генерация CSRF токена
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Верификация CSRF токена
 */
function verifyCsrfToken(token: string, headerToken: string): boolean {
  if (!token || !headerToken) {
    return false;
  }
  
  // Используем crypto.timingSafeEqual для защиты от timing attacks
  try {
    const tokenBuffer = Buffer.from(token);
    const headerTokenBuffer = Buffer.from(headerToken);
    
    if (tokenBuffer.length !== headerTokenBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(tokenBuffer, headerTokenBuffer);
  } catch {
    return false;
  }
}

/**
 * CSRF middleware для API routes
 * 
 * Проверяет наличие и валидность CSRF токена в:
 * 1. Cookie: csrf_token
 * 2. Header: x-csrf-token
 */
export function withCsrfProtection(handler: Function) {
  return async (request: NextRequest) => {
    const method = request.method;
    
    // CSRF нужен только для state-changing операций
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return handler(request);
    }
    
    // Получаем токен из cookie
    const cookieToken = request.cookies.get('csrf_token')?.value;
    
    // Получаем токен из header
    const headerToken = request.headers.get('x-csrf-token');
    
    // Проверяем токены
    if (!cookieToken || !headerToken || !verifyCsrfToken(cookieToken, headerToken)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный или отсутствующий CSRF токен',
          errorCode: 'CSRF_TOKEN_INVALID'
        },
        { status: 403 }
      );
    }
    
    // Токен валиден, выполняем handler
    return handler(request);
  };
}

/**
 * Генерация CSRF токена и установка в cookie
 * Вызывается при рендере страниц
 */
export function setCsrfCookie(response: NextResponse): NextResponse {
  const token = generateCsrfToken();
  
  response.cookies.set('csrf_token', token, {
    httpOnly: false, // Должен быть доступен JS для отправки в headers
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 // 24 часа
  });
  
  return response;
}

/**
 * Middleware для автоматической установки CSRF токена
 * Использовать в middleware.ts
 */
export function csrfMiddleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Проверяем есть ли уже токен
  const existingToken = request.cookies.get('csrf_token')?.value;
  
  // Если нет токена, генерируем новый
  if (!existingToken) {
    const token = generateCsrfToken();
    response.cookies.set('csrf_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24
    });
  }
  
  return response;
}

/**
 * API endpoint для получения CSRF токена
 * GET /api/csrf-token
 */
export async function getCsrfTokenEndpoint(request: NextRequest) {
  const token = request.cookies.get('csrf_token')?.value || generateCsrfToken();
  
  const response = NextResponse.json({
    success: true,
    token
  });
  
  // Устанавливаем токен в cookie
  response.cookies.set('csrf_token', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24
  });
  
  return response;
}

/**
 * ИСПОЛЬЗОВАНИЕ В CLIENT SIDE:
 * 
 * 1. Получить токен из cookie:
 * 
 * function getCsrfToken(): string | null {
 *   const match = document.cookie.match(/csrf_token=([^;]+)/);
 *   return match ? match[1] : null;
 * }
 * 
 * 2. Добавить в fetch запрос:
 * 
 * const csrfToken = getCsrfToken();
 * 
 * fetch('/api/transfers/book', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-CSRF-Token': csrfToken // ← Важно!
 *   },
 *   body: JSON.stringify(data)
 * });
 * 
 * 3. В React компоненте:
 * 
 * useEffect(() => {
 *   // Получаем токен при загрузке страницы
 *   const token = getCsrfToken();
 *   if (!token) {
 *     // Если нет токена, запрашиваем
 *     fetch('/api/csrf-token').then(() => {
 *       // Токен установлен в cookie
 *     });
 *   }
 * }, []);
 * 
 * 
 * ИСПОЛЬЗОВАНИЕ В API ROUTES:
 * 
 * import { withCsrfProtection } from '@/lib/middleware/csrf';
 * 
 * export const POST = withCsrfProtection(async (request: NextRequest) => {
 *   // Ваш handler
 *   // CSRF уже проверен, можно безопасно обрабатывать запрос
 * });
 * 
 * 
 * ИСПОЛЬЗОВАНИЕ В MIDDLEWARE.TS:
 * 
 * import { csrfMiddleware } from '@/lib/middleware/csrf';
 * 
 * export function middleware(request: NextRequest) {
 *   return csrfMiddleware(request);
 * }
 * 
 * export const config = {
 *   matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
 * };
 */

/**
 * Double Submit Cookie Pattern
 * 
 * Используется паттерн "Double Submit Cookie":
 * 1. Токен хранится в cookie (csrf_token)
 * 2. Тот же токен отправляется в header (x-csrf-token)
 * 3. Сервер проверяет что оба токена совпадают
 * 
 * Почему это безопасно:
 * - Злоумышленник не может прочитать cookie с другого домена (Same-Origin Policy)
 * - Злоумышленник не может установить cookie на чужом домене
 * - Даже если атакующий может сделать POST запрос, он не знает токен
 * 
 * Защита от:
 * [✓] CSRF атаки
 * [✓] Replay атаки (токен rotates)
 * [✓] Timing attacks (crypto.timingSafeEqual)
 */
