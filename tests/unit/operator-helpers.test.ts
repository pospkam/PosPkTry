/**
 * Unit tests for operator helpers business logic
 * Testing ownership verification, partner auto-creation, stats
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import * as helpers from '@/lib/auth/operator-helpers';
import { query } from '@/lib/database';

vi.mock('@/lib/database', () => ({
  query: vi.fn()
}));

describe('Operator Helpers Business Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOperatorPartnerId', () => {
    test('should return existing partner ID', async () => {
      (query as any).mockResolvedValueOnce({ rows: [{ id: 'partner-123' }] });

      const partnerId = await helpers.getOperatorPartnerId('user-456');

      expect(partnerId).toBe('partner-123');
      expect((query as any).mock.calls[0][0]).toMatch(/partners.*user_id.*category.*operator/);
      expect((query as any).mock.calls[0][1]).toEqual(['user-456']);
    });

    test('should auto-create partner if missing', async () => {
      (query as any)
        .mockResolvedValueOnce({ rows: [] }) // no existing
        .mockResolvedValueOnce({ rows: [{ name: 'Test User', email: 'test@example.com' }] }) // user
        .mockResolvedValueOnce({ rows: [{ id: 'new-partner-789' }] }); // insert

      const partnerId = await helpers.getOperatorPartnerId('user-456');

      expect(partnerId).toBe('new-partner-789');
      expect((query as any).mock.calls.length).toBe(3);
      expect((query as any).mock.calls[2][0]).toMatch(/INSERT INTO partners/);
    });

    test('should handle errors gracefully', async () => {
      (query as any).mockRejectedValueOnce(new Error('DB error'));

      const partnerId = await helpers.getOperatorPartnerId('user-456');

      expect(partnerId).toBeNull();
    });
  });

  describe('verifyTourOwnership', () => {
    test('should verify ownership correctly', async () => {
      (query as any).mockResolvedValueOnce({ rows: [{ id: 'tour-1' }] });

      const owns = await helpers.verifyTourOwnership('user-456', 'tour-1');

      expect(owns).toBe(true);
      expect((query as any).mock.calls[0][0]).toMatch(/tours t.*JOIN partners p.*operator_id/);
      expect((query as any).mock.calls[0][1]).toEqual(['user-456', 'tour-1']);
    });

    test('should deny non-owner', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });

      const owns = await helpers.verifyTourOwnership('user-456', 'tour-1');

      expect(owns).toBe(false);
    });
  });

  describe('verifyBookingOwnership', () => {
    test('should verify booking ownership through tour', async () => {
      (query as any).mockResolvedValueOnce({ rows: [{ id: 'booking-1' }] });

      const owns = await helpers.verifyBookingOwnership('user-456', 'booking-1');

      expect(owns).toBe(true);
    });
  });

  describe('getOperatorStats', () => {
    test('should return cached stats if available', async () => {
      const spyGetPartner = vi.spyOn(helpers, 'getOperatorPartnerId').mockResolvedValueOnce('partner1');
      (query as any).mockResolvedValueOnce({ rows: [{ 
        total_tours: 5, active_tours: 3, total_bookings: 20, 
        total_revenue: '150000', avg_rating: '4.5', total_reviews: 10, completion_rate: '95'
      }] });

      const stats = await helpers.getOperatorStats('user-456');

      expect(stats).toBeDefined();
      expect(stats!.totalTours).toBe(5);
      expect(stats!.totalRevenue).toBe(150000);
      spyGetPartner.mockRestore();
    });
  });
});
