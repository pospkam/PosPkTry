/**
 * Authentication utilities
 * JWT-based auth + role checks for API routes
 */

import { NextRequest } from 'next/server';
import { extractToken, verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/database';

export type AuthRole =
  | 'tourist'
  | 'operator'
  | 'guide'
  | 'transfer_operator'
  | 'transfer'
  | 'agent'
  | 'admin';

export interface VerifiedAuth {
  userId: string | null;
  role: AuthRole | null;
  email: string | null;
  isAuthenticated: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  role: AuthRole;
}

type AllowedRoles = AuthRole | AuthRole[];

const BASE_ROLES = new Set<AuthRole>([
  'tourist',
  'operator',
  'guide',
  'transfer_operator',
  'transfer',
  'agent',
  'admin',
]);

function normalizeRole(role: string | null | undefined): AuthRole | null {
  if (!role) {
    return null;
  }

  return BASE_ROLES.has(role as AuthRole) ? (role as AuthRole) : null;
}

function toRoleList(allowedRoles: AllowedRoles): AuthRole[] {
  return Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
}

function rolesMatch(userRole: string | null | undefined, allowedRole: AuthRole): boolean {
  const normalizedUserRole = normalizeRole(userRole);
  const normalizedAllowedRole = normalizeRole(allowedRole);

  if (!normalizedUserRole || !normalizedAllowedRole) {
    return false;
  }

  // Обратная совместимость: старые токены используют transfer
  if (normalizedAllowedRole === 'transfer_operator') {
    return normalizedUserRole === 'transfer_operator' || normalizedUserRole === 'transfer';
  }

  if (normalizedAllowedRole === 'transfer') {
    return normalizedUserRole === 'transfer' || normalizedUserRole === 'transfer_operator';
  }

  return normalizedUserRole === normalizedAllowedRole;
}

function getTokenFromRequest(request: NextRequest): string | null {
  const cookieToken = request.cookies.get('auth_token')?.value ?? null;
  const headerToken = extractToken(request.headers.get('authorization'));
  return cookieToken || headerToken;
}

export async function verifyAuth(request: NextRequest): Promise<VerifiedAuth> {
  const token = getTokenFromRequest(request);

  if (!token) {
    return {
      userId: null,
      role: null,
      email: null,
      isAuthenticated: false,
    };
  }

  const payload = await verifyToken(token);
  if (!payload || typeof payload.userId !== 'string') {
    return {
      userId: null,
      role: null,
      email: null,
      isAuthenticated: false,
    };
  }

  const role = normalizeRole(typeof payload.role === 'string' ? payload.role : null);

  if (!role) {
    return {
      userId: null,
      role: null,
      email: null,
      isAuthenticated: false,
    };
  }

  return {
    userId: payload.userId,
    role,
    email: typeof payload.email === 'string' ? payload.email : null,
    isAuthenticated: true,
  };
}

export async function authenticateUser(request: NextRequest): Promise<string | null> {
  const auth = await verifyAuth(request);
  return auth.userId;
}

export async function authorizeRole(
  requestOrUserId: NextRequest | string,
  allowedRoles: AllowedRoles
): Promise<boolean> {
  const allowed = toRoleList(allowedRoles);

  if (typeof requestOrUserId !== 'string') {
    const auth = await verifyAuth(requestOrUserId);
    if (!auth.isAuthenticated || !auth.role) {
      return false;
    }

    return allowed.some(role => rolesMatch(auth.role, role));
  }

  const userResult = await query<{ role: string }>(
    'SELECT role FROM users WHERE id = $1 LIMIT 1',
    [requestOrUserId]
  );

  if (userResult.rows.length === 0) {
    return false;
  }

  return allowed.some(role => rolesMatch(userResult.rows[0].role, role));
}

export async function getUserFromToken(token: string | null | undefined): Promise<AuthUser | null> {
  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);
  if (!payload || typeof payload.userId !== 'string') {
    return null;
  }

  const userResult = await query<{ id: string; email: string; role: string }>(
    'SELECT id, email, role FROM users WHERE id = $1 LIMIT 1',
    [payload.userId]
  );

  if (userResult.rows.length === 0) {
    return null;
  }

  const user = userResult.rows[0];
  const role = normalizeRole(user.role);
  if (!role) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role,
  };
}
