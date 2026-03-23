/**
 * Telegram Welcome Messages
 *
 * Персональное приветствие при первом подключении Telegram-канала.
 * Каждая роль получает своё сообщение с объяснением что бот будет делать.
 *
 * Вызывается:
 *   1. После TG Login Widget (app/api/auth/telegram/route.ts)
 *   2. После привязки через deep link /start link_{token} (webhook)
 */

import { telegramService } from '@/lib/notifications/telegram';
import { query } from '@/lib/database';

interface WelcomeContext {
  telegramId: number;
  name: string;
  role: string;
  isNewUser: boolean;
}

interface UserStats {
  bookings?: number;
  tours?: number;
}

async function getUserStats(userId: string, role: string): Promise<UserStats> {
  try {
    if (role === 'tourist') {
      const res = await query<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM bookings WHERE user_id = $1 AND status != 'cancelled'`,
        [userId]
      );
      return { bookings: parseInt(res.rows[0]?.cnt ?? '0') };
    }
    if (role === 'operator' || role === 'guide') {
      const res = await query<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM operator_tours ot
         JOIN partners p ON p.user_id = $1 WHERE ot.operator_id = p.user_id AND ot.is_active = TRUE`,
        [userId]
      );
      return { tours: parseInt(res.rows[0]?.cnt ?? '0') };
    }
  } catch {}
  return {};
}

function buildWelcomeText(ctx: WelcomeContext, stats: UserStats): string {
  const name = ctx.name.split(' ')[0]; // только имя
  const site = 'https://tourhab.ru';

  if (ctx.role === 'tourist') {
    const bookingLine = stats.bookings && stats.bookings > 0
      ? `\nТвоих активных броней: <b>${stats.bookings}</b>`
      : '';
    return [
      `<b>Привет, ${name}!</b>`,
      '',
      'Я — Кузьмич, твой личный проводник по Камчатке.',
      'Теперь у нас есть прямой канал.',
      bookingLine,
      '',
      '<b>Что я буду делать для тебя:</b>',
      '— подтверждения и статусы броней в реальном времени',
      '— напоминание за 2 дня до поездки с погодой',
      '— горячие предложения под твои интересы',
      '— отвечу на любой вопрос о Камчатке',
      '',
      `<a href="${site}/routes">Смотреть маршруты →</a>`,
    ].filter(s => s !== '').join('\n');
  }

  if (ctx.role === 'operator' || ctx.role === 'guide') {
    const toursLine = stats.tours !== undefined
      ? `\nАктивных туров: <b>${stats.tours}</b>`
      : '';
    return [
      `<b>${name}, личный канал подключён!</b>`,
      '',
      'Отсюда будут приходить:',
      '— новые бронирования с кнопками Подтвердить / Отклонить',
      '— горячие лиды с контактами туристов',
      '— еженедельные отчёты по выплатам',
      '— важные уведомления платформы',
      toursLine,
      '',
      `<a href="${site}/hub/operator">Открыть кабинет →</a>`,
    ].filter(s => s !== '').join('\n');
  }

  if (ctx.role === 'agent') {
    return [
      `<b>${name}, канал агента подключён!</b>`,
      '',
      'Буду присылать:',
      '— комиссионные начисления',
      '— статусы по рефералам',
      '— новости платформы',
      '',
      `<a href="${site}/hub/agent">Кабинет агента →</a>`,
    ].join('\n');
  }

  if (ctx.role === 'admin') {
    return [
      `<b>${name}, командный центр подключён.</b>`,
      '',
      'Ежедневный дайджест в 09:00.',
      'Инициативы Совета директоров — сюда с кнопками.',
      'SOS-алерты немедленно.',
      '',
      '/stats — статистика сейчас',
      '/digest — полный AI-дайджест',
      '/leads — последние заявки',
    ].join('\n');
  }

  // Fallback
  return `<b>Привет, ${name}!</b>\n\nЛичный канал с TourHab подключён. Здесь будут важные уведомления.`;
}

/**
 * Отправляет персональное приветствие при первом подключении Telegram.
 * Не блокирует основной поток — ошибки подавляются.
 */
export async function sendWelcomeMessage(
  userId: string,
  ctx: WelcomeContext,
): Promise<void> {
  try {
    const stats = await getUserStats(userId, ctx.role);
    const text = buildWelcomeText(ctx, stats);

    await telegramService.sendMessage({
      chatId: String(ctx.telegramId),
      text,
      parseMode: 'HTML',
    });
  } catch {
    // Не блокируем авторизацию если TG недоступен
  }
}
