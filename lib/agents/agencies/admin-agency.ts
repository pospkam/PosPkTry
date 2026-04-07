```typescript
/**
 * AdminAgency — агент для администратора платформы.
 *
 * Возможности:
 *   admin_digest — ежедневный дайджест: лиды, брони, туры без слотов, просмотры
 *   admin_leads  — сводка по лидам за 7 дней
 *   admin_health — состояние AI: успешность, паттерны, обратная связь
 */

import { pool } from '@/lib/db-pool';
import { callAIWithModel } from '@/lib/ai/providers';
import { PatternRecognition } from '../learning/pattern-recognition';
import { FeedbackLoop } from '../learning/feedback-loop';
import { ObservationLogger } from '../observation-logger';
import type { AgentContext } from '../context-hub';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

// ── Типы строк БД ─────────────────────────────────────────────────────────────────

interface LeadsStats {
  total: number;
  new_count: number;
  contacted: number;
  converted: number;
  last_7d: number;
}

interface BookingsStats {
  today: number;
  last_7d: number;
  revenue_7d: string | null;
}

interface TourRow {
  id: number;
  title: string;
}

interface WeatherAlertRow {
  id: string;
  message: string;
  severity: string;
  created_at: Date;
}

interface PageViewsStats {
  today: number;
  last_7d: number;
}

// ── AdminAgency ─────────────────────────────────────────────────────────────────────

export class AdminAgency {
  private briefing = '';
  private preferredModel: string | null = null;
  private tools: Record<string, (...args: unknown[]) => Promise<{ success: boolean; message: string; details?: Record<string, unknown> }>> = {};

  async run(intent: string, context: AgentContext): Promise<AgencyResult> {
    this.briefing = context.richBriefing ?? '';
    this.preferredModel = context.preferredModel ?? null;
    this.tools = context.tools ?? {};
    switch (intent) {
      case 'admin_digest': return this.getDigest();
      case 'admin_leads':  return this.getLeadsSummary();
      case 'admin_health': return this.getHealth();
      default:             return { response: 'AdminAgency: команда не поддерживается.' };
    }
  }

  // ── /digest ──────────────────────────────────────────────────────────────────────

  async getDigest(): Promise<AgencyResult> {
    try {
      const [leads, bookings, emptyTours, weather, views] = await Promise.all([
        this.fetchLeadsStats().catch(() =>
          ({ total: 0, new_count: 0, contacted: 0, converted: 0, last_7d: 0 })
        ),
        this.fetchBookingsStats().catch(() =>
          ({ today: 0, last_7d: 0, revenue_7d: null })
        ),
        this.fetchToursWithoutSlots().catch(() => [] as TourRow[]),
        this.fetchWeatherAlerts().catch(() => [] as WeatherAlertRow[]),
        this.fetchPageViews().catch(() =>
          ({ today: 0, last_7d: 0 })
        ),
      ]);

      const data = { leads, bookings, emptyTours, weather, views };

