/**
 * GET /api/public/now
 *
 * "Сейчас на Камчатке" — погода + сезон + ближайший выезд.
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

const MONTH_SEASONS: Record<number, string> = {
  1: 'Снегоходы, подлёдная рыбалка, ски-туринг',
  2: 'Снегоходы, подлёдная рыбалка',
  3: 'Снегоходы, подлёдная рыбалка, ски-туринг',
  4: 'Ски-туринг, весенние восхождения',
  5: 'Начало треккингового сезона',
  6: 'Вулканы, треккинг, рыбалка на чавычу',
  7: 'Вулканы, медведи, рыбалка, сплавы',
  8: 'Вулканы, медведи, нерка, вертолётные туры',
  9: 'Осенние краски, рыбалка, термальные источники',
  10: 'Термальные источники, поздняя рыбалка',
  11: 'Начало зимнего сезона, северное сияние',
  12: 'Снегоходы, собачьи упряжки, северное сияние',
};

export async function GET() {
  const month = new Date().getMonth() + 1;
  const seasonNote = MONTH_SEASONS[month] ?? '';

  // Погода — OpenMeteo (бесплатно, без ключа)
  let temperature: number | null = null;
  let weatherDesc = '';
  try {
    const wRes = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=53.04&longitude=158.65&current_weather=true',
      { signal: AbortSignal.timeout(5000) },
    );
    if (wRes.ok) {
      const wData = await wRes.json() as { current_weather?: { temperature?: number; weathercode?: number } };
      temperature = wData.current_weather?.temperature ?? null;
      const code = wData.current_weather?.weathercode;
      if (code != null) {
        if (code <= 3) weatherDesc = 'ясно';
        else if (code <= 48) weatherDesc = 'облачно';
        else if (code <= 67) weatherDesc = 'дождь';
        else if (code <= 77) weatherDesc = 'снег';
        else weatherDesc = 'осадки';
      }
    }
  } catch {
    // погода недоступна — пропускаем
  }

  // Ближайший выезд
  let nextDeparture: { date: string; tourName: string; operatorName: string; slots: number } | null = null;
  try {
    const dRes = await pool.query(
      `SELECT td.departure_date, t.name AS tour_name, p.name AS operator_name, td.available_slots
       FROM tour_departures td
       JOIN tours t ON t.id = td.tour_id AND t.is_active = TRUE
       JOIN partners p ON p.id = t.operator_id
       WHERE td.departure_date >= CURRENT_DATE
         AND td.available_slots > 0
       ORDER BY td.departure_date ASC
       LIMIT 1`,
    );
    if (dRes.rows[0]) {
      const r = dRes.rows[0];
      nextDeparture = {
        date: r.departure_date,
        tourName: r.tour_name,
        operatorName: r.operator_name,
        slots: Number(r.available_slots),
      };
    }
  } catch {
    // БД недоступна
  }

  return NextResponse.json({
    success: true,
    data: {
      temperature,
      weatherDesc,
      seasonNote,
      month,
      nextDeparture,
    },
  });
}
