import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '../../../app/api/eco-points/user/route';

// Мокаем зависимости (пример)
vi.mock('@/lib/database', () => ({
  query: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  verifyAuth: vi.fn(),
}));

describe('eco-points API', () => {
  it('GET: возвращает 401 если неавторизован', async () => {
    const { verifyAuth } = await import('@/lib/auth');
    verifyAuth.mockResolvedValue({ userId: null });
    const req = { url: 'http://localhost/api/eco-points/user' } as any;
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('POST: возвращает 400 если не хватает данных', async () => {
    const { verifyAuth } = await import('@/lib/auth');
    verifyAuth.mockResolvedValue({ userId: 'user-1' });
    const req = {
      json: async () => ({}),
      url: 'http://localhost/api/eco-points/user',
    } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
