/**
 * Core Infrastructure - Auth Types
 * Типы данных для аутентификации
 */

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name?: string;
  iat?: number;
  exp?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  avatar?: string;
  createdAt?: Date;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  AGENT = 'agent',
  GUIDE = 'guide',
  USER = 'user',
  GUEST = 'guest',
}

export interface AuthError {
  code: string;
  message: string;
  status: number;
}
