import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/kamhub_test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.NEXTAUTH_SECRET = 'test_nextauth_secret_key';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock fetch globally
global.fetch = vi.fn();

// Helper function to reset fetch mock
export const resetFetchMock = () => {
  (global.fetch as any).mockReset();
};

// Helper to mock successful API response
export const mockApiSuccess = (data: any) => {
  (global.fetch as any).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data }),
    headers: new Headers(),
  });
};

// Helper to mock API error
export const mockApiError = (error: string, status = 400) => {
  (global.fetch as any).mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ success: false, error }),
    headers: new Headers(),
  });
};
