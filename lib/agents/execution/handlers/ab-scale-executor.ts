/**
 * AB Scale Executor — применяет победителя A/B ценового эксперимента.
 *
 * Flow:
 *   1. Ищет запущенные эксперименты >5 дней с metric='booking_count'
 *   2. Считает бронирования на группу A и B
 *   3. Сравнивает booking rates (брони / тур / день)
 *   4. Если B выигрывает >15% и total брони >= 3 → применяет скидку, статус 'completed'
 *   5. Если A или ничья → статус 'completed', цены не меняет
 *   6. Telegram-уведомление с результатами
 */

import { pool } from '@/lib/db-pool';

// Локальные типы — избегаем циклического импорта из initiative-executor
export interface ExecutionTask {
  approval_id: string;
  executor_agent_id: string;
  action_type: string;
  description: string;
  context: Record<string, unknown>;
  due_date: string;
}

export interface ExecutionResult {
  success: boolean;
  changes_made: string[];
  errors: string[];
  rollback_available: boolean;
  verification_passed: boolean;
}

interface ExperimentRow {
  id: string;
  name: string;
  created_at: Date;
  variant_a: { label: string; tour_ids: number[] };
  variant_b: { label: string; tour_ids: number[]; discount_pct?: number };
}

interface BookingCountRow {
  variant: string;
  bookings: number;
}

export async function executeABScaleWinner(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors:  string[] = [];

  try {
    // ── Step 1: Find running experiments > 5 days with metric='booking_count' ──
    const experiments = await pool.query<ExperimentRow>(
      `SELECT id, name, created_at, variant_a, variant_b
       FROM agent_experiments
       WHERE metric = 'booking_count'
         AND status = 'running'
         AND created_at < NOW() - INTERVAL '5 days'
       ORDER BY created_at ASC
       LIMIT 10`
    );

    if (experiments.rows.length === 0) {
      return {
        success: true,
        changes_made: ['Нет A/B экспериментов готовых к оценке (>5 дней, running, booking_count)'],
        errors: [],
        rollback_available: false,
        verification_passed: true,
      };
    }

    changes.push(`Найдено ${experiments.rows.length} экспериментов для оценки`);

    for (const exp of experiments.rows) {
      try {
        const ageInDays = (Date.now() - new Date(exp.created_at).getTime()) / (1000 * 60 * 60 * 24);

        // ── Step 2: Count bookings per group ────────────────────────────────────
        const counts = await pool.query<BookingCountRow>(
          `SELECT
             'a' as variant,
             COUNT(ob.id)::int as bookings
           FROM agent_experiments e
           CROSS JOIN LATERAL (
             SELECT jsonb_array_elements_text(e.variant_a->'tour_ids')::int AS tour_id
           ) ta
           JOIN operator_bookings ob ON ob.operator_tour_id = ta.tour_id
             AND ob.created_at > e.created_at
             AND ob.deleted_at IS NULL
           WHERE e.id = $1

           UNION ALL

           SELECT
             'b' as variant,
             COUNT(ob.id)::int as bookings
           FROM agent_experiments e
           CROSS JOIN LATERAL (
             SELECT jsonb_array_elements_text(e.variant_b->'tour_ids')::int AS tour_id
           ) tb
           JOIN operator_bookings ob ON ob.operator_tour_id = tb.tour_id
             AND ob.created_at > e.created_at
             AND ob.deleted_at IS NULL
           WHERE e.id = $1`,
          [exp.id]
        );

        const aRow = counts.rows.find(r => r.variant === 'a');
        const bRow = counts.rows.find(r => r.variant === 'b');

        const aBookings   = aRow?.bookings ?? 0;
        const bBookings   = bRow?.bookings ?? 0;
        const totalBookings = aBookings + bBookings;

        const aTourCount = Array.isArray(exp.variant_a?.tour_ids) ? exp.variant_a.tour_ids.length : 1;
        const bTourCount = Array.isArray(exp.variant_b?.tour_ids) ? exp.variant_b.tour_ids.length : 1;

        // Rate = bookings per tour per day
        const aRate = aTourCount > 0 ? (aBookings / aTourCount / ageInDays) : 0;
        const bRate = bTourCount > 0 ? (bBookings / bTourCount / ageInDays) : 0;

        // ── Step 3: Determine winner ──────────────────────────────────────────
        const bWinsBy = aRate > 0 ? ((bRate - aRate) / aRate) * 100 : (bRate > 0 ? 100 : 0);

        let winner: 'a' | 'b' | 'tie';
        if (bWinsBy > 15 && totalBookings >= 3) {
          winner = 'b';
        } else if (aRate > bRate) {
          winner = 'a';
        } else if (bRate > aRate) {
          winner = 'b'; // wins but not by threshold
        } else {
          winner = 'tie';
        }

        changes.push(
          `Эксперимент "${exp.name}": A=${aBookings} броней (${aRate.toFixed(3)}/тур/день), ` +
          `B=${bBookings} броней (${bRate.toFixed(3)}/тур/день), всего=${totalBookings}, победитель=${winner}`
        );

        // ── Step 4: Apply discount if B wins convincingly ───────────────────
        if (winner === 'b' && bWinsBy > 15 && totalBookings >= 3) {
          const discountPct = typeof exp.variant_b?.discount_pct === 'number'
            ? exp.variant_b.discount_pct
            : 10;

          const bTourIds = exp.variant_b?.tour_ids ?? [];

          if (bTourIds.length > 0) {
            await pool.query(
              `UPDATE operator_tours
               SET base_price = ROUND(base_price * (1 - $1::numeric / 100), 0),
                   price_old = base_price,
                   updated_at = NOW()
               WHERE id = ANY($2::int[])
                 AND deleted_at IS NULL`,
              [discountPct, bTourIds]
            );
            changes.push(
              `Применена скидка ${discountPct}% к ${bTourIds.length} турам группы B ` +
              `(B выиграл на ${bWinsBy.toFixed(1)}%)`
            );
          }
        }

        // ── Step 5: Mark experiment completed ────────────────────────────────
        await pool.query(
          `UPDATE agent_experiments
           SET status = 'completed',
               winner = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [exp.id, winner]
        );

        changes.push(`Эксперимент ${exp.id.slice(0, 8)} → статус completed, winner=${winner}`);

      } catch (expErr) {
        errors.push(
          `Эксперимент ${exp.id.slice(0, 8)}: ` +
          (expErr instanceof Error ? expErr.message : String(expErr))
        );
      }
    }

    // ── Step 6: Telegram notification ──────────────────────────────────────────
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:    chatId,
          parse_mode: 'HTML',
          text: [
            '<b>A/B Scale Winner — результаты</b>',
            '',
            `Обработано экспериментов: ${experiments.rows.length}`,
            `Изменений: ${changes.length}`,
            errors.length > 0 ? `Ошибок: ${errors.length}` : 'Ошибок нет',
          ].join('\n'),
        }),
      }).catch(() => null);
    }

    return {
      success:             errors.length === 0,
      changes_made:        changes,
      errors,
      rollback_available:  true,
      verification_passed: true,
    };

  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return {
      success:             false,
      changes_made:        changes,
      errors,
      rollback_available:  false,
      verification_passed: false,
    };
  }
}
