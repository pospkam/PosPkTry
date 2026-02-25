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

interface RequestLike {
  headers?: Headers | Record<string, string | undefined>;
  cookies?: {
    get?: (name: string) => { value?: string } | string | undefined;
  };
}

/**
 * Create a new JWT token
 */
export async function createToken(payload: JWTPayload): Promise<string> {
  const token = await new SignJWT(payload)
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
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      iat: typeof payload.iat === 'number' ? payload.iat : undefined,
      exp: typeof payload.exp === 'number' ? payload.exp : undefined,
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const normalizedHeader = authHeader.trim();
  if (!normalizedHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return normalizedHeader.slice(7).trim() || null;
}

/**
 * Get user from NextRequest
 */
function getHeader(request: RequestLike, name: string): string | null {
  if (!request?.headers) {
    return null;
  }

  if (request.headers instanceof Headers) {
    return request.headers.get(name);
  }

  const lowerName = name.toLowerCase();
  const headerValue = request.headers[name] ?? request.headers[lowerName];
  return typeof headerValue === 'string' ? headerValue : null;
}

function getCookieValue(request: RequestLike, name: string): string | null {
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
  
  const cookieHeader = getHeader(request, 'cookie');
  
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

export async function getUserFromRequest(request: RequestLike): Promise<JWTPayload | null> {
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
  
  // Fallback разрешен только если middleware явно отметил запрос как проверенный
  const authVerifiedByMiddleware = getHeader(request, 'x-auth-verified') === 'true';
  if (!authVerifiedByMiddleware) {
    return null;
  }

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
