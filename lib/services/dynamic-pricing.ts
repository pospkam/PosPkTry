/**
 * Dynamic Pricing Service
 *
 * Рассчитывает итоговую цену тура с учётом:
 *   - season_peak / season_low (дата в диапазоне)
 *   - early_bird             (бронирование за N+ дней)
 *   - last_minute            (бронирование за N- дней)
 *   - occupancy_high         (загрузка слота >= X%)
 *   - group_discount         (гостей >= N)
 *   - weekend                (пятница–воскресенье)
 *
 * Множители применяются все подходящие правила (перемножаются).
 * Итоговая цена округляется до 100 руб.
 */

import { pool } from '@/lib/db-pool';

interface PricingRule {
  rule_type: string;
  date_from: string | null;
  date_to:   string | null;
  days_before_min: number | null;
  days_before_max: number | null;
  occupancy_min:   number | null;
  guests_min:      number | null;
  multiplier: string;
}

interface PriceCalcInput {
  tourId:    number | string;
  tourDate:  string;          // YYYY-MM-DD
  guests:    number;
  basePrice: number;
}

interface PriceCalcResult {
  basePrice:      number;
  finalPrice:     number;
  discount:       number;   // < 0 = скидка, > 0 = надбавка (в рублях)
  multiplier:     number;   // итоговый множитель (1.15 = +15%)
  appliedRules:   string[]; // список сработавших правил
}

export async function calculateDynamicPrice(input: PriceCalcInput): Promise<PriceCalcResult> {
  const { tourId, tourDate, guests, basePrice } = input;

  // Загружаем активные правила для тура
  const { rows: rules } = await pool.query<PricingRule>(
    `SELECT rule_type, date_from, date_to, days_before_min, days_before_max,
            occupancy_min, guests_min, multiplier
     FROM tour_pricing_rules
     WHERE operator_tour_id = $1 AND is_active = TRUE`,
    [tourId]
  );

  if (rules.length === 0) {
    return { basePrice, finalPrice: basePrice, discount: 0, multiplier: 1, appliedRules: [] };
  }

  // Загружаем текущую загрузку слота (если есть)
  const { rows: slotRows } = await pool.query<{ available_slots: number | null; booked_slots: number }>(
    `SELECT available_slots, COALESCE(booked_slots, 0) AS booked_slots
     FROM tour_availability
     WHERE operator_tour_id = $1 AND date = $2 AND is_cancelled = FALSE`,
    [tourId, tourDate]
  );

  const bookDate   = new Date();
  const tourDateObj = new Date(tourDate);
  const daysBeforeTour = Math.floor((tourDateObj.getTime() - bookDate.getTime()) / 86_400_000);
  const isWeekend = [5, 6, 0].includes(tourDateObj.getDay()); // пт, сб, вс

  let occupancyPct = 0;
  if (slotRows.length > 0 && slotRows[0].available_slots) {
    const total = slotRows[0].available_slots;
    const booked = slotRows[0].booked_slots;
    occupancyPct = total > 0 ? Math.round((booked / total) * 100) : 0;
  }

  let totalMultiplier = 1;
  const appliedRules: string[] = [];

  for (const rule of rules) {
    const m = parseFloat(rule.multiplier);
    let applies = false;

    switch (rule.rule_type) {
      case 'season_peak':
      case 'season_low':
        if (rule.date_from && rule.date_to) {
          const from = new Date(rule.date_from);
          const to   = new Date(rule.date_to);
          // Сравниваем только месяц-день (год не важен, сезон повторяется)
          const tourMD = tourDateObj.getMonth() * 100 + tourDateObj.getDate();
          const fromMD = from.getMonth() * 100 + from.getDate();
          const toMD   = to.getMonth()   * 100 + to.getDate();
          applies = fromMD <= toMD
            ? tourMD >= fromMD && tourMD <= toMD
            : tourMD >= fromMD || tourMD <= toMD; // переход через год
        }
        break;

      case 'early_bird':
        applies =
          (rule.days_before_min === null || daysBeforeTour >= rule.days_before_min) &&
          (rule.days_before_max === null || daysBeforeTour <= rule.days_before_max);
        break;

      case 'last_minute':
        applies =
          (rule.days_before_min === null || daysBeforeTour >= rule.days_before_min) &&
          (rule.days_before_max === null || daysBeforeTour <= rule.days_before_max);
        break;

      case 'occupancy_high':
        applies = rule.occupancy_min !== null && occupancyPct >= rule.occupancy_min;
        break;

      case 'group_discount':
        applies = rule.guests_min !== null && guests >= rule.guests_min;
        break;

      case 'weekend':
        applies = isWeekend;
        break;
    }

    if (applies) {
      totalMultiplier *= m;
      appliedRules.push(rule.rule_type);
    }
  }

  // Округляем до 100 руб
  const rawPrice   = basePrice * totalMultiplier;
  const finalPrice = Math.round(rawPrice / 100) * 100;
  const discount   = finalPrice - basePrice;

  return {
    basePrice,
    finalPrice,
    discount,
    multiplier: Math.round(totalMultiplier * 1000) / 1000,
    appliedRules,
  };
}

