/**
 * GET /api/cron/support-escalate
 *
 * Автоэскалация тикетов поддержки зависших более 24 часов.
 * Уведомляет владельца в Telegram.
 *
 * Запускать: каждые 6 часов
 *
 * cron-job.org:
 *   https://tourhab.ru/api/cron/support-escalate?secret=SECRET
 *   → каждые 6 часов
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOverdueTickets, escalateTicket } from '@/lib/support/ticket.service';
import { telegramService } from '@/lib/notifications/telegram';
import { CATEGORY_LABELS } from '@/lib/support/categorize';

export const dynamic = 'force-dynamic';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const overdue = await getOverdueTickets();
  if (overdue.length === 0) {
    return NextResponse.json({ ok: true, escalated: 0 });
  }

  let escalated = 0;

  for (const ticket of overdue) {
    await escalateTicket(ticket.id, 'Автоэскалация: нет ответа более 24 часов');
    escalated++;
  }

  // Уведомляем владельца если тикеты зависли
  const adminChatId = process.env.TELEGRAM_CHAT_ID;
  if (adminChatId && escalated > 0) {
    const lines = [
      `<b>Автоэскалация тикетов поддержки</b>`,
      '',
      `Зависших более 24ч: <b>${escalated}</b>`,
      '',
    ];

    for (const t of overdue.slice(0, 5)) {
      const label = CATEGORY_LABELS[t.category] ?? t.category;
      lines.push(`— <code>#${t.id.slice(0, 8)}</code> [${label}] ${esc(t.subject.slice(0, 50))}`);
    }

    if (overdue.length > 5) {
      lines.push(`  ...и ещё ${overdue.length - 5} тикетов`);
    }

    lines.push(
      '',
      '<a href="https://tourhab.ru/hub/admin/support">Открыть тикеты →</a>',
    );

    await telegramService.sendMessage({
      chatId:    adminChatId,
      text:      lines.join('\n'),
      parseMode: 'HTML',
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, escalated });
}
