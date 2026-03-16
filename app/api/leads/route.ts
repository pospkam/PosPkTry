import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';
import { telegramService } from '@/lib/notifications/telegram';
import { notifyAdminNewLead } from '@/lib/notifications/telegram-channel';

const LeadSchema = z.object({
  name:        z.string().min(2, 'Укажите имя').max(120),
  phone:       z.string().min(7, 'Укажите телефон').max(30),
  comment:     z.string().max(1000).optional(),
  route_id:    z.string().uuid().optional(),
  route_title: z.string().max(255).optional(),
  source_url:  z.string().max(500).optional(),
  source_data: z.record(z.unknown()).optional(),
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

  const { name, phone, comment, route_id, route_title, source_url, source_data } = parse.data;

  let leadId: string;
  try {
    const res = await pool.query<{ id: string }>(
      `INSERT INTO leads (name, phone, comment, route_id, route_title, source_url, source_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [name, phone, comment ?? null, route_id ?? null, route_title ?? null, source_url ?? null, source_data ? JSON.stringify(source_data) : null]
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
    if (source_data) {
      const sd = source_data as Record<string, string | undefined>;
      if (sd.utm_source) lines.push(`<b>UTM:</b> ${escHtml(sd.utm_source)}${sd.utm_medium ? ` / ${escHtml(sd.utm_medium)}` : ''}${sd.utm_campaign ? ` / ${escHtml(sd.utm_campaign)}` : ''}`);
      if (sd.referrer) lines.push(`<b>Referrer:</b> ${escHtml(sd.referrer)}`);
    }
    lines.push('', `<code>${leadId}</code>`);

    telegramService.sendMessage({ chatId, text: lines.join('\n'), parseMode: 'HTML' })
      .catch(() => { /* уведомление — некритично */ });
  }

  // Дублируем в centralised admin-чат (TELEGRAM_CHAT_ID), если он отличается от LEADS_CHAT_ID
  notifyAdminNewLead({
    id:         leadId,
    name,
    phone,
    comment:    comment ?? null,
    routeTitle: route_title ?? null,
    sourceUrl:  source_url ?? null,
  }).catch(() => { /* некритично */ });

  return NextResponse.json({ success: true, id: leadId }, { status: 201 });
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
