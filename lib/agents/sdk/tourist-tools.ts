/**
 * lib/agents/sdk/tourist-tools.ts
 *
 * SDK-инструменты для conversational booking.
 * Все SQL-запросы соответствуют реальной схеме БД:
 *   operator_tours: difficulty, location_name, max_participants, min_participants, multi_day_count
 *   operator_bookings: operator_tour_id, participants, final_price, tourist_email (нет user_id)
 *   tour_departures: несовместима с operator_tours (UUID vs BIGINT) — не используем
 */

import type { SDKTool } from './sdk-runner';
import { pool } from '@/lib/db-pool';
import { composeTrip } from '@/lib/kuzmich/trip-composer';

// Вычисляем длительность в днях из реальных колонок
const DURATION_EXPR = `COALESCE(t.multi_day_count, CEIL(t.duration_hours / 24.0)::int, 1)`;

// ── Search Tours ──────────────────────────────────────────────────

const searchTours: SDKTool = {
  name: 'search_tours',
  description: 'Поиск туров по критериям: тип активности, бюджет, даты, продолжительность. Возвращает список подходящих туров с ценами.',
  parameters: {
    type: 'object',
    properties: {
      activity_type: {
        type: 'string',
        description: 'Тип активности: fishing, trekking, volcano, thermal, bears, helicopter, boat_trip, rafting, snowmobile, photo, cultural',
      },
      max_price: {
        type: 'string',
        description: 'Максимальный бюджет в рублях (число)',
      },
      min_duration: {
        type: 'string',
        description: 'Минимальная продолжительность в днях',
      },
      max_duration: {
        type: 'string',
        description: 'Максимальная продолжительность в днях',
      },
      month: {
        type: 'string',
        description: 'Месяц (1-12) для фильтрации по сезону',
      },
      query: {
        type: 'string',
        description: 'Текстовый поиск по названию и описанию тура',
      },
      limit: {
        type: 'string',
        description: 'Количество результатов (по умолчанию 5)',
      },
    },
  },
  execute: async (args) => {
    const conditions: string[] = ['t.is_published = true', 't.is_active = true'];
    const params: unknown[] = [];
    let idx = 1;

    if (args.activity_type) {
      conditions.push(`t.activity_type = $${idx}`);
      params.push(String(args.activity_type));
      idx++;
    }
    if (args.max_price) {
      conditions.push(`t.base_price <= $${idx}`);
      params.push(Number(args.max_price));
      idx++;
    }
    if (args.min_duration) {
      conditions.push(`${DURATION_EXPR} >= $${idx}`);
      params.push(Number(args.min_duration));
      idx++;
    }
    if (args.max_duration) {
      conditions.push(`${DURATION_EXPR} <= $${idx}`);
      params.push(Number(args.max_duration));
      idx++;
    }
    if (args.month) {
      const m = Number(args.month);
      conditions.push(`(t.season_start IS NULL OR EXTRACT(MONTH FROM t.season_start) <= $${idx})`);
      params.push(m);
      idx++;
      conditions.push(`(t.season_end IS NULL OR EXTRACT(MONTH FROM t.season_end) >= $${idx})`);
      params.push(m);
      idx++;
    }
    if (args.query) {
      conditions.push(`(t.title ILIKE $${idx} OR t.description ILIKE $${idx})`);
      params.push(`%${String(args.query)}%`);
      idx++;
    }

    const limit = Math.min(Number(args.limit) || 5, 10);
    params.push(limit);

    const sql = `
      SELECT t.id, t.title, t.base_price, t.activity_type,
             ${DURATION_EXPR} AS duration_days,
             t.difficulty, t.location_name,
             t.min_participants, t.max_participants,
             t.available_slots, t.next_available_date,
             COALESCE(u.company_name, u.name) AS operator_name,
             (SELECT AVG(r.rating)::numeric(2,1) FROM reviews r WHERE r.tour_id = t.id) AS avg_rating,
             (SELECT COUNT(*) FROM reviews r WHERE r.tour_id = t.id) AS review_count
      FROM operator_tours t
      JOIN users u ON u.id = t.operator_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.base_price ASC
      LIMIT $${idx}
    `;

    try {
      const result = await pool.query(sql, params);
      if (result.rows.length === 0) {
        return JSON.stringify({ found: 0, message: 'Туров по таким критериям не найдено. Попробуй расширить параметры поиска.' });
      }
      return JSON.stringify({
        found: result.rows.length,
        tours: result.rows.map((r: Record<string, unknown>) => ({
          id: r.id,
          title: r.title,
          price: `${r.base_price} руб.`,
          activity: r.activity_type,
          duration: `${r.duration_days} дн.`,
          difficulty: r.difficulty,
          location: r.location_name,
          group: `${r.min_participants}-${r.max_participants} чел.`,
          slots: r.available_slots ? `${r.available_slots} мест` : 'уточняйте',
          next_date: r.next_available_date ?? 'уточняйте',
          operator: r.operator_name,
          rating: r.avg_rating ? `${r.avg_rating}/5 (${r.review_count} отзывов)` : 'нет отзывов',
        })),
      });
    } catch (err) {
      return JSON.stringify({ error: 'Ошибка поиска туров', detail: String(err) });
    }
  },
};

