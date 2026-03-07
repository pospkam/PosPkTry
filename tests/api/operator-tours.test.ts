import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '../../../app/api/operator/tours/route';

vi.mock('@/lib/database', () => ({
  query: vi.fn(),
}));
vi.mock('@/lib/auth/middleware', () => ({
  requireOperator: vi.fn(),
}));
vi.mock('@/lib/auth/operator-helpers', () => ({
  getOperatorPartnerId: vi.fn(),
}));

describe('operator/tours API', () => {
  it('GET: возвращает 404 если нет профиля', async () => {
    const { requireOperator } = await import('@/lib/auth/middleware');
    const { getOperatorPartnerId } = await import('@/lib/auth/operator-helpers');
    requireOperator.mockResolvedValue({ userId: 'user-1' });
    getOperatorPartnerId.mockResolvedValue(null);
    const req = { url: 'http://localhost/api/operator/tours' } as any;
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('POST: возвращает 404 если нет профиля', async () => {
    const { requireOperator } = await import('@/lib/auth/middleware');
    const { getOperatorPartnerId } = await import('@/lib/auth/operator-helpers');
    requireOperator.mockResolvedValue({ userId: 'user-1' });
    getOperatorPartnerId.mockResolvedValue(null);
    const req = { json: async () => ({}), url: 'http://localhost/api/operator/tours' } as any;
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
