/**
 * Уведомления оператора о новых лидах и предложениях.
 *
 * notifyOperatorProposal — после AI-обработки: уведомление в TELEGRAM_CHAT_ID
 * notifyOperatorNewLead  — при входящем лиде (вызывается из POST /api/leads)
 */

import type { LeadProposalData } from '@/lib/services/lead-processor.service';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function tgSend(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
  } catch {
    // Silent fail — уведомление не критично
  }
}

/**
 * Уведомление оператора после того как AI сформировал предложение.
 * Отправляет в TELEGRAM_CHAT_ID (admin/operator group).
 */
export async function notifyOperatorProposal(proposal: LeadProposalData): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID ?? '';
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';

  const scoreTag = proposal.ai_score >= 80 ? ' [HOT]' : proposal.ai_score >= 50 ? ' [OK]' : '';
  const toursText = proposal.primary_tour
    ? `<b>${esc(proposal.primary_tour.title)}</b> — ${proposal.primary_tour.price.toLocaleString('ru-RU')} руб/чел`
    : 'Туры подобраны вручную';

  const text = [
    `<b>AI обработал лид${scoreTag}</b>`,
    '',
    `<b>Заголовок:</b> ${esc(proposal.headline)}`,
    `<b>AI-оценка:</b> ${proposal.ai_score} / 100`,
    `<b>Тур:</b> ${toursText}`,
    proposal.price_from
      ? `<b>Бюджет:</b> от ${proposal.price_from.toLocaleString('ru-RU')} ₽`
      : '',
    `<b>Генерация:</b> ${(proposal.generation_ms / 1000).toFixed(1)} сек`,
    '',
    `<a href="${baseUrl}/hub/operator/leads/${proposal.lead_id}">Открыть лид и отправить предложение</a>`,
    `<a href="${baseUrl}/api/leads/${proposal.lead_id}/proposal/pdf">Скачать PDF</a>`,
  ].filter(Boolean).join('\n');

  await tgSend(chatId, text);
}

/**
 * Уведомление о новом входящем лиде (до AI-обработки).
 */
export async function notifyOperatorNewLead(params: {
  leadId: string;
  name: string;
  phone: string;
  comment?: string;
  routeTitle?: string;
}): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID ?? '';
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';

  const text = [
    '<b>Новая заявка</b>',
    '',
    `<b>Имя:</b> ${esc(params.name)}`,
    `<b>Телефон:</b> ${esc(params.phone)}`,
    params.routeTitle ? `<b>Интерес:</b> ${esc(params.routeTitle)}` : '',
    params.comment ? `<b>Комментарий:</b> ${esc(params.comment.slice(0, 200))}` : '',
    '',
    `<a href="${baseUrl}/hub/operator/leads/${params.leadId}">Обработать лид AI →</a>`,
  ].filter(Boolean).join('\n');

  await tgSend(chatId, text);
}
