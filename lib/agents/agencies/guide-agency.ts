/**
 * GuideAgency — агент для гидов.
 *
 * guide_schedule  — предстоящие назначения гида
 * guide_groups    — активные группы и количество туристов
 * guide_earnings  — сводка по заработку
 * guide_status    — combined: расписание + группы + заработок
 */

import { pool } from '@/lib/db-pool';
import type { AgentContext } from '../context-hub';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

interface ScheduleRow {
  booking_id: string;
  tour_title: string;
  start_date: string;
  end_date: string | null;
  booked_slots: number;
  status: string;
}

interface GroupsRow {
  active_groups: string;
  total_tourists: string;
}

interface EarningsRow {
  completed_tours: string;
  estimated_earnings: string | null;
}

export class GuideAgency {
  async run(
    intent: string,
    context: AgentContext,
    _originalMessage: string
  ): Promise<AgencyResult> {
    switch (intent) {
      case 'guide_schedule':  return this.getSchedule(context);
      case 'guide_groups':    return this.getGroups(context);
      case 'guide_earnings':  return this.getEarnings(context);
      case 'guide_status':    return this.getStatus(context);
      default:
        return {
          response:
            'Доступные команды гида:\n' +
            '- расписание / мои туры\n' +
            '- мои группы\n' +
            '- мой заработок\n' +
            '- статус (всё сразу)',
        };
    }
  }

  private async getSchedule(context: AgentContext): Promise<AgencyResult> {
    if (!context.user.userId) {
      return { response: 'Войдите в систему для доступа к расписанию.' };
    }

    try {
      const { rows } = await pool.query<ScheduleRow>(
        `SELECT
           b.id            AS booking_id,
           t.title         AS tour_title,
           td.start_date::text AS start_date,
           td.end_date::text   AS end_date,
           td.booked_slots,
           b.status
         FROM bookings b
         JOIN tours t        ON t.id = b.tour_id
         JOIN tour_departures td ON td.id = b.departure_id
         WHERE t.guide_id = $1
           AND b.status = 'confirmed'
           AND td.start_date >= CURRENT_DATE
           AND b.deleted_at IS NULL
         ORDER BY td.start_date
         LIMIT 10`,
        [context.user.userId]
      );

      if (rows.length === 0) {
        return { response: 'Предстоящих назначений не найдено.' };
      }

      const lines = ['<b>Ваше расписание:</b>', ''];
      for (const r of rows) {
        const dates = r.end_date ? `${r.start_date} — ${r.end_date}` : r.start_date;
        lines.push(`${r.tour_title} | ${dates} | ${r.booked_slots} чел | ${r.status}`);
      }

      return { response: lines.join('\n'), data: { schedule: rows } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка запроса расписания';
      return { response: `Не удалось загрузить расписание: ${msg}` };
    }
  }

  private async getGroups(context: AgentContext): Promise<AgencyResult> {
    if (!context.user.userId) {
      return { response: 'Войдите в систему для доступа к группам.' };
    }

    try {
      const { rows } = await pool.query<GroupsRow>(
        `SELECT
           COUNT(DISTINCT b.id)::text         AS active_groups,
           COALESCE(SUM(td.booked_slots), 0)::text AS total_tourists
         FROM bookings b
         JOIN tours t        ON t.id = b.tour_id
         JOIN tour_departures td ON td.id = b.departure_id
         WHERE t.guide_id = $1
           AND b.status = 'confirmed'
           AND td.start_date >= CURRENT_DATE
           AND b.deleted_at IS NULL`,
        [context.user.userId]
      );

      const r = rows[0] ?? { active_groups: '0', total_tourists: '0' };
      return {
        response: `<b>Активные группы:</b>\nГрупп: ${r.active_groups}\nТуристов: ${r.total_tourists}`,
        data: { active_groups: r.active_groups, total_tourists: r.total_tourists },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка запроса групп';
      return { response: `Не удалось загрузить группы: ${msg}` };
    }
  }

  private async getEarnings(context: AgentContext): Promise<AgencyResult> {
    if (!context.user.userId) {
      return { response: 'Войдите в систему для доступа к статистике заработка.' };
    }

    try {
      const { rows } = await pool.query<EarningsRow>(
        `SELECT
           COUNT(DISTINCT b.id)::text                                   AS completed_tours,
           SUM(COALESCE(td.price_override, t.price, 0) * td.booked_slots)::text AS estimated_earnings
         FROM bookings b
         JOIN tours t        ON t.id = b.tour_id
         JOIN tour_departures td ON td.id = b.departure_id
         WHERE t.guide_id = $1
           AND b.status = 'confirmed'
           AND b.deleted_at IS NULL`,
        [context.user.userId]
      );

      const r = rows[0] ?? { completed_tours: '0', estimated_earnings: null };
      const fmt = (v: string | null) =>
        v ? `${Number(v).toLocaleString('ru-RU')} руб` : '0 руб';

      return {
        response: [
          '<b>Ваш заработок:</b>',
          `Туров подтверждено: ${r.completed_tours}`,
          `Оценочный заработок: ${fmt(r.estimated_earnings)}`,
        ].join('\n'),
        data: { completed_tours: r.completed_tours, estimated_earnings: r.estimated_earnings },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка запроса заработка';
      return { response: `Не удалось загрузить данные о заработке: ${msg}` };
    }
  }

  private async getStatus(context: AgentContext): Promise<AgencyResult> {
    const [schedule, groups, earnings] = await Promise.all([
      this.getSchedule(context),
      this.getGroups(context),
      this.getEarnings(context),
    ]);

    const parts = [schedule.response, '', groups.response, '', earnings.response];
    return {
      response: parts.join('\n'),
      data: {
        schedule: schedule.data,
        groups:   groups.data,
        earnings: earnings.data,
      },
    };
  }
}
