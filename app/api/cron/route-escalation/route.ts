import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/route-escalation
 * 4-ступенчатая эскалация для просроченных маршрутов.
 * Вызывается каждый час. Проверяет текущий час и запускает нужный шаг.
 *
 * Шаг 1: День возврата, ~10:00 — Push туристу (PWA notification)
 * Шаг 2: День возврата, ~18:00 — Push туристу повтор
 * Шаг 3: День возврата +1, ~10:00 — Экстренный контакт (Telegram/Email/MAX)
 * Шаг 4: День возврата +2, ~10:00 — Экстренный контакт + рекомендация МЧС
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('x-cron-secret');
  if (authHeader !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentHour = now.getUTCHours();

  interface EscalationRoute {
    id: string; user_id: string; route_name: string;
    leader_name: string; leader_phone: string; leader_email: string;
    emergency_contact_name: string; emergency_contact_phone: string;
    emergency_contact_relation: string; emergency_contact_telegram_chat_id: string;
    emergency_contact_email: string; emergency_contact_consent: boolean;
    start_date: string; end_date: string; completed_at: string | null; reminder_sent: boolean;
  }
  // Находим все активные маршруты (не completed, end_date <= сегодня)
  const activeRoutes = await query<EscalationRoute>(
    `SELECT id, user_id, route_name, leader_name, leader_phone, leader_email,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
            emergency_contact_telegram_chat_id, emergency_contact_email,
            emergency_contact_consent,
            start_date, end_date, completed_at, reminder_sent
     FROM route_registrations
     WHERE end_date <= $1
       AND completed_at IS NULL`,
    [today]
  );

  if (activeRoutes.rows.length === 0) {
    return NextResponse.json({ success: true, message: 'No active overdue routes', count: 0 });
  }

  const results: Array<{ route: string; step: number; channel: string; status: string }> = [];

  for (const route of activeRoutes.rows) {
    const endDate = new Date(route.end_date);
    const daysDiff = Math.floor(
      (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Проверяем, какой шаг нужно выполнить
    let stepToRun: number | null = null;

    if (daysDiff === 0 && currentHour >= 9 && currentHour < 12) {
      // Шаг 1: день возврата, утро
      stepToRun = 1;
    } else if (daysDiff === 0 && currentHour >= 17 && currentHour < 20) {
      // Шаг 2: день возврата, вечер
      stepToRun = 2;
    } else if (daysDiff === 1 && currentHour >= 9 && currentHour < 12) {
      // Шаг 3: +1 день
      stepToRun = 3;
    } else if (daysDiff >= 2 && currentHour >= 9 && currentHour < 12) {
      // Шаг 4: +2 дня и далее
      stepToRun = 4;
    }

    if (!stepToRun) continue;

    // Проверяем, не отправляли ли уже этот шаг
    const existing = await query(
      `SELECT id FROM route_registration_notifications
       WHERE registration_id = $1 AND step = $2 AND status = 'sent'`,
      [route.id, stepToRun]
    );

    if (existing.rows.length > 0) continue; // уже отправлено

    // Определяем каналы для этого шага
    if (stepToRun <= 2) {
      // Шаги 1-2: push туристу (через PWA / Telegram)
      // Для MVP: записываем в лог, реальный push — через Service Worker
      await query(
        `INSERT INTO route_registration_notifications
           (registration_id, step, channel, recipient, status, sent_at)
         VALUES ($1, $2, 'telegram', $3, 'sent', now())`,
        [route.id, stepToRun, route.leader_phone]
      );

      // Отправляем туристу в Telegram (если Kuzmich знает его chat_id)
      if (route.user_id) {
        const userChat = await query(
          `SELECT telegram_chat_id FROM users WHERE id = $1 AND telegram_chat_id IS NOT NULL`,
          [route.user_id]
        );
        if (userChat.rows.length > 0) {
          const chatId = userChat.rows[0].telegram_chat_id;
          const text = stepToRun === 1
            ? `🔔 Напоминание: ты должен был вернуться с маршрута "${route.route_name}" сегодня (${route.end_date}). Всё в порядке? Нажми "Я вернулся" в приложении: tourhab.ru/safety/return?id=${route.id}`
            : `⚠️ Повторное напоминание: маршрут "${route.route_name}" не закрыт. Если всё в порядке, отметь возврат: tourhab.ru/safety/return?id=${route.id}`;

          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (botToken) {
            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
            }).catch(() => {});
          }
        }
      }

      results.push({ route: route.route_name, step: stepToRun, channel: 'telegram_tourist', status: 'sent' });

    } else if (stepToRun === 3) {
      // Шаг 3: уведомление экстренного контакта
      const subject = `TourHab: ${route.leader_name} не отметил возврат с маршрута`;
      const text = [
        `Здравствуйте, ${route.emergency_contact_name}.`,
        ``,
        `${route.leader_name}${route.emergency_contact_relation ? ` (${route.emergency_contact_relation})` : ''} ` +
        `должен был вернуться с маршрута "${route.route_name}" ${route.end_date}.`,
        `На данный момент возврат не отмечен.`,
        ``,
        `Попробуйте связаться с ним по телефону: ${route.leader_phone}`,
        ``,
        `Если связь не восстанавливается — рекомендуем обратиться в МЧС: 112`,
        ``,
        `— TourHab (tourhab.ru)`,
      ].join('\n');

      let telegramSent = false;
      let emailSent = false;

      // Telegram (если есть chat_id и согласие)
      if (route.emergency_contact_telegram_chat_id && route.emergency_contact_consent) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (botToken) {
          const tgResult = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: route.emergency_contact_telegram_chat_id,
              text,
              parse_mode: 'HTML',
            }),
          });
          telegramSent = tgResult.ok;
        }
      }

      // Email (всегда, если есть email)
      if (route.emergency_contact_email) {
        const emailResult = await sendEmail({
          to: route.emergency_contact_email,
          subject,
          text,
        });
        emailSent = emailResult.success;
      }

      // Записываем в лог
      if (telegramSent) {
        await query(
          `INSERT INTO route_registration_notifications
             (registration_id, step, channel, recipient, status, sent_at)
           VALUES ($1, $2, 'telegram', $3, 'sent', now())`,
          [route.id, stepToRun, String(route.emergency_contact_telegram_chat_id)]
        );
      }
      if (emailSent) {
        await query(
          `INSERT INTO route_registration_notifications
             (registration_id, step, channel, recipient, status, sent_at)
           VALUES ($1, $2, 'email', $3, 'sent', now())`,
          [route.id, stepToRun, route.emergency_contact_email]
        );
      }

      // Если ни один канал не сработал — skip
      if (!telegramSent && !emailSent) {
        await query(
          `INSERT INTO route_registration_notifications
             (registration_id, step, channel, recipient, status, sent_at)
           VALUES ($1, $2, 'telegram', $3, 'failed', now())`,
          [route.id, stepToRun, 'no_channel']
        );
      }

      results.push({
        route: route.route_name,
        step: stepToRun,
        channel: telegramSent ? 'telegram' : emailSent ? 'email' : 'none',
        status: telegramSent || emailSent ? 'sent' : 'failed',
      });

    } else if (stepToRun === 4) {
      // Шаг 4: экстренный контакт + рекомендация МЧС
      const subject = `URGENT: ${route.leader_name} — просрочка ${daysDiff} дней`;
      const text = [
        `Здравствуйте, ${route.emergency_contact_name}.`,
        ``,
        `⚠️ ${route.leader_name} должен был вернуться ${route.end_date}.`,
        `Прошло ${daysDiff} дн. Возврат не отмечен.`,
        ``,
        `Рекомендуем НЕМЕДЛЕННО обратиться в МЧС:`,
        `• Единый номер: 112`,
        `• МЧС Камчатский край: +7 (4152) 23-53-62`,
        `• ПСО «Камчатка»: +7 (4152) 41-27-30`,
        ``,
        `Маршрут: ${route.route_name}`,
        `Руководитель: ${route.leader_name} (${route.leader_phone})`,
        ``,
        `— TourHab (tourhab.ru)`,
      ].join('\n');

      let sent = false;

      // Telegram
      if (route.emergency_contact_telegram_chat_id) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (botToken) {
          const tgResult = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: route.emergency_contact_telegram_chat_id,
              text,
              parse_mode: 'HTML',
            }),
          });
          sent = tgResult.ok;
        }
      }

      // Email
      if (route.emergency_contact_email) {
        const emailResult = await sendEmail({
          to: route.emergency_contact_email,
          subject,
          text,
        });
        if (emailResult.success) sent = true;
      }

      // Fallback: уведомление админу
      const adminChatId = process.env.TELEGRAM_CHAT_ID;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken && adminChatId) {
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminChatId,
            text: `🔴 <b>URGENT: Маршрут просрочен ${daysDiff} дн.</b>\n\n${route.route_name}\nРуководитель: ${route.leader_name} (${route.leader_phone})\nКонтакт: ${route.emergency_contact_name} (${route.emergency_contact_phone})\n\nРекомендуем: связаться с контактом и предложить обратиться в МЧС.`,
            parse_mode: 'HTML',
          }),
        }).catch(() => {});
      }

      await query(
        `INSERT INTO route_registration_notifications
           (registration_id, step, channel, recipient, status, sent_at)
         VALUES ($1, $2, $3, $4, 'sent', now())`,
        [route.id, stepToRun, sent ? 'telegram+email' : 'admin_only', sent ? 'contact' : 'admin']
      );

      results.push({
        route: route.route_name,
        step: stepToRun,
        channel: 'telegram+email+admin',
        status: 'sent',
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: `Processed ${results.length} escalations`,
    results,
  });
}
