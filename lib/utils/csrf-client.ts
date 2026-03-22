/**
 * CSRF CLIENT UTILITIES
 * Утилиты для работы с CSRF токенами на клиенте
 */

/**
 * Получить CSRF токен из cookie
 * @returns {string | null} CSRF токен или null, если не найден
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Загрузить CSRF токен с сервера если его нет
 * @returns {Promise<string | null>} CSRF токен или null
 */
export async function ensureCsrfToken(): Promise<string | null> {
  let token = getCsrfToken();
  
  if (!token) {
    try {
      const response = await fetch('/api/csrf-token');
      const data = await response.json();
      token = data.token;
    } catch (error) {
      return null;
    }
  }
  
  return token;
}

/**
 * fetchWithCsrf — обертка для fetch с автоматическим добавлением CSRF токена
 * @param {string} url - URL запроса
 * @param {RequestInit} options - опции fetch
 * @returns {Promise<Response>} Ответ fetch
 * @throws {Error} если CSRF токен не получен
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Для GET запросов CSRF не нужен
  if (!options.method || options.method === 'GET' || options.method === 'HEAD') {
    return fetch(url, options);
  }
  
  // Получаем токен
  const token = await ensureCsrfToken();
  
  if (!token) {
    throw new Error('CSRF token not available');
  }
  
  // Добавляем токен в headers
  const headers = new Headers(options.headers);
  headers.set('X-CSRF-Token', token);
  
  return fetch(url, {
    ...options,
    headers
  });
}

// Для Next.js без React import
import * as React from 'react';

/**
 * React hook для получения CSRF токена
 * @returns {string | null} CSRF токен
 */
export function useCsrfToken(): string | null {
  const [token, setToken] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      ensureCsrfToken().then(setToken);
    }
  }, []);
  
  return token;
}

/**
 * Пример использования:
 * 
 * import { fetchWithCsrf } from '@/lib/utils/csrf-client';
 * 
 * // Вместо обычного fetch:
 * const response = await fetchWithCsrf('/api/transfers/book', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(data)
 * });
 * 
 * // CSRF токен автоматически добавлен в headers!
 * 
 * 
 * В React компоненте:
 * 
 * import { useCsrfToken, fetchWithCsrf } from '@/lib/utils/csrf-client';
 * 
 * function BookingForm() {
 *   const csrfToken = useCsrfToken();
 *   
 *   const handleSubmit = async (data) => {
 *     const response = await fetchWithCsrf('/api/transfers/book', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(data)
 *     });
 *   };
 * }
 */
