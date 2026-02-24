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

// Public API routes (no auth needed)
const PUBLIC_API_ROUTES = [
  '/api/auth',
  '/api/tours',
  '/api/weather',
  '/api/eco-points',
  '/api/partners',
];

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
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { pathname } = request.nextUrl;
  
  // Security headers for all responses
  const response = NextResponse.next();
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
  
  // Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isPublicApiRoute = PUBLIC_API_ROUTES.some(route => pathname.startsWith(route));
  const isApiRoute = pathname.startsWith('/api');
  
  // Skip auth check for public routes
  if (!isProtectedRoute && (isPublicApiRoute || !isApiRoute)) {
    return response;
  }
  
  // Get token from cookie or Authorization header
  const token = request.cookies.get('auth_token')?.value || 
                request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    // Redirect to login for protected pages
    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
    
    // Return 401 for protected API routes
    if (isApiRoute && !isPublicApiRoute) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      );
    }
  }
  
  // Verify JWT token
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJWTSecret());
      
      // Add user info to headers for API routes
      if (isApiRoute) {
        const newHeaders = new Headers(request.headers);
        newHeaders.set('X-User-Id', payload.userId as string);
        newHeaders.set('X-User-Role', payload.role as string);
        newHeaders.set('X-User-Email', payload.email as string);
        
        return NextResponse.next({
          request: {
            headers: newHeaders,
          },
        });
      }
      
      return response;
      
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
        return redirect;
      }
      
      if (isApiRoute && !isPublicApiRoute) {
        return NextResponse.json(
          { success: false, error: 'Неверный или истекший токен' },
          { status: 401 }
        );
      }
    }
  }
  
  return response;
}

// Apply middleware to specific routes
export const config = {
  matcher: [
    '/api/:path*',
    '/hub/:path*',
    '/profile/:path*'
  ],
};