// ── Get Tour Details ──────────────────────────────────────────────

const getTourDetails: SDKTool = {
  name: 'get_tour_details',
  description: 'Получить полную информацию о туре: описание, включено, не включено, требования, фото.',
  parameters: {
    type: 'object',
    properties: {
      tour_id: { type: 'string', description: 'ID тура' },
    },
    required: ['tour_id'],
  },
  execute: async (args) => {
    try {
      const result = await pool.query(`
        SELECT t.id, t.title, t.description, t.base_price, t.activity_type,
               ${DURATION_EXPR} AS duration_days,
               t.difficulty, t.location_name,
               t.included, t.not_included, t.what_to_bring,
               t.min_participants, t.max_participants,
               t.available_slots, t.next_available_date,
               t.season_start, t.season_end,
               t.tour_image,
               COALESCE(u.company_name, u.name) AS operator_name,
               u.phone AS operator_phone
        FROM operator_tours t
        JOIN users u ON u.id = t.operator_id
        WHERE t.id = $1 AND t.is_published = true
      `, [Number(args.tour_id)]);

      if (result.rows.length === 0) {
        return JSON.stringify({ error: 'Тур не найден или снят с публикации' });
      }
      const t = result.rows[0] as Record<string, unknown>;
      return JSON.stringify({
        id: t.id,
        title: t.title,
        description: t.description,
        price: `${t.base_price} руб.`,
        duration: `${t.duration_days} дн.`,
        difficulty: t.difficulty,
        location: t.location_name,
        included: t.included,
        not_included: t.not_included,
        what_to_bring: t.what_to_bring,
        group: `${t.min_participants}-${t.max_participants} чел.`,
        slots: t.available_slots ? `${t.available_slots} свободных мест` : 'уточните у оператора',
        next_date: t.next_available_date ?? 'уточните у оператора',
        season: t.season_start ? `${t.season_start} — ${t.season_end}` : 'круглый год',
        operator: t.operator_name,
        operator_phone: t.operator_phone,
        image: t.tour_image,
        booking_url: `/routes/${t.id}`,
      });
    } catch {
      return JSON.stringify({ error: 'Ошибка загрузки тура' });
    }
  },
};

// ── Check Availability ────────────────────────────────────────────
// Использует operator_tours напрямую — tour_departures несовместима (UUID vs BIGINT).

