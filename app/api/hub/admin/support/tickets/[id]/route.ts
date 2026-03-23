/**
 * PATCH /api/hub/admin/support/tickets/[id]
 * action: "resolve" | "reply" | "escalate"
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';
import {
  resolveTicket,
  escalateTicket,
  addTicketMessage,
} from '@/lib/support/ticket.service';
import { query } from '@/lib/database';
import { telegramService } from '@/lib/notifications/telegram';

export const dynamic = 'force-dynamic';

const PatchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('resolve'),  resolution: z.string().min(1) }),
  z.object({ action: z.literal('reply'),    text: z.string().min(1) }),
  z.object({ action: z.literal('escalate'), reason: z.string().min(1) }),
]);

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authOrResponse = await requireAdmin(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const body: unknown = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }

  const { action } = parsed.data;
  const ticketId = params.id;

  // Получаем telegram_id туриста для уведомления
  const userRes = await query<{ telegram_id: string | null; name: string }>(
    `SELECT u.telegram_id::text, u.name
     FROM support_tickets st JOIN users u ON u.id = st.user_id
     WHERE st.id = $1 LIMIT 1`,
    [ticketId]
  );
  const telegramId = userRes.rows[0]?.telegram_id ?? null;
  const userName   = (userRes.rows[0]?.name ?? '').split(' ')[0];

  if (action === 'resolve') {
    const { resolution } = parsed.data;
    await resolveTicket(ticketId, resolution);

    // Уведомляем туриста
    if (telegramId) {
      await telegramService.sendMessage({
        chatId: telegramId,
        text: [
          `<b>${userName}, обращение закрыто!</b>`,
          '',
          `<b>Решение:</b> ${esc(resolution)}`,
          '',
          'Если остались вопросы — напиши снова.',
        ].join('\n'),
        parseMode: 'HTML',
      }).catch(() => null);
    }

    return NextResponse.json({ success: true, message: 'Тикет закрыт' });
  }

  if (action === 'reply') {
    const { text } = parsed.data;
    await addTicketMessage(ticketId, { role: 'agent', text });

    // Уведомляем туриста
    if (telegramId) {
      await telegramService.sendMessage({
        chatId: telegramId,
        text: [
          `<b>${userName}, ответ по вашему обращению:</b>`,
          '',
          esc(text),
          '',
          'Если нужно продолжить — пишите здесь.',
        ].join('\n'),
        parseMode: 'HTML',
      }).catch(() => null);
    }

    return NextResponse.json({ success: true, message: 'Ответ отправлен' });
  }

  if (action === 'escalate') {
    const { reason } = parsed.data;
    await escalateTicket(ticketId, reason);
    return NextResponse.json({ success: true, message: 'Тикет эскалирован' });
  }

  return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
}
