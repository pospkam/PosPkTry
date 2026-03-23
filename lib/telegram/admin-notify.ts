/**
 * Уведомления в admin-бот (@tourhab_bot) о событиях поддержки.
 *
 * Использует TELEGRAM_ADMIN_BOT_TOKEN + TELEGRAM_OWNER_ID.
 * Fire-and-forget, ошибки подавляются.
 */

import type { SupportTicket } from '@/lib/support/ticket.service';

const CATEGORY_LABELS: Record<string, string> = {
  billing:  'Оплата',
  booking:  'Бронирование',
  safety:   'Безопасность',
  refund:   'Возврат',
  content:  'Контент',
  technical:'Технический',
  operator: 'Оператор',
  other:    'Другое',
};

async function sendAdminMessage(text: string): Promise<void> {
  const token   = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
  const ownerId = process.env.TELEGRAM_OWNER_ID ?? '833478813';
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:                  ownerId,
      text,
      parse_mode:               'HTML',
      disable_web_page_preview: true,
    }),
  }).catch(() => {});
}

/**
 * Новый тикет поддержки — уведомление в @tourhab_bot.
 */
export function notifyAdminNewTicket(ticket: SupportTicket): void {
  void (async () => {
    try {
      const site     = 'https://tourhab.ru';
      const category = CATEGORY_LABELS[ticket.category] ?? ticket.category;
      const user     = ticket.userName
        ? `${ticket.userName}${ticket.userEmail ? ` (${ticket.userEmail})` : ''}`
        : (ticket.userEmail ?? ticket.userId.slice(0, 8));

      await sendAdminMessage([
        '<b>Новый тикет поддержки</b>',
        '',
        `<b>Тема:</b> ${ticket.subject}`,
        `<b>Категория:</b> ${category}`,
        `<b>Резидент:</b> ${ticket.assignedAgent ?? 'не назначен'}`,
        `<b>Пользователь:</b> ${user}`,
        `<b>Канал:</b> ${ticket.channel}`,
        '',
        ticket.messages[0] ? `<i>${ticket.messages[0].text.slice(0, 200)}</i>` : '',
        '',
        `<a href="${site}/hub/admin/support">Открыть в панели →</a>`,
      ].filter(s => s !== '').join('\n'));
    } catch { /* silent */ }
  })();
}

/**
 * Тикет эскалирован — срочное уведомление в @tourhab_bot.
 */
export function notifyAdminEscalated(ticket: SupportTicket, reason: string): void {
  void (async () => {
    try {
      const site = 'https://tourhab.ru';
      await sendAdminMessage([
        '<b>ЭСКАЛАЦИЯ тикета</b>',
        '',
        `<b>Тема:</b> ${ticket.subject}`,
        `<b>Причина:</b> ${reason}`,
        `<b>Статус:</b> ожидает решения`,
        '',
        `<a href="${site}/hub/admin/support">Открыть в панели →</a>`,
      ].join('\n'));
    } catch { /* silent */ }
  })();
}
