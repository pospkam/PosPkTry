/**
 * lib/errors/sanitize.ts
 * Security: Sanitize error messages for client responses
 * Never expose stack traces, file paths, or technical details to clients
 */

export interface SafeError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Convert thrown errors to safe client response
 * - In production: returns generic message
 * - In development: can return full error for debugging
 */
export function sanitizeError(error: unknown, isDev = false): SafeError {
  const isProduction = process.env.NODE_ENV === 'production';

  // If already a safe error object, return as-is
  if (error && typeof error === 'object' && 'message' in error && 'code' in error) {
    return error as SafeError;
  }

  // If it's an Error instance
  if (error instanceof Error) {
    // In development, return full error for debugging
    if (isDev || !isProduction) {
      return {
        message: error.message,
        code: 'INTERNAL_ERROR',
        status: 500,
      };
    }

    // In production, return generic message (never expose stack trace)
    return {
      message: 'An internal error occurred. Please try again later.',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
  }

  // For any other value, return generic message
  return {
    message: isProduction ? 'An unknown error occurred.' : String(error),
    code: 'UNKNOWN_ERROR',
    status: 500,
  };
}

/**
 * Check if error looks like database connection issue
 */
export function isDatabaseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('ENOTFOUND') ||
    error.message.includes('pool') ||
    error.message.includes('connection') ||
    error.message.includes('timeout')
  );
}

/**
 * Check if error is a validation/client error (not server error)
 */
export function isClientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes('validation') || error.message.includes('not found');
}

/**
 * Safe error message for client response.
 * In production: never exposes raw error.message.
 * In development: returns the actual message for debugging.
 *
 * Drop-in replacement for: `error instanceof Error ? error.message : 'Unknown'`
 */
export function safeMsg(error: unknown, fallback = 'Внутренняя ошибка сервера'): string {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) return fallback;
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Log error for debugging (without exposing to client)
 */
export function logError(context: string, error: unknown): void {
  if (process.env.NODE_ENV === 'production') {
    // In production, log only essentials (errors should be in APM like Sentry)
    const isDb = isDatabaseError(error);
    if (isDb) {
      // Database errors are usually critical
      console.error(`[${context}] Database error occurred`);
    }
    return;
  }

  // In non-prod environments, log full details for debugging
  if (error instanceof Error) {
    console.error(`[${context}] ${error.message}\n${error.stack}`);
  } else {
    console.error(`[${context}] ${String(error)}`);
  }
}
