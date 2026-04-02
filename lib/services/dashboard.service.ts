/**
 * Dashboard Service
 * Functions related to dashboard statistics and user dashboards.
 */

import { pool } from './_helpers';

export const dashboardService = {
  async getStats(_params: Record<string, unknown>) {
    try {
      const result = await pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM operator_bookings WHERE booking_status != 'cancelled') AS bookings,
          (SELECT COALESCE(SUM(final_price), 0)::numeric FROM operator_bookings WHERE payment_status = 'paid') AS revenue,
          (SELECT COUNT(*)::int FROM operator_tours WHERE is_active = TRUE) AS tours,
          (SELECT COUNT(*)::int FROM users WHERE deleted_at IS NULL) AS users
      `);
      const row = result.rows[0] ?? {};
      return {
        bookings: Number(row.bookings ?? 0),
        revenue: Number(row.revenue ?? 0),
        tours: Number(row.tours ?? 0),
        users: Number(row.users ?? 0),
      };
    } catch {
      return { bookings: 0, revenue: 0, tours: 0, users: 0 };
    }
  },
  async getSummary() {
    try {
      const stats = await this.getStats({});
      return { success: true, data: stats };
    } catch {
      return { success: true, data: {} };
    }
  },
  async getUserDashboards(userId: string) {
    return [
      {
        id: 'default',
        userId,
        name: 'Default Dashboard',
        widgets: [],
      },
    ];
  },
  async createDashboard(data: Record<string, unknown>, userId: string) {
    return {
      id: crypto.randomUUID(),
      userId,
      ...data,
      createdAt: new Date().toISOString(),
    };
  },
};
