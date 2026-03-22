/**
 * Report Service
 * Functions related to report generation and listing.
 */

import { toStringOrNull } from './_helpers';

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
