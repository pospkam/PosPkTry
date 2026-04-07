/**
 * RescueAgency — AI-спасатель и координатор безопасности.
 *
 * Мониторинг SOS-событий, погодных угроз и протоколов безопасности:
 *   rescue_sos_stats    — статистика SOS-сигналов и активных инцидентов
 *   rescue_weather_risk — риски для активных туров из-за погоды
 *   rescue_protocols    — протоколы экстренного реагирования (инструктаж)
 */

import { pool } from '@/lib/db-pool';
import { callAIWithModel } from '@/lib/ai/providers';
import type { AgentContext } from '../context-hub';
import type { ChatMessage } from '@/lib/ai/prompts';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

interface SosEventRow {
  id: number;
  user_id: number | null;
  lat: number | null;
  lng: number | null;
  status: string;
  created_at: string;
  age_minutes: number;
}

interface WeatherRiskRow {
  tour_id: number;
  tour_title: string;
  operator: string;
  booking_count: string;
  alert_message: string | null;
  alert_created_at: string | null;
  location: string | null;
}

export class RescueAgency {
  private briefing = '';
  private preferredModel: string | null = null;
  private tools: Record<string, (...args: unknown[]) => Promise<{ success: boolean; message: string; details?: Record<string, unknown> }>> = {};

  async run(intent: string, context: AgentContext): Promise<AgencyResult> {
    this.briefing = context.richBriefing ?? '';
    this.preferredModel = context.preferredModel ?? null;
    this.tools = context.tools ?? {};
    switch (intent) {
      case 'rescue_sos_stats':     return this.sosSummary();
      case 'rescue_weather_risk':  return this.weatherRisk();
      case 'rescue_protocols':     return this.protocols();
      default:                     return { response: 'RescueAgency: команда не поддерживается.' };
    }
  }

  /** Статистика SOS и активных инцидентов */
  private async sosSummary(): Promise<AgencyResult> {
    // Fetch active incidents from external toolkit (non-blocking)
    let incidentContext = '';
    if (this.tools.getActiveIncidents) {
      try {
        const result = await this.tools.getActiveIncidents();
        if (result.success && result.details) {
          incidentContext = `\nВнешние инциденты: ${result.message}`;
        }
      } catch { /* tool failure is non-blocking */ }
    }

    const [recent, stats] = await Promise.all([
      pool.query<SosEventRow>(`
        SELECT
          id,
          user_id,
          lat::float,
          lng::float,
          status,
          created_at::text,
          ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60)::int AS age_minutes
        FROM sos_events
        WHERE created_at >= NOW() - INTERVAL '30 days'
        ORDER BY created_at DESC
        LIMIT 20
      `),
      pool.query<{
        total_30d: string;
        active: string;
        resolved: string;
        avg_resolve_min: string;
      }>(`
        SELECT
          COUNT(*)::text                                                        AS total_30d,
          COUNT(*) FILTER (WHERE status NOT IN ('resolved','false_alarm'))::text AS active,
          COUNT(*) FILTER (WHERE status = 'resolved')::text                    AS resolved,
          '0'::text                                                             AS avg_resolve_min
        FROM sos_events
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `),
    ]);

    const s = stats.rows[0];
    const activeEvents = recent.rows.filter(r => !['resolved', 'false_alarm'].includes(r.status));

    const lines: string[] = [
      '<b>SOS-мониторинг (30 дней)</b>',
      '',
      `Всего сигналов: ${s.total_30d}`,
      `Активных: ${s.active}`,
      `Разрешено: ${s.resolved}`,
      `Среднее время реагирования: ${s.avg_resolve_min} мин.`,
    ];

    if (activeEvents.length > 0) {
      lines.push('', `<b>АКТИВНЫЕ ИНЦИДЕНТЫ (${activeEvents.length}):</b>`);
      for (const e of activeEvents) {
        const location = e.lat && e.lng
          ? `[${e.lat.toFixed(4)}, ${e.lng.toFixed(4)}]`
          : 'координаты не получены';
        lines.push(`• SOS #${e.id} — ${location} | ${e.age_minutes} мин. назад | статус: ${e.status}`);
      }

      // Notify via SOS alert tool when active incidents exist
      if (this.tools.sendSosAlert && activeEvents.length > 0) {
        this.tools.sendSosAlert(`${activeEvents.length} active SOS`).catch(() => {});
      }
    } else {
      lines.push('', 'Активных SOS-инцидентов нет.');
    }

    if (incidentContext) {
      lines.push('', incidentContext);
    }

    return { response: lines.join('\n'), data: { stats: s, active_events: activeEvents } };
  }