const checkAvailability: SDKTool = {
  name: 'check_availability',
  description: 'Проверить доступность тура: свободные места, ближайшая дата, сезон.',
  parameters: {
    type: 'object',
    properties: {
      tour_id: { type: 'string', description: 'ID тура' },
    },
    required: ['tour_id'],
  },
  execute: async (args) => {
    try {
      const result = await pool.query(`
        SELECT t.id, t.title, t.available_slots, t.next_available_date,
               t.max_participants, t.season_start, t.season_end,
               t.base_price,
               (SELECT COUNT(*) FROM operator_bookings ob
                WHERE ob.operator_tour_id = t.id
                  AND ob.booking_status NOT IN ('cancelled','rejected','cancelled_by_tourist')
                  AND ob.booking_date >= CURRENT_DATE) AS active_bookings
        FROM operator_tours t
        WHERE t.id = $1 AND t.is_published = true
      `, [Number(args.tour_id)]);

      if (result.rows.length === 0) {
        return JSON.stringify({ available: false, message: 'Тур не найден.' });
      }

      const t = result.rows[0] as Record<string, unknown>;
      const slots     = Number(t.available_slots ?? t.max_participants ?? 0);
      const booked    = Number(t.active_bookings ?? 0);
      const freeSlots = Math.max(0, slots - booked);

      const today = new Date();
      const seasonEnd = t.season_end ? new Date(t.season_end as string) : null;
      const inSeason  = !seasonEnd || seasonEnd >= today;

      return JSON.stringify({
        available: freeSlots > 0 && inSeason,
        tour_id: t.id,
        title: t.title,
        price: `${t.base_price} руб.`,
        slots_total: slots,
        slots_free: freeSlots,
        next_date: t.next_available_date ?? 'по запросу',
        season: t.season_start ? `${t.season_start} — ${t.season_end}` : 'круглый год',
        in_season: inSeason,
        message: freeSlots > 0
          ? `Свободно ${freeSlots} из ${slots} мест. Ближайшая дата: ${t.next_available_date ?? 'уточните у оператора'}.`
          : 'Мест нет или тур не в сезоне. Уточните у оператора.',
      });
    } catch {
      return JSON.stringify({ error: 'Ошибка проверки доступности' });
    }
  },
};

// ── Compare Tours ─────────────────────────────────────────────────

const compareTours: SDKTool = {
  name: 'compare_tours',
  description: 'Сравнить 2-3 тура по цене, продолжительности, сложности, рейтингу.',
  parameters: {
    type: 'object',
    properties: {
      tour_ids: { type: 'string', description: 'ID туров через запятую (например "12,34,56")' },
    },
    required: ['tour_ids'],
  },
  execute: async (args) => {
    const ids = String(args.tour_ids).split(',').map(s => Number(s.trim())).filter(n => n > 0).slice(0, 3);
    if (ids.length < 2) return JSON.stringify({ error: 'Нужно минимум 2 ID тура для сравнения' });

    try {
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
      const result = await pool.query(`
        SELECT t.id, t.title, t.base_price,
               ${DURATION_EXPR} AS duration_days,
               t.difficulty, t.activity_type, t.location_name,
               t.included, t.available_slots,
               COALESCE(u.company_name, u.name) AS operator_name,
               (SELECT AVG(r.rating)::numeric(2,1) FROM reviews r WHERE r.tour_id = t.id) AS avg_rating,
               (SELECT COUNT(*) FROM reviews r WHERE r.tour_id = t.id) AS review_count
        FROM operator_tours t
        JOIN users u ON u.id = t.operator_id
        WHERE t.id IN (${placeholders}) AND t.is_published = true
      `, ids);

      return JSON.stringify({
        comparison: result.rows.map((t: Record<string, unknown>) => ({
          id: t.id,
          title: t.title,
          price: `${t.base_price} руб.`,
          duration: `${t.duration_days} дн.`,
          difficulty: t.difficulty,
          activity: t.activity_type,
          location: t.location_name,
          operator: t.operator_name,
          slots: t.available_slots ?? 'уточните',
          rating: t.avg_rating ? `${t.avg_rating}/5 (${t.review_count})` : 'нет отзывов',
          included: t.included,
        })),
      });
    } catch {
      return JSON.stringify({ error: 'Ошибка сравнения' });
    }
  },
};

// ── Get Weather ───────────────────────────────────────────────────

const getWeather: SDKTool = {
  name: 'get_weather',
  description: 'Получить текущую погоду и прогноз для Камчатки. Полезно при планировании тура.',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'Место (например "Петропавловск-Камчатский", "Мутновский")' },
    },
  },
  execute: async () => {
    try {
      const result = await pool.query(`
        SELECT data, updated_at FROM weather_cache
        WHERE location = 'petropavlovsk'
        AND updated_at > NOW() - INTERVAL '3 hours'
        LIMIT 1
      `);
      if (result.rows.length > 0) {
        return JSON.stringify(result.rows[0].data);
      }
      return JSON.stringify({ message: 'Данные о погоде временно недоступны. Рекомендуем проверить weather.gc.ca или yr.no' });
    } catch {
      return JSON.stringify({ message: 'Не удалось получить прогноз погоды' });
    }
  },
};

