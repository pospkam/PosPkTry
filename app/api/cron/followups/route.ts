/**
 * GET /api/cron/followups?secret=<CRON_SECRET>
 *
 * Обрабатывает очередь follow-up напоминаний.
 * Отправляет администратору в Telegram напоминание связаться с туристом.
 *
 * Запускать каждые 30 минут (GitHub Actions: cron-leads.yml).
 */
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { timingSafeCompare } from '@/lib/security/timing-safe';

export const dynamic     = 'force-dynamic';
export const maxDuration = 60;

interface FollowupRow {
  id:            string;
  lead_id:       string;
  followup_type: string;
  message_text:  string | null;
  lead_name:     string;
  lead_phone:    string;
  ai_score:      number | null;
  lead_status:   string;
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!timingSafeCompare(secret, process.env.CRON_SECRET ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // Берём до 10 followup-ов срок которых наступил
  const { rows } = await pool.query<FollowupRow>(`
    SELECT
      f.id, f.lead_id, f.followup_type, f.message_text,
      l.name  AS lead_name,
      l.phone AS lead_phone,
      l.ai_score,
      l.status AS lead_status
    FROM lead_followups f
    JOIN leads l ON l.id = f.lead_id
    WHERE f.status = 'pending'
      AND f.scheduled_at <= NOW()
      AND l.status NOT IN ('converted', 'rejected', 'ai_processing')
    ORDER BY f.scheduled_at ASC
    LIMIT 10
  `);

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let sent = 0;
  let skipped = 0;

  for (const row of rows) {
    // Уже конвертирован — пропускаем без уведомления
    if (['converted', 'rejected'].includes(row.lead_status)) {
      await pool.query(
        `UPDATE lead_followups SET status = 'skipped', sent_at = NOW() WHERE id = $1`,
        [row.id]
      );
      skipped++;
      continue;
    }

    const typeLabel: Record<string, string> = {
      day1: 'Первый follow-up (24ч)',
      day2: 'Второй follow-up',
      day5: 'Последний шанс',
    };
    const label = typeLabel[row.followup_type] ?? row.followup_type;

    const scoreBar = row.ai_score
      ? '█'.repeat(Math.round(row.ai_score / 10)) + '░'.repeat(10 - Math.round(row.ai_score / 10))
      : '??????????';

    const text = [
      `<b>${label}</b>`,
      ``,
      `Турист: <b>${escHtml(row.lead_name)}</b>`,
      `Телефон: <code>${escHtml(row.lead_phone)}</code>`,
      row.ai_score ? `Скор: ${scoreBar} ${row.ai_score}/100` : '',
      ``,
      row.message_text ? `<i>${escHtml(row.message_text)}</i>` : '',
      ``,
      `<a href="https://tourhab.ru/hub/admin/leads">Открыть лиды →</a>`,
    ].filter(Boolean).join('\n');

    if (token && chatId) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [[
              { text: 'Связался', callback_data: `lead_contacted:${row.lead_id}` },
              { text: 'Конвертирован', callback_data: `lead_converted:${row.lead_id}` },
              { text: 'Отказ', callback_data: `lead_rejected:${row.lead_id}` },
            ]],
          },
        }),
      }).catch(() => {});
    }

    await pool.query(
      `UPDATE lead_followups SET status = 'sent', sent_at = NOW() WHERE id = $1`,
      [row.id]
    );
    sent++;
  }

  return NextResponse.json({ ok: true, processed: rows.length, sent, skipped });
}
