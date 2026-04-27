import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/route-check
 * Проверяет просроченные маршруты (end_date < сегодня и ещё не completed)
 * Отправляет напоминания. Вызывается раз в день.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('x-cron-secret');
  if (authHeader !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

  // Находим просроченные маршруты без напоминания
  const overdue = await query(
    `SELECT id, leader_name, leader_phone, leader_email,
            emergency_contact_name, emergency_contact_phone,
            route_name, end_date, reminder_sent
     FROM route_registrations
     WHERE end_date < $1
       AND mchs_status != 'confirmed'
       AND completed_at IS NULL`,
    [today]
  );

  if (overdue.rows.length === 0) {
    return NextResponse.json({ success: true, message: 'No overdue routes', count: 0 });
  }

  // Для каждого просроченного маршрута:
  // 1. Отправляем Telegram-уведомление админу
  const results = [];

  for (const row of overdue.rows) {
    const daysOverdue = Math.floor(
      (now.getTime() - new Date(row.end_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Telegram-уведомление админу
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const text = [
        `⚠️ <b>Маршрут просрочен</b>`,
        ``,
        `Маршрут: ${row.route_name}`,
        `Руководитель: ${row.leader_name} (${row.leader_phone})`,
        `Экстренный контакт: ${row.emergency_contact_name} (${row.emergency_contact_phone})`,
        `Дата возврата: ${row.end_date}`,
        `Просрочка: ${daysOverdue} дн.`,
        ``,
        `Рекомендация: свяжитесь с экстренным контактом`,
      ].join('\n');

      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      }).catch(() => { /* fire-and-forget */ });
    }

    // Отмечаем что напоминание отправлено
    await query(
      `UPDATE route_registrations SET reminder_sent = true WHERE id = $1`,
      [row.id]
    );

    results.push({
      route: row.route_name,
      leader: row.leader_name,
      daysOverdue,
      notified: true,
    });
  }

  return NextResponse.json({
    success: true,
    message: `Checked ${overdue.rows.length} overdue routes`,
    results,
  });
}
