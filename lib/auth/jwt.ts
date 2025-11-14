/**
 * JWT Token Management
 * Utilities for creating and verifying JWT tokens
 */

import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'kamchatour-hub-secret-key-change-in-production'
);

const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRATION = '7d'; // 7 days

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
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
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
export async function getUserFromRequest(request: any): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('authorization');
  const token = extractToken(authHeader);
  
  if (!token) {
    return null;
  }
  
  return await verifyToken(token);
}
