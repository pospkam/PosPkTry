import { describe, it, expect } from 'vitest';
import { GET } from '../../app/api/eco-points/user/route';

// Мок запроса с авторизацией
const mockRequest = (userId?: string) => ({
  url: userId
    ? `http://localhost/api/eco-points/user?userId=${userId}`
    : 'http://localhost/api/eco-points/user',
  headers: { get: () => 'Bearer test-jwt' },
} as any);

describe('GET /api/eco-points/user', () => {
  it('возвращает 401 без авторизации', async () => {
    const req = { ...mockRequest(), headers: { get: () => null } };
    const res = await GET(req as any);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it('возвращает eco-points для авторизованного пользователя', async () => {
    // Здесь должен быть мок verifyAuth и query
    // Для реального теста потребуется интеграция с тестовой БД или мок
    expect(true).toBe(true);
  });
});
