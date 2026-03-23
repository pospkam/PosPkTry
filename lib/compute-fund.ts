/**
 * lib/compute-fund.ts
 *
 * Фонд оплаты AI-вычислений.
 * 1% от каждого успешного бронирования → в пул токенов.
 *
 * Стоимость за 1 токен (приблизительно):
 *   MiMo-V2-Pro:   $1   / 1M tokens ≈ 0.00009₽ / token
 *   DeepSeek:      $0.27/ 1M tokens ≈ 0.000024₽/ token
 *   Board Meeting: ~40 000 tokens → ≈ 3.6₽
 *   Kuzmich chat:  ~1 500 tokens  → ≈ 0.13₽
 *
 * Exchange rate estimate: $1 ≈ 90₽
 */

import { pool } from '@/lib/db-pool';

export type FundSourceType =
  | 'booking_operator'
  | 'booking_tour'
  | 'booking_transfer'
  | 'manual_topup';

const CONTRIBUTION_RATE = 0.01; // 1% от суммы бронирования
const USD_RUB = 90;             // курс оценки (используется только в калькуляторе)

// Стоимость одного AI-совещания совета директоров (~ 40K tokens, MiMo weighted avg)
const MEETING_COST_RUB = 3.6;
// Стоимость одного разговора с Кузьмичем (~ 1 500 tokens)
const CHAT_COST_RUB = 0.13;

/**
 * Записывает вклад от бронирования в фонд токенов.
 * Идемпотентно: повторный вызов с тем же source_id игнорируется.
 */
export async function addBookingContribution(
  sourceType: FundSourceType,
  sourceId:   string,
  amountRub:  number,
  note?:      string,
): Promise<void> {
  const contribution = Math.round(amountRub * CONTRIBUTION_RATE * 100) / 100;
  if (contribution <= 0) return;

  await pool.query(
    `INSERT INTO compute_fund_transactions
       (source_type, source_id, booking_amount, contribution, note)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (source_type, source_id) DO NOTHING`,
    [sourceType, sourceId, amountRub, contribution, note ?? null],
  ).catch(() => null); // никогда не прерываем платёжный поток
}

/**
 * Текущий баланс фонда + статистика.
 */
export async function getComputeFundStats(): Promise<{
  total_contributed_rub:  number;
  total_transactions:     number;
  estimated_meetings:     number;
  estimated_chats:        number;
  last_contribution_at:   string | null;
  breakdown: Array<{ source_type: string; total_rub: number; count: number }>;
}> {
  const [totals, breakdown, last] = await Promise.all([
    pool.query<{ total: string; txn_count: string }>(
      `SELECT
         COALESCE(SUM(contribution), 0) AS total,
         COUNT(*) AS txn_count
       FROM compute_fund_transactions`,
    ),
    pool.query<{ source_type: string; total_rub: string; count: string }>(
      `SELECT
         source_type,
         SUM(contribution) AS total_rub,
         COUNT(*)          AS count
       FROM compute_fund_transactions
       GROUP BY source_type
       ORDER BY total_rub DESC`,
    ),
    pool.query<{ created_at: string }>(
      `SELECT created_at FROM compute_fund_transactions ORDER BY created_at DESC LIMIT 1`,
    ),
  ]);

  const totalRub = parseFloat(totals.rows[0]?.total ?? '0');

  return {
    total_contributed_rub: totalRub,
    total_transactions:    parseInt(totals.rows[0]?.txn_count ?? '0', 10),
    estimated_meetings:    Math.floor(totalRub / MEETING_COST_RUB),
    estimated_chats:       Math.floor(totalRub / CHAT_COST_RUB),
    last_contribution_at:  last.rows[0]?.created_at ?? null,
    breakdown: breakdown.rows.map(r => ({
      source_type: r.source_type,
      total_rub:   parseFloat(r.total_rub),
      count:       parseInt(r.count, 10),
    })),
  };
}

// Экспортируем константы для UI
export const FUND_CONSTANTS = {
  CONTRIBUTION_RATE,
  USD_RUB,
  MEETING_COST_RUB,
  CHAT_COST_RUB,
};
