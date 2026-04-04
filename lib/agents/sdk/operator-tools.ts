/**
 * lib/agents/sdk/operator-tools.ts
 *
 * SDK-инструменты для операторов через AI-чат.
 * Позволяют управлять турами и бронированиями из диалога:
 * - Просмотр своих туров и статистики
 * - Просмотр бронирований (сегодня, по туру)
 * - Просмотр выручки
 * - Обновление цен  
 * - Управление статусом туров (publish/unpublish)
 */

import type { SDKTool } from './sdk-runner';
import { pool } from '@/lib/db-pool';

// ── My Tours ─────────────────────────────────────────────────

const myTours: SDKTool = {
  name: 'my_tours',
  description: 'Показать список туров оператора с ключевой статистикой: название, цена, бронирования, ближайшая дата, свободные места.',
  parameters: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Фильтр: active (по умолчанию), inactive, all',
      },
    },
  },
  execute: async (args) => {
    const operatorId = args._operatorId as string;
    if (!operatorId) return JSON.stringify({ error: 'Не удалось определить оператора' });

    const statusFilter = args.status === 'inactive'
      ? 'AND ot.is_active = false'
      : args.status === 'all'
        ? ''
        : 'AND ot.is_active = true';

    const res = await pool.query(
      `SELECT ot.id, ot.title, ot.base_price, ot.is_published,
              ot.activity_type, ot.duration_hours,
              COUNT(ob.id)::int AS bookings_count,
              MIN(CASE WHEN ta.date >= CURRENT_DATE THEN ta.date END)::text AS next_date,
              SUM(CASE WHEN ta.date >= CURRENT_DATE THEN ta.available_slots ELSE 0 END)::int AS available_slots
       FROM operator_tours ot
       LEFT JOIN operator_bookings ob ON ob.operator_tour_id = ot.id AND ob.booking_status != 'cancelled'
       LEFT JOIN tour_availability ta ON ta.tour_id = ot.id
       WHERE ot.operator_id = $1 AND ot.deleted_at IS NULL ${statusFilter}
       GROUP BY ot.id
       ORDER BY ot.is_active DESC, ot.title`,
      [operatorId],
    );
    return JSON.stringify({ tours: res.rows, count: res.rowCount });
  },
};

// ── Tour Bookings ────────────────────────────────────────────

const tourBookings: SDKTool = {
  name: 'tour_bookings',
  description: 'Показать бронирования для конкретного тура или все бронирования оператора. Можно фильтровать по статусу и периоду.',
  parameters: {
    type: 'object',
    properties: {
      tour_id: {
        type: 'string',
        description: 'ID тура (число). Если не указан, покажет все бронирования оператора.',
      },
      status: {
        type: 'string',
        description: 'Фильтр статуса: confirmed, completed, cancelled, new, all (по умолчанию all)',
      },
      period: {
        type: 'string',
        description: 'Период: today, week, month, all (по умолчанию month)',
      },
    },
  },
  execute: async (args) => {
    const operatorId = args._operatorId as string;
    if (!operatorId) return JSON.stringify({ error: 'Не удалось определить оператора' });

    const conditions: string[] = ['ot.operator_id = $1', 'ot.deleted_at IS NULL'];
    const params: unknown[] = [operatorId];
    let paramIdx = 2;

    if (args.tour_id) {
      conditions.push(`ob.operator_tour_id = $${paramIdx}`);
      params.push(parseInt(args.tour_id as string, 10));
      paramIdx++;
    }

    if (args.status && args.status !== 'all') {
      conditions.push(`ob.booking_status = $${paramIdx}`);
      params.push(args.status);
      paramIdx++;
    }

    const period = (args.period as string) || 'month';
    if (period === 'today') conditions.push(`ob.created_at >= CURRENT_DATE`);
    else if (period === 'week') conditions.push(`ob.created_at >= CURRENT_DATE - INTERVAL '7 days'`);
    else if (period === 'month') conditions.push(`ob.created_at >= CURRENT_DATE - INTERVAL '30 days'`);

    const res = await pool.query(
      `SELECT ob.id, ot.title AS tour_title, ob.tourist_name, ob.tourist_email,
              ob.booking_date::text, ob.participants, ob.final_price,
              ob.booking_status, ob.payment_status, ob.special_requests
       FROM operator_bookings ob
       JOIN operator_tours ot ON ot.id = ob.operator_tour_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ob.booking_date DESC
       LIMIT 20`,
      params,
    );
    return JSON.stringify({ bookings: res.rows, count: res.rowCount });
  },
};

// ── Revenue ───────────────────────────────────────────────────

const revenue: SDKTool = {
  name: 'operator_revenue',
  description: 'Показать выручку оператора: за 7 дней, 30 дней, всего. Включает количество бронирований и средний чек.',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async (args) => {
    const operatorId = args._operatorId as string;
    if (!operatorId) return JSON.stringify({ error: 'Не удалось определить оператора' });

    const res = await pool.query(
      `SELECT
        COALESCE(SUM(ob.final_price) FILTER (WHERE ob.created_at >= CURRENT_DATE - INTERVAL '7 days'), 0)::numeric AS revenue_7d,
        COUNT(*) FILTER (WHERE ob.created_at >= CURRENT_DATE - INTERVAL '7 days')::int AS bookings_7d,
        COALESCE(SUM(ob.final_price) FILTER (WHERE ob.created_at >= CURRENT_DATE - INTERVAL '30 days'), 0)::numeric AS revenue_30d,
        COUNT(*) FILTER (WHERE ob.created_at >= CURRENT_DATE - INTERVAL '30 days')::int AS bookings_30d,
        COALESCE(SUM(ob.final_price), 0)::numeric AS revenue_total,
        COUNT(*)::int AS bookings_total,
        COALESCE(AVG(ob.final_price), 0)::numeric AS avg_check
       FROM operator_bookings ob
       JOIN operator_tours ot ON ot.id = ob.operator_tour_id
       WHERE ot.operator_id = $1 AND ob.booking_status != 'cancelled' AND ob.payment_status = 'paid'`,
      [operatorId],
    );
    return JSON.stringify(res.rows[0] ?? {});
  },
};

