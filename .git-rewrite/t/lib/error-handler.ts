/**
 * Centralized API response helpers.
 * Ensures a consistent JSON shape across all route handlers:
 *   { success: true,  data?: T }
 *   { success: false, error: string }
 */

import { NextResponse } from 'next/server';

/** Return a standardised error response */
export function apiError(
  message: string,
  status: number = 500
): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

/** Return a standardised success response */
export function apiSuccess<T extends Record<string, unknown>>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status });
}
