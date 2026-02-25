/**
 * NEXT.JS MIDDLEWARE
 * Глобальный middleware для всех запросов
 * 
 * Выполняется перед каждым запросом к приложению
 * 
 * ВАЖНО: Middleware работает в Edge Runtime
 * Не поддерживает Node.js модули (crypto, fs и т.д.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// JWT_SECRET читается в runtime, не при сборке
function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return new TextEncoder().encode(secret);
}

// Protected routes that require authentication
const PROTECTED_ROUTES = ['/hub', '/profile'];

type PublicApiMethods = 'ALL' | ReadonlyArray<string>;
type AuthRole = 'tourist' | 'operator' | 'guide' | 'transfer_operator' | 'transfer' | 'agent' | 'admin';

const PUBLIC_API_ROUTES: Record<string, PublicApiMethods> = {
  '/api/auth': 'ALL',
  '/api/weather': 'ALL',
  '/api/tours': ['GET'],
  '/api/partners': ['GET'],
  '/api/eco-points': ['GET'],
};

const API_ROLE_REQUIREMENTS: Record<string, AuthRole> = {
  '/api/tourist': 'tourist',
  '/api/operator': 'operator',
  '/api/admin': 'admin',
  '/api/guide': 'guide',
  '/api/transfer-operator': 'transfer_operator',
  '/api/transfer': 'transfer_operator',
  '/api/agent': 'agent',
};

function isPathMatch(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function normalizeRole(role: string | null | undefined): AuthRole | null {
  if (!role) {
    return null;
  }

  const allowedRoles = new Set<AuthRole>([
    'tourist',
    'operator',
    'guide',
    'transfer_operator',
    'transfer',
    'agent',
    'admin',
  ]);

  return allowedRoles.has(role as AuthRole) ? (role as AuthRole) : null;
}

function hasRequiredRole(userRole: string | null, requiredRole: AuthRole): boolean {
  const normalizedUserRole = normalizeRole(userRole);
  const normalizedRequiredRole = normalizeRole(requiredRole);

  if (!normalizedUserRole || !normalizedRequiredRole) {
    return false;
  }

  if (normalizedRequiredRole === 'transfer_operator' || normalizedRequiredRole === 'transfer') {
    return normalizedUserRole === 'transfer_operator' || normalizedUserRole === 'transfer';
  }

  return normalizedUserRole === normalizedRequiredRole;
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const trimmedHeader = authHeader.trim();
  if (!trimmedHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return trimmedHeader.slice(7).trim() || null;
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy (базовый)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );
  }

  return response;
}

// Public route check учитывает путь и HTTP метод
function isPublicRoute(pathname: string, method: string): boolean {
  if (!pathname.startsWith('/api')) {
    return false;
  }

  const normalizedMethod = method.toUpperCase();

  return Object.entries(PUBLIC_API_ROUTES).some(([route, allowedMethods]) => {
    if (!isPathMatch(pathname, route)) {
      return false;
    }

    if (allowedMethods === 'ALL') {
      return true;
    }

    return allowedMethods.includes(normalizedMethod);
  });
}

function getRequiredRole(pathname: string): AuthRole | null {
  const matchedRoute = Object.entries(API_ROLE_REQUIREMENTS).find(([route]) =>
    isPathMatch(pathname, route)
  );

  return matchedRoute?.[1] ?? null;
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return applySecurityHeaders(
      NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    );
  }

  const { pathname } = request.nextUrl;
  const method = request.method;

  // Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isPublicApiRoute = isPublicRoute(pathname, method);
  const isApiRoute = pathname.startsWith('/api');
  
  // Skip auth check for public routes
  if (!isProtectedRoute && (isPublicApiRoute || !isApiRoute)) {
    return applySecurityHeaders(NextResponse.next());
  }
  
  // Get token from cookie or Authorization header
  const token = request.cookies.get('auth_token')?.value ||
                extractBearerToken(request.headers.get('authorization'));
  
  if (!token) {
    // Redirect to login for protected pages
    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('from', pathname);
      return applySecurityHeaders(NextResponse.redirect(url));
    }
    
    // Return 401 for protected API routes
    if (isApiRoute && !isPublicApiRoute) {
      return applySecurityHeaders(
        NextResponse.json(
          { success: false, error: 'Не авторизован' },
          { status: 401 }
        )
      );
    }
  }
  
  // Verify JWT token
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJWTSecret());
      
      const userId = typeof payload.userId === 'string' ? payload.userId : null;
      const userRole = typeof payload.role === 'string' ? payload.role : null;
      const userEmail = typeof payload.email === 'string' ? payload.email : null;

      // Add user info to headers for API routes + RBAC check
      if (isApiRoute) {
        const requiredRole = getRequiredRole(pathname);
        if (requiredRole && !hasRequiredRole(userRole, requiredRole)) {
          return applySecurityHeaders(
            NextResponse.json(
              { success: false, error: 'Forbidden' },
              { status: 403 }
            )
          );
        }

        const newHeaders = new Headers(request.headers);
        if (userId) {
          newHeaders.set('X-User-Id', userId);
        }
        if (userRole) {
          newHeaders.set('X-User-Role', userRole);
        }
        if (userEmail) {
          newHeaders.set('X-User-Email', userEmail);
        }
        newHeaders.set('X-Auth-Verified', 'true');
        
        return applySecurityHeaders(
          NextResponse.next({
            request: {
              headers: newHeaders,
            },
          })
        );
      }
      
      return applySecurityHeaders(NextResponse.next());
      
    } catch (error) {
      console.error('JWT verification failed:', error);
      
      // Clear invalid token
      if (isProtectedRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/auth/login';
        url.searchParams.set('from', pathname);
        url.searchParams.set('error', 'session_expired');
        const redirect = NextResponse.redirect(url);
        redirect.cookies.delete('auth_token');
        return applySecurityHeaders(redirect);
      }
      
      if (isApiRoute && !isPublicApiRoute) {
        return applySecurityHeaders(
          NextResponse.json(
            { success: false, error: 'Неверный или истекший токен' },
            { status: 401 }
          )
        );
      }
    }
  }
  
  return applySecurityHeaders(NextResponse.next());
}

// Apply middleware to specific routes
export const config = {
  matcher: [
    '/api/:path*',
    '/hub/:path*',
    '/profile/:path*'
  ],
};
