/**
 * Setup для тестов
 */

import { expect, afterEach, vi, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Next.js headers
vi.mock('next/headers', () => ({
  headers: () => ({
    get: vi.fn(),
    set: vi.fn(),
  }),
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
  }),
}));

// Mock database
vi.mock('@/lib/database', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
  getPool: vi.fn(),
}));

// Mock email service
vi.mock('@/lib/notifications/email-service', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// Mock JWT middleware
vi.mock('@/lib/auth/middleware', () => ({
  requireAgent: vi.fn(),
  requireAuth: vi.fn(),
  requireTourOperator: vi.fn(),
  requireStayProvider: vi.fn(),
}));

// Mock admin check
vi.mock('@/lib/auth/check-admin', () => ({
  requireAdmin: vi.fn(),
  validateAdmin: vi.fn(),
  getAdminUserId: vi.fn(),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock environment variables
vi.mock('process', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-jwt-secret',
    CLOUDPAYMENTS_PUBLIC_KEY: 'test-public-key',
    CLOUDPAYMENTS_API_SECRET: 'test-api-secret',
    SMTP_HOST: 'smtp.test.com',
    SMTP_USER: 'test@test.com',
    SMTP_PASSWORD: 'test-password',
    SENTRY_DSN: 'test-sentry-dsn',
    CDN_URL: 'https://cdn.test.com',
  },
  uptime: vi.fn(() => 1000),
}));

// Cleanup после каждого теста
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

