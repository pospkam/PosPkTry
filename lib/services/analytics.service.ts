import { pool } from '@/lib/db-pool';
import { toStringOrNull, toNumberOrNull } from './_helpers';

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

export const metricsService = {
  async getMetrics(params: Record<string, unknown>) {
    return { metrics: {}, period: params.period || '7d' };
  },
  async track(event: string, data: Record<string, unknown>) {
    return { success: true };
  },
  async recordMetric(
    type: unknown,
    value: unknown,
    period: unknown,
    metadata: unknown
  ) {
    return {
      id: crypto.randomUUID(),
      type: toStringOrNull(type) ?? 'custom',
      value: toNumberOrNull(value) ?? 0,
      period: toStringOrNull(period) ?? 'custom',
      metadata: (metadata && typeof metadata === 'object') ? metadata : {},
      recordedAt: new Date().toISOString(),
    };
  },
};

export const reportService = {
  async generate(params: Record<string, unknown>) {
    return { report: {}, generatedAt: new Date().toISOString() };
  },
  async list(params: Record<string, unknown>) {
    return { reports: [], total: 0 };
  },
  async generateReport(data: Record<string, unknown>, generatedBy: string) {
    return this.generate({
      ...data,
      generatedBy,
    });
  },
  async listReports(type: unknown, limit = 20, offset = 0) {
    const response = await this.list({
      type: toStringOrNull(type) ?? undefined,
      limit,
      offset,
    });
    return {
      reports: response.reports,
      total: response.total,
    };
  },
};