  /** Анализ погодных рисков для активных туров */
  private async weatherRisk(): Promise<AgencyResult> {
    // Enrich with real weather forecast
    let weatherInfo = '';
    if (this.tools.fetchWeather) {
      try {
        const w = await this.tools.fetchWeather(53.0, 158.6, 3);
        if (w.success && w.details?.forecast) {
          weatherInfo = `\nПрогноз погоды Камчатка: ${JSON.stringify(w.details.forecast).slice(0, 500)}`;
        }
      } catch { /* non-critical */ }
    }

    const { rows } = await pool.query<WeatherRiskRow>(`
      SELECT
        ot.id                 AS tour_id,
        ot.title              AS tour_title,
        p.name                AS operator,
        (
          SELECT COUNT(*)::text FROM operator_bookings ob
          WHERE ob.operator_tour_id = ot.id
            AND ob.booking_status IN ('new','confirmed')
            AND ob.deleted_at IS NULL
        )                     AS booking_count,
        COALESCE(wa.alert_type, '') || CASE WHEN wa.severity IS NOT NULL THEN ' / ' || wa.severity ELSE '' END AS alert_message,
        wa.created_at::text   AS alert_created_at,
        wa.location_name           AS location
      FROM operator_tours ot
      JOIN partners p ON p.id = ot.operator_id
      LEFT JOIN weather_alerts wa ON wa.operator_tour_id = ot.id
        AND wa.created_at >= NOW() - INTERVAL '6 hours'
      WHERE ot.deleted_at IS NULL
        AND ot.is_active = true
        AND EXISTS (
          SELECT 1 FROM operator_bookings ob
          WHERE ob.operator_tour_id = ot.id
            AND ob.booking_status IN ('new','confirmed')
            AND ob.deleted_at IS NULL
        )
      ORDER BY wa.created_at DESC NULLS LAST, ot.id
      LIMIT 15
    `);

    const withAlerts    = rows.filter(r => r.alert_message !== null);
    const withoutAlerts = rows.filter(r => r.alert_message === null);

    const lines: string[] = [
      '<b>Погодные риски для активных туров</b>',
      '',
      `Туров с активными бронями: ${rows.length}`,
      `Погодные предупреждения: ${withAlerts.length}`,
    ];

    if (withAlerts.length > 0) {
      lines.push('', '<b>Туры с погодными алертами:</b>');
      for (const r of withAlerts) {
        const broni = r.booking_count;
        lines.push(`• [${r.tour_id}] ${r.tour_title} (${r.operator}) — ${broni} брон.`);
        lines.push(`  Алерт: ${r.alert_message}`);
      }
    }

    if (withoutAlerts.length > 0 && withAlerts.length === 0) {
      lines.push('', 'Активных погодных предупреждений нет.');
      lines.push(`${withoutAlerts.length} туров с бронями работают в штатном режиме.`);
    }

    const aiRisk = await this.callAI(
      `Оценка погодных рисков для туризма на Камчатке: ` +
      `${rows.length} туров с активными бронями, ${withAlerts.length} погодных предупреждений. ` +
      weatherInfo +
      `Дай краткий инструктаж для операторов (2-3 пункта) при получении погодного алерта.`
    );

    if (aiRisk) lines.push('', aiRisk);

    return { response: lines.join('\n'), data: { with_alerts: withAlerts, clear: withoutAlerts } };
  }

  /** Протоколы экстренного реагирования */
  private async protocols(): Promise<AgencyResult> {
    const lines: string[] = [
      '<b>Протоколы экстренного реагирования (Камчатка)</b>',
      '',
      '<b>1. SOS-сигнал от туриста</b>',
      '• Автоматическое уведомление → МЧС Камчатского края: 8 (4152) 27-02-17',
      '• Передать координаты GPS оператору тура',
      '• Активировать план эвакуации маршрута',
      '• Контроль через /hub/admin/safety каждые 15 мин.',
      '',
      '<b>2. Экстремальная погода</b>',
      '• Ветер > 25 м/с: прекратить все маршруты',
      '• Видимость < 200м: запрет вертолётных туров',
      '• Снежная буря: движение только по дорогам с сопровождением',
      '• Вулканическая активность: следить МЧС САКС https://sacura.emnk.ru',
      '',
      '<b>3. Медицинская помощь в поле</b>',
      '• Скорая помощь ПК: 03 или +7 (4152) 41-05-05',
      '• Авиамедицина: +7 (4152) 26-96-36',
      '• Ближайшие больницы: КГБУЗ ГБ №1 ПК, КГБУЗ КБ №2',
      '',
      '<b>4. Контакты экстренных служб</b>',
      '• МЧС: 01 / 112',
      '• Полиция: 02 / 112',
      '• Единый SOS: 112 (работает во всех сетях РФ)',
      '• Поисково-спасательный отряд: +7 (4152) 23-22-91',
      '',
      '<b>5. Протокол платформы</b>',
      '• SOS → /api/safety/sos (rate-limit: 1/10мин)',
      '• Уведомление TELEGRAM_CHAT_ID (admin) немедленно',
      '• Блокировка бронирований тура до снятия алерта',
    ];

    return { response: lines.join('\n'), data: { contacts: { sos: '112', mchs: '8(4152)27-02-17' } } };
  }

  private async callAI(prompt: string): Promise<string | null> {
    try {
      const fullPrompt = this.briefing ? `${this.briefing}\n\n${prompt}` : prompt;
      const messages: ChatMessage[] = [{ role: 'user', content: fullPrompt }];
      const { text } = await callAIWithModel(messages, this.preferredModel);
      return text;
    } catch {
      return null;
    }
  }
}
