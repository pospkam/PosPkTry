/**
 * GET /api/cron/leads-followup
 *
 * Кроn: повторные уведомления по лидам из всех источников.
 *
 * Логика:
 *   1. Находим все лиды со статусом 'new', старше 2 часов.
 *   2. Для каждого лида ищем следующего оператора с подходящими активностями,
 *      ещё не получавшего уведомление об этом лиде.
 *      Если интересы не указаны — берём любого оператора.
 *   3. Если оператор найден — отправляем повторное уведомление.
 *   4. Если операторов больше нет — эскалация к admin + смена статуса на 'contacted'.
 *
 * Защита: заголовок Authorization: Bearer <CRON_SECRET>
 *          или query-параметр ?secret=<CRON_SECRET>
 *
 * Запуск: cron-job.org каждые 30 минут
 *   URL:  https://tourhab.ru/api/cron/leads-followup?secret=<CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { telegramService } from '@/lib/notifications/telegram';

export const dynamic = 'force-dynamic';

// ── Типы данных ───────────────────────────────────────────────────────────────

interface LeadSourceData {
  source?: string;
  interests?: string[];
  date_from?: string;
  date_to?: string;
  arrival?: string;    // TripPlanner alias for date_from
  departure?: string;  // TripPlanner alias for date_to
  trip_days?: number;
  chat_id?: string;
  notified_operators?: string[];
  followup_count?: number;
  last_followup?: string;
  escalated_to_admin?: boolean;
}

interface FollowupLead {
  id: string;
  name: string;
  phone: string;
  source_data: LeadSourceData;
}

interface OperatorMatch {
  name: string;
  slug: string;
  telegram_chat_id: string;
}

// ── Утилиты ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Основной обработчик ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── Проверка секрета ─────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on server' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('Authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const provided = authHeader?.replace('Bearer ', '').trim() ?? querySecret ?? '';
  if (provided !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminChatId = process.env.TELEGRAM_CHAT_ID ?? '';

  try {
    // ── Выбираем лиды, требующие followup ───────────────────────────────────
    // Условия:
    //   - статус 'new' (ещё не обработан)
    //   - источник 'telegram_bot'
    //   - создан более 2 часов назад
    //   - либо ещё не было followup, либо последний followup был > 2 часов назад
    const leadsRes = await pool.query<FollowupLead>(`
      SELECT id::text, name, phone, source_data
      FROM leads
      WHERE status = 'new'
        AND created_at < NOW() - INTERVAL '2 hours'
        AND (
          source_data->>'last_followup' IS NULL
          OR (source_data->>'last_followup')::timestamptz < NOW() - INTERVAL '2 hours'
        )
        AND COALESCE((source_data->>'escalated_to_admin')::boolean, false) = false
      ORDER BY created_at ASC
      LIMIT 20
    `);

    if (leadsRes.rows.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: 'Нет лидов для обработки' });
    }

    // Диагностика: сколько операторов с telegram_chat_id
    const diagRes = await pool.query<{ total: string; with_telegram: string }>(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE contacts->>'telegram_chat_id' IS NOT NULL) AS with_telegram
       FROM partners WHERE is_public = TRUE`
    );
    const diag = diagRes.rows[0];

    let processed = 0;
    let escalated = 0;
    let noOperators = 0;

    for (const lead of leadsRes.rows) {
      const sd: LeadSourceData = lead.source_data ?? {};
      const interests = sd.interests ?? [];
      const alreadyNotified = sd.notified_operators ?? [];
      const followupCount = sd.followup_count ?? 0;

      // ── Ищем следующего операторa с подходящими активностями ──────────────
      let nextOperator: OperatorMatch | null = null;

      if (interests.length > 0) {
        const opRes = await pool.query<OperatorMatch>(
          `SELECT p.name, p.slug, p.contacts->>'telegram_chat_id' AS telegram_chat_id
           FROM partners p
           JOIN operator_tours ot ON ot.operator_id = p.id
           WHERE ot.activity_type = ANY($1)
             AND ot.is_active = TRUE
             AND p.is_public = TRUE
             AND (p.contacts->>'telegram_chat_id') IS NOT NULL
             AND NOT (p.slug = ANY($2))
           GROUP BY p.name, p.slug, p.contacts->>'telegram_chat_id'
           LIMIT 1`,
          [interests, alreadyNotified]
        );
        nextOperator = opRes.rows[0] ?? null;
      }

      // Fallback: если нет интересов или не нашли по интересам — любой оператор не из списка
      if (!nextOperator) {
        const fallbackRes = await pool.query<OperatorMatch>(
          `SELECT name, slug, contacts->>'telegram_chat_id' AS telegram_chat_id
           FROM partners
           WHERE is_public = TRUE
             AND (contacts->>'telegram_chat_id') IS NOT NULL
             AND NOT (slug = ANY($1))
           LIMIT 1`,
          [alreadyNotified]
        );
        nextOperator = fallbackRes.rows[0] ?? null;
      }

      if (nextOperator) {
        // ── Уведомляем следующего оператора ───────────────────────────────
        const attempt = followupCount + 1;
        const msgLines = [
          attempt === 1
            ? '⏰ <b>Напоминание: горячий лид!</b>'
            : `⏰ <b>Повторное уведомление (попытка ${attempt})</b>`,
          '',
          `<b>Имя:</b> ${esc(lead.name)}`,
          `<b>Телефон:</b> <a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a>`,
          interests.length > 0 ? `<b>Интересы:</b> ${interests.join(', ')}` : '',
          (sd.date_from ?? sd.arrival) ? `<b>Даты:</b> ${sd.date_from ?? sd.arrival} — ${sd.date_to ?? sd.departure}` : '',
          '',
          '⚡️ Турист ещё не получил ответа. Пожалуйста, свяжитесь с ним!',
          `<a href="https://tourhab.ru/hub/operator/bookings">Открыть в CRM →</a>`,
        ].filter(Boolean).join('\n');

        await telegramService.sendMessage({
          chatId: nextOperator.telegram_chat_id,
          text: msgLines,
          parseMode: 'HTML',
        }).catch(() => {});

        // ── Обновляем source_data ──────────────────────────────────────────
        const newNotified = [...alreadyNotified, nextOperator.slug];
        await pool.query(
          `UPDATE leads
           SET source_data = source_data || $1::jsonb,
               updated_at  = NOW()
           WHERE id = $2`,
          [
            JSON.stringify({
              notified_operators: newNotified,
              followup_count: attempt,
              last_followup: new Date().toISOString(),
            }),
            lead.id,
          ]
        );

      } else {
        // ── Операторы кончились — эскалация к admin ────────────────────────
        noOperators++;
        escalated++;
        if (adminChatId) {
          await telegramService.sendMessage({
            chatId: adminChatId,
            text: [
              '⚠️ <b>Лид без ответа — нужна ручная обработка!</b>',
              '',
              `<b>Телефон:</b> <a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a>`,
              `<b>Имя:</b> ${esc(lead.name)}`,
              interests.length > 0 ? `<b>Интересы:</b> ${interests.join(', ')}` : '',
              (sd.date_from ?? sd.arrival) ? `<b>Даты:</b> ${sd.date_from ?? sd.arrival} — ${sd.date_to ?? sd.departure}` : '',
              `<b>Уведомлений отправлено:</b> ${followupCount}`,
              '',
              'Свободных операторов не осталось. Обработайте вручную.',
              `<a href="https://tourhab.ru/hub/admin/leads">CRM лиды →</a>`,
              `<code>${lead.id}</code>`,
            ].filter(Boolean).join('\n'),
            parseMode: 'HTML',
          }).catch(() => {});
        }

        // Меняем статус на 'contacted' + помечаем как обработанный кроном
        await pool.query(
          `UPDATE leads
           SET status      = 'contacted',
               source_data = source_data || $1::jsonb,
               updated_at  = NOW()
           WHERE id = $2`,
          [
            JSON.stringify({
              followup_count: followupCount + 1,
              last_followup: new Date().toISOString(),
              escalated_to_admin: true,
            }),
            lead.id,
          ]
        );
      }

      processed++;
    }

    return NextResponse.json({
      ok: true,
      processed,
      escalated_to_admin: escalated,
      no_operator_found: noOperators,
      leads_found: leadsRes.rows.length,
      operators_total: Number(diag.total),
      operators_with_telegram: Number(diag.with_telegram),
      warning: Number(diag.with_telegram) === 0
        ? 'Ни один оператор не имеет telegram_chat_id — все лиды эскалируются к admin. Добавьте telegram_chat_id в contacts оператора через /hub/admin/operators.'
        : null,
    });

  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