// ── Get User Past Trips ───────────────────────────────────────────

function makeGetUserTrips(userId: string | null): SDKTool {
  return {
    name: 'get_user_trips',
    description: 'Получить историю поездок пользователя для персональных рекомендаций.',
    parameters: { type: 'object', properties: {} },
    execute: async () => {
      if (!userId) return JSON.stringify({ trips: [], message: 'Пользователь не авторизован' });
      try {
        // operator_bookings не имеет user_id — джойним через users.id
        const result = await pool.query(`
          SELECT ob.id, ot.title, ot.activity_type, ot.location_name,
                 ob.booking_date, ob.participants, ob.final_price,
                 ob.booking_status
          FROM operator_bookings ob
          JOIN operator_tours ot ON ot.id = ob.operator_tour_id
          JOIN users u ON u.id = $1 AND u.email = ob.tourist_email
          ORDER BY ob.booking_date DESC NULLS LAST
          LIMIT 10
        `, [userId]);
        return JSON.stringify({
          trips: result.rows.map((r: Record<string, unknown>) => ({
            tour: r.title,
            activity: r.activity_type,
            location: r.location_name,
            date: r.booking_date,
            guests: r.participants,
            price: r.final_price,
            status: r.booking_status,
          })),
        });
      } catch {
        return JSON.stringify({ trips: [], error: 'Ошибка загрузки истории' });
      }
    },
  };
}

// ── Get Gear Recommendations ──────────────────────────────────────

const getGearRecommendations: SDKTool = {
  name: 'get_gear_recommendations',
  description: 'Рекомендации по снаряжению для конкретного типа тура и сезона.',
  parameters: {
    type: 'object',
    properties: {
      activity_type: { type: 'string', description: 'Тип активности: trekking, fishing, volcano и т.д.' },
      month: { type: 'string', description: 'Месяц поездки (1-12)' },
    },
    required: ['activity_type'],
  },
  execute: async (args) => {
    const activity = String(args.activity_type);
    const month = Number(args.month) || new Date().getMonth() + 1;

    const gear: Record<string, string[]> = {
      trekking:   ['Треккинговые ботинки', 'Рюкзак 40-60л', 'Дождевик', 'Термобельё', 'Солнцезащитный крем', 'Палки треккинговые'],
      fishing:    ['Забродники/вейдерсы', 'Удочка спиннинг', 'Непромокаемая куртка', 'Поляризационные очки', 'Термос'],
      volcano:    ['Треккинговые ботинки с жёсткой подошвой', 'Каска', 'Ветровка', 'Бафф/маска от газов', 'Перчатки', 'Рюкзак 30л'],
      thermal:    ['Купальник', 'Полотенце', 'Сланцы', 'Тёплая одежда для дороги'],
      bears:      ['Бинокль', 'Фотоаппарат с телеобъективом', 'Непромокаемая обувь', 'Дождевик'],
      helicopter: ['Тёплая куртка', 'Солнечные очки', 'Беруши', 'Батончики/перекус'],
      boat_trip:  ['Непромокаемая куртка', 'Перчатки', 'Шапка', 'Средство от укачивания', 'Фотоаппарат в гермопакете'],
      rafting:    ['Гидрокостюм (предоставляется)', 'Сменная одежда', 'Герметичный телефонный чехол'],
      snowmobile: ['Тёплый комбинезон', 'Шлем (предоставляется)', 'Балаклава', 'Тёплые перчатки', 'Защитные очки'],
    };

    const seasonNote = month >= 6 && month <= 8
      ? 'Лето: 10-20°C, возможны дожди.'
      : month >= 9 && month <= 11
        ? 'Осень: 0-10°C, ранний снег в горах. Нужна утеплённая экипировка.'
        : month >= 3 && month <= 5
          ? 'Весна: 0-8°C, снег в горах. Зимняя экипировка для гор.'
          : 'Зима: -10...-25°C. Максимальное утепление.';

    const items = gear[activity] ?? ['Удобная обувь', 'Дождевик', 'Тёплая одежда', 'Солнцезащитный крем'];

    return JSON.stringify({
      activity,
      season: seasonNote,
      essential: items,
      always: ['Паспорт', 'Медицинская страховка', 'Заряженный телефон', 'Наличные деньги', 'Вода 1-2 литра'],
    });
  },
};

