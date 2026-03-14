import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';
import { telegramService } from '@/lib/notifications/telegram';

const LeadSchema = z.object({
  name:        z.string().min(2, 'Укажите имя').max(120),
  phone:       z.string().min(7, 'Укажите телефон').max(30),
  comment:     z.string().max(1000).optional(),
  route_id:    z.string().uuid().optional(),
  route_title: z.string().max(255).optional(),
  source_url:  z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Неверный формат запроса' }, { status: 400 });
  }

  const parse = LeadSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { success: false, error: parse.error.issues[0]?.message ?? 'Ошибка валидации' },
      { status: 422 }
    );
  }

  const { name, phone, comment, route_id, route_title, source_url } = parse.data;

  let leadId: string;
  try {
    const res = await pool.query<{ id: string }>(
      `INSERT INTO leads (name, phone, comment, route_id, route_title, source_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [name, phone, comment ?? null, route_id ?? null, route_title ?? null, source_url ?? null]
    );
    leadId = res.rows[0].id;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[leads] DB error:', err);
    }
    return NextResponse.json({ success: false, error: 'Ошибка сервера. Попробуйте позже.' }, { status: 500 });
  }

  // Отправка уведомления в Telegram (не блокирует ответ)
  const chatId = process.env.TELEGRAM_LEADS_CHAT_ID;
  if (chatId) {
    const lines = [
      '<b>Новая заявка с сайта</b>',
      '',
      `<b>Имя:</b> ${escHtml(name)}`,
      `<b>Телефон:</b> <a href="tel:${escHtml(phone)}">${escHtml(phone)}</a>`,
    ];
    if (comment) lines.push(`<b>Комментарий:</b> ${escHtml(comment)}`);
    if (route_title) lines.push(`<b>Маршрут:</b> ${escHtml(route_title)}`);
    if (source_url) lines.push(`<b>Страница:</b> <a href="${escHtml(source_url)}">${escHtml(source_url)}</a>`);
    lines.push('', `<code>${leadId}</code>`);

    telegramService.sendMessage({ chatId, text: lines.join('\n'), parseMode: 'HTML' })
      .catch(() => { /* уведомление — некритично */ });
  }

  return NextResponse.json({ success: true, id: leadId }, { status: 201 });
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