/**
 * Bulk расчёт для списка дат (для календаря доступности).
 * Делает ровно 2 запроса к БД независимо от количества дат:
 *   1. Загрузка правил тура (один раз)
 *   2. Загрузка занятости слотов для всех дат (батч)
 */
export async function bulkDynamicPrices(
  tourId: number | string,
  dates: string[],
  guests: number,
  basePrice: number
): Promise<Record<string, PriceCalcResult>> {
  if (dates.length === 0) return {};

  // 1. Загружаем правила один раз
  const { rows: rules } = await pool.query<PricingRule>(
    `SELECT rule_type, date_from, date_to, days_before_min, days_before_max,
            occupancy_min, guests_min, multiplier
     FROM tour_pricing_rules
     WHERE operator_tour_id = $1 AND is_active = TRUE`,
    [tourId]
  );

  // 2. Загружаем занятость всех запрошенных слотов одним запросом
  const { rows: slotRows } = await pool.query<{ date: string; available_slots: number | null; booked_slots: number }>(
    `SELECT date::text, available_slots, COALESCE(booked_slots, 0) AS booked_slots
     FROM tour_availability
     WHERE operator_tour_id = $1
       AND date = ANY($2::date[])
       AND is_cancelled = FALSE`,
    [tourId, dates]
  );

  const slotMap: Record<string, { available: number | null; booked: number }> = {};
  for (const row of slotRows) {
    slotMap[row.date] = { available: row.available_slots, booked: row.booked_slots };
  }

  const bookDate = new Date();
  const results: Record<string, PriceCalcResult> = {};

  // 3. Вычисляем цену для каждой даты в памяти (без DB запросов)
  for (const date of dates) {
    if (rules.length === 0) {
      results[date] = { basePrice, finalPrice: basePrice, discount: 0, multiplier: 1, appliedRules: [] };
      continue;
    }

    const tourDateObj = new Date(date);
    const daysBeforeTour = Math.floor((tourDateObj.getTime() - bookDate.getTime()) / 86_400_000);
    const isWeekend = [5, 6, 0].includes(tourDateObj.getDay());

    const slot = slotMap[date];
    let occupancyPct = 0;
    if (slot?.available && slot.available > 0) {
      occupancyPct = Math.round((slot.booked / slot.available) * 100);
    }

    let totalMultiplier = 1;
    const appliedRules: string[] = [];

    for (const rule of rules) {
      const m = parseFloat(rule.multiplier);
      let applies = false;

      switch (rule.rule_type) {
        case 'season_peak':
        case 'season_low':
          if (rule.date_from && rule.date_to) {
            const from = new Date(rule.date_from);
            const to   = new Date(rule.date_to);
            const tourMD = tourDateObj.getMonth() * 100 + tourDateObj.getDate();
            const fromMD = from.getMonth() * 100 + from.getDate();
            const toMD   = to.getMonth()   * 100 + to.getDate();
            applies = fromMD <= toMD
              ? tourMD >= fromMD && tourMD <= toMD
              : tourMD >= fromMD || tourMD <= toMD;
          }
          break;
        case 'early_bird':
        case 'last_minute':
          applies =
            (rule.days_before_min === null || daysBeforeTour >= rule.days_before_min) &&
            (rule.days_before_max === null || daysBeforeTour <= rule.days_before_max);
          break;
        case 'occupancy_high':
          applies = rule.occupancy_min !== null && occupancyPct >= rule.occupancy_min;
          break;
        case 'group_discount':
          applies = rule.guests_min !== null && guests >= rule.guests_min;
          break;
        case 'weekend':
          applies = isWeekend;
          break;
      }

      if (applies) {
        totalMultiplier *= m;
        appliedRules.push(rule.rule_type);
      }
    }

    const rawPrice   = basePrice * totalMultiplier;
    const finalPrice = Math.round(rawPrice / 100) * 100;

    results[date] = {
      basePrice,
      finalPrice,
      discount:   finalPrice - basePrice,
      multiplier: Math.round(totalMultiplier * 1000) / 1000,
      appliedRules,
    };
  }

  return results;
}
