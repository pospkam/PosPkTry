/**
 * JWT Token Management
 * Utilities for creating and verifying JWT tokens
 */

import { SignJWT, jwtVerify } from 'jose';

const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRATION = '7d'; // 7 days

// Получаем секрет в runtime, а не при загрузке модуля (во время сборки)
function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return new TextEncoder().encode(secret);
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Create a new JWT token
 */
export async function createToken(payload: JWTPayload): Promise<string> {
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(getJWTSecret());

  return token;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Get user from NextRequest
 */
function getHeader(request: any, name: string): string | null {
  if (!request?.headers) return null;
  if (typeof request.headers.get === 'function') {
    return request.headers.get(name);
  }
  const entries = (typeof request.headers.entries === 'function'
    ? Array.from(request.headers.entries())
    : Object.entries(request.headers)) as string[][];
  const found = entries.find(([key]) => key?.toLowerCase() === name.toLowerCase());
  return found ? (found[1] as string) : null;
}

function getCookieValue(request: any, name: string): string | null {
  try {
    if (request?.cookies?.get) {
      const cookie = request.cookies.get(name);
      if (typeof cookie === 'string') {
        return cookie;
      }
      if (cookie?.value) {
        return cookie.value;
      }
    }
  } catch {
    // ignore
  }
  
  const cookieHeader =
    getHeader(request, 'cookie') ||
    request?.headers?.Cookie ||
    request?.headers?.cookie ||
    null;
  
  if (!cookieHeader) {
    return null;
  }
  
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  
  return null;
}

export async function getUserFromRequest(request: any): Promise<JWTPayload | null> {
  const authHeader = getHeader(request, 'authorization');
  let token = extractToken(authHeader);
  
  if (!token) {
    token = getCookieValue(request, 'auth_token');
  }
  
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      return payload;
    }
  }
  
  // Fallback to middleware headers if present (JWT уже проверен на уровне middleware)
  const headerUserId = getHeader(request, 'x-user-id');
  const headerEmail = getHeader(request, 'x-user-email');
  const headerRole = getHeader(request, 'x-user-role');
  
  if (headerUserId && headerRole) {
    return {
      userId: headerUserId,
      email: headerEmail || '',
      role: headerRole,
    };
  }
  
  return null;
}
