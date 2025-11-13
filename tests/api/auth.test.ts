import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as signupPOST } from '@/app/api/auth/signup/route';
import { POST as signinPOST } from '@/app/api/auth/signin/route';
import { POST as demoPOST } from '@/app/api/auth/demo/route';
import { createMockRequest } from '../helpers/mock-data';

describe('Authentication API', () => {
  beforeEach(() => {
    // Очищаем пользователей перед каждым тестом
    process.env.REGISTERED_USERS = '[]';
  });

  describe('POST /api/auth/signup', () => {
    it('should register a new user', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          email: 'newuser@example.com',
          password: 'SecurePass123',
          name: 'New User',
        },
      });

      const response = await signupPOST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.email).toBe('newuser@example.com');
      expect(data.name).toBe('New User');
      expect(data.id).toBeDefined();
      expect(data.password).toBeUndefined(); // Пароль не должен возвращаться
    });

    it('should not include password in response', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        },
      });

      const response = await signupPOST(request as any);
      const data = await response.json();

      expect(data.password).toBeUndefined();
      expect(data.email).toBe('test@example.com');
    });

    it('should create user with default preferences', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          email: 'test2@example.com',
          password: 'pass123',
          name: 'Test User 2',
        },
      });

      const response = await signupPOST(request as any);
      const data = await response.json();

      expect(data.preferences).toBeDefined();
      expect(data.preferences.language).toBe('ru');
      expect(data.preferences.notifications).toBe(true);
      expect(data.roles).toContain('tourist');
    });

    it('should reject duplicate email', async () => {
      // Регистрируем первого пользователя
      const request1 = createMockRequest({
        method: 'POST',
        body: {
          email: 'duplicate@example.com',
          password: 'pass123',
          name: 'First User',
        },
      });

      await signupPOST(request1 as any);

      // Пытаемся зарегистрировать второго с тем же email
      const request2 = createMockRequest({
        method: 'POST',
        body: {
          email: 'duplicate@example.com',
          password: 'pass456',
          name: 'Second User',
        },
      });

      const response = await signupPOST(request2 as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('уже существует');
    });

    it('should handle invalid JSON gracefully', async () => {
      const request = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await signupPOST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/auth/signin', () => {
    beforeEach(async () => {
      // Создаем тестового пользователя
      const request = createMockRequest({
        method: 'POST',
        body: {
          email: 'testuser@example.com',
          password: 'TestPass123',
          name: 'Test User',
        },
      });
      await signupPOST(request as any);
    });

    it('should sign in existing user', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          email: 'testuser@example.com',
          password: 'TestPass123',
        },
      });

      const response = await signinPOST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.email).toBe('testuser@example.com');
      expect(data.password).toBeUndefined();
    });

    it('should verify password correctly', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          email: 'testuser@example.com',
          password: 'WrongPassword',
        },
      });

      const response = await signinPOST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Неверный');
    });

    it('should return user data without password', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          email: 'testuser@example.com',
          password: 'TestPass123',
        },
      });

      const response = await signinPOST(request as any);
      const data = await response.json();

      expect(data.password).toBeUndefined();
      expect(data.email).toBeDefined();
      expect(data.name).toBeDefined();
    });

    it('should reject non-existent user', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          email: 'nonexistent@example.com',
          password: 'anypassword',
        },
      });

      const response = await signinPOST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/auth/demo', () => {
    it('should create demo session', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { role: 'tourist' },
      });

      const response = await demoPOST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.id).toContain('demo_');
    });

    it('should return demo user data with correct role', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { role: 'operator' },
      });

      const response = await demoPOST(request as any);
      const data = await response.json();

      expect(data.user.roles).toContain('operator');
      expect(data.user.email).toContain('demo');
    });

    it('should create different demo users for different roles', async () => {
      const request1 = createMockRequest({
        method: 'POST',
        body: { role: 'tourist' },
      });
      const response1 = await demoPOST(request1 as any);
      const data1 = await response1.json();

      const request2 = createMockRequest({
        method: 'POST',
        body: { role: 'guide' },
      });
      const response2 = await demoPOST(request2 as any);
      const data2 = await response2.json();

      expect(data1.user.id).not.toBe(data2.user.id);
      expect(data1.user.roles).not.toEqual(data2.user.roles);
    });
  });
});