// ── Compose Multi-Tour Trip ───────────────────────────────────────

const composeTripTool: SDKTool = {
  name: 'compose_trip',
  description:
    'Составить комплексный маршрут из нескольких туров под параметры туриста: ' +
    'количество дней поездки, общий бюджет, интересы, месяц, размер группы. ' +
    'Возвращает готовый итинерарий день за днём с ценами и ссылками на туры. ' +
    'Используй, когда турист говорит о поездке на несколько дней или хочет объединить несколько активностей.',
  parameters: {
    type: 'object',
    properties: {
      total_days: {
        type: 'string',
        description: 'Общее количество дней поездки (например "10")',
      },
      budget_total: {
        type: 'string',
        description: 'Общий бюджет на всю группу в рублях (например "300000")',
      },
      interests: {
        type: 'string',
        description: 'Интересующие активности через запятую: fishing, trekking, volcano, thermal, bears, helicopter, boat_trip, rafting, snowmobile',
      },
      month: {
        type: 'string',
        description: 'Месяц поездки (1-12)',
      },
      group_size: {
        type: 'string',
        description: 'Количество человек в группе (по умолчанию 2)',
      },
      difficulty: {
        type: 'string',
        description: 'Сложность: easy, medium, hard (необязательно)',
      },
    },
    required: ['total_days', 'budget_total', 'interests', 'month'],
  },
  execute: async (args) => {
    const totalDays  = Math.min(Math.max(Number(args.total_days)  || 7, 2), 30);
    const budget     = Math.max(Number(args.budget_total) || 100_000, 10_000);
    const groupSize  = Math.min(Math.max(Number(args.group_size)  || 2, 1), 20);
    const month      = Math.min(Math.max(Number(args.month)       || new Date().getMonth() + 1, 1), 12);
    const interests  = String(args.interests || 'trekking,thermal')
      .split(',').map(s => s.trim()).filter(Boolean);
    const difficulty = ['easy', 'medium', 'hard'].includes(String(args.difficulty))
      ? (args.difficulty as 'easy' | 'medium' | 'hard')
      : undefined;

    try {
      const trip = await composeTrip({ total_days: totalDays, budget_total: budget, interests, month, group_size: groupSize, difficulty });

      if (!trip) {
        return JSON.stringify({
          success: false,
          message: 'Не удалось подобрать маршрут по заданным критериям. Попробуй увеличить бюджет, количество дней или изменить интересы.',
        });
      }

      return JSON.stringify({
        success: true,
        summary: trip.summary,
        total_days: trip.total_days,
        tour_days: trip.tour_days,
        free_days: trip.free_days,
        total_price: trip.total_price,
        price_per_person: trip.price_per_person,
        group_size: trip.group_size,
        tours: trip.tours.map(t => ({
          id: t.id,
          title: t.title,
          activity: t.activity_type,
          duration: `${t.duration_days} дн.`,
          price_per_person: `${t.base_price.toLocaleString('ru-RU')} руб.`,
          operator: t.operator_name,
          location: t.location,
          booking_url: `tourhab.ru${t.booking_url}`,
        })),
        itinerary: trip.itinerary.map(d => ({
          day: d.day,
          type: d.type,
          note: d.note,
          ...(d.tour ? { tour_id: d.tour.id, tour_title: d.tour.title } : {}),
        })),
      });
    } catch {
      return JSON.stringify({ success: false, message: 'Ошибка составления маршрута' });
    }
  },
};

// ── Export full toolkit ───────────────────────────────────────────

export function getTouristTools(userId: string | null): SDKTool[] {
  return [
    composeTripTool,
    searchTours,
    getTourDetails,
    checkAvailability,
    compareTours,
    getWeather,
    makeGetUserTrips(userId),
    getGearRecommendations,
  ];
}