// ── Update Price ──────────────────────────────────────────────

const updatePrice: SDKTool = {
  name: 'update_tour_price',
  description: 'Обновить цену тура. Только для туров этого оператора. Нужен ID тура и новая цена.',
  parameters: {
    type: 'object',
    properties: {
      tour_id: { type: 'string', description: 'ID тура (число)' },
      new_price: { type: 'string', description: 'Новая цена в рублях (число)' },
    },
    required: ['tour_id', 'new_price'],
  },
  execute: async (args) => {
    const operatorId = args._operatorId as string;
    if (!operatorId) return JSON.stringify({ error: 'Не удалось определить оператора' });

    const tourId = parseInt(args.tour_id as string, 10);
    const newPrice = parseFloat(args.new_price as string);
    if (isNaN(tourId) || isNaN(newPrice) || newPrice <= 0) {
      return JSON.stringify({ error: 'Некорректный ID тура или цена' });
    }

    const check = await pool.query(
      `SELECT id, title, base_price FROM operator_tours WHERE id = $1 AND operator_id = $2 AND deleted_at IS NULL`,
      [tourId, operatorId],
    );
    if (check.rowCount === 0) return JSON.stringify({ error: 'Тур не найден или не принадлежит вам' });

    const oldPrice = check.rows[0].base_price;
    await pool.query(
      `UPDATE operator_tours SET base_price = $1, updated_at = NOW() WHERE id = $2 AND operator_id = $3`,
      [newPrice, tourId, operatorId],
    );
    return JSON.stringify({
      success: true,
      tour: check.rows[0].title,
      old_price: oldPrice,
      new_price: newPrice,
    });
  },
};

// ── Toggle Publish ────────────────────────────────────────────

const togglePublish: SDKTool = {
  name: 'toggle_tour_publish',
  description: 'Опубликовать или снять с публикации тур. Если тур опубликован — снимет, если нет — опубликует.',
  parameters: {
    type: 'object',
    properties: {
      tour_id: { type: 'string', description: 'ID тура (число)' },
    },
    required: ['tour_id'],
  },
  execute: async (args) => {
    const operatorId = args._operatorId as string;
    if (!operatorId) return JSON.stringify({ error: 'Не удалось определить оператора' });

    const tourId = parseInt(args.tour_id as string, 10);
    if (isNaN(tourId)) return JSON.stringify({ error: 'Некорректный ID тура' });

    const res = await pool.query(
      `UPDATE operator_tours
       SET is_published = NOT is_published, updated_at = NOW()
       WHERE id = $1 AND operator_id = $2 AND deleted_at IS NULL
       RETURNING id, title, is_published`,
      [tourId, operatorId],
    );
    if (res.rowCount === 0) return JSON.stringify({ error: 'Тур не найден или не принадлежит вам' });
    const row = res.rows[0];
    return JSON.stringify({
      success: true,
      tour: row.title,
      is_published: row.is_published,
      message: row.is_published ? 'Тур опубликован' : 'Тур снят с публикации',
    });
  },
};

// ── Tour Stats ────────────────────────────────────────────────

const tourStats: SDKTool = {
  name: 'tour_stats',
  description: 'Статистика конкретного тура: бронирования, выручка, рейтинг, отзывы, конверсия.',
  parameters: {
    type: 'object',
    properties: {
      tour_id: { type: 'string', description: 'ID тура (число)' },
    },
    required: ['tour_id'],
  },
  execute: async (args) => {
    const operatorId = args._operatorId as string;
    if (!operatorId) return JSON.stringify({ error: 'Не удалось определить оператора' });

    const tourId = parseInt(args.tour_id as string, 10);
    if (isNaN(tourId)) return JSON.stringify({ error: 'Некорректный ID тура' });

    const res = await pool.query(
      `SELECT ot.title, ot.base_price, ot.rating, ot.review_count,
              ot.is_published, ot.is_active,
              COUNT(ob.id)::int AS total_bookings,
              COUNT(ob.id) FILTER (WHERE ob.booking_status = 'completed')::int AS completed,
              COUNT(ob.id) FILTER (WHERE ob.booking_status = 'cancelled')::int AS cancelled,
              COALESCE(SUM(ob.final_price) FILTER (WHERE ob.payment_status = 'paid'), 0)::numeric AS total_revenue,
              COALESCE(AVG(ob.participants), 0)::numeric AS avg_group_size
       FROM operator_tours ot
       LEFT JOIN operator_bookings ob ON ob.operator_tour_id = ot.id
       WHERE ot.id = $1 AND ot.operator_id = $2 AND ot.deleted_at IS NULL
       GROUP BY ot.id`,
      [tourId, operatorId],
    );
    if (res.rowCount === 0) return JSON.stringify({ error: 'Тур не найден' });
    return JSON.stringify(res.rows[0]);
  },
};

// ── Export ─────────────────────────────────────────────────────

export function getOperatorTools(operatorId: string): SDKTool[] {
  const tools = [myTours, tourBookings, revenue, updatePrice, togglePublish, tourStats];
  // Inject operatorId into each tool call
  return tools.map(t => ({
    ...t,
    execute: (args: Record<string, unknown>) => t.execute({ ...args, _operatorId: operatorId }),
  }));
}
