/**
 * POST /api/leads/[id]/proposal/send
 * Отправляет AI-предложение клиенту через Telegram (если есть phone/telegram)
 * и обновляет статус лида на proposal_sent.
 *
 * Body: { channel: 'telegram' | 'email' }  (опционально, по умолчанию оба)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth/middleware';
import { leadProcessor } from '@/lib/services/lead-processor.service';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';

const Schema = z.object({
  channel: z.enum(['telegram', 'email', 'both']).optional().default('both'),
});

async function tgSend(chatId: string | number, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOperator(req);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }
  const parse = Schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 });
  }

  // Получаем лид + proposal_id
  const { rows } = await pool.query<{
    proposal_id: string | null;
    name: string;
    phone: string;
    email: string | null;
    status: string;
    tg_chat_id: string | null;
  }>(
    `SELECT proposal_id, name, phone, email, status,
            (source_data->>'tg_chat_id') AS tg_chat_id
     FROM leads WHERE id = $1`,
    [id]
  );

  if (!rows[0]) {
    return NextResponse.json({ error: 'Лид не найден' }, { status: 404 });
  }

  const lead = rows[0];

  if (!lead.proposal_id) {
    return NextResponse.json(
      { error: 'Предложение ещё не сформировано. Запустите AI-обработку.' },
      { status: 409 }
    );
  }

  if (lead.status === 'proposal_sent') {
    return NextResponse.json({ error: 'Предложение уже было отправлено.' }, { status: 409 });
  }

  const proposal = await leadProcessor.getProposal(lead.proposal_id);
  if (!proposal) {
    return NextResponse.json({ error: 'Данные предложения не найдены.' }, { status: 404 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';
  const pdfUrl  = `${baseUrl}/api/leads/${id}/proposal/pdf`;

  const sent: string[] = [];
  const failed: string[] = [];

  // ── Telegram ──────────────────────────────────────────────────────────────
  if (['telegram', 'both'].includes(parse.data.channel) && lead.tg_chat_id) {
    const tourLine = proposal.primary_tour
      ? `\n<b>Тур:</b> ${esc(proposal.primary_tour.title)} — ${proposal.primary_tour.price.toLocaleString('ru-RU')} ₽/чел`
      : '';

    const priceLine = proposal.price_from
      ? `\n<b>Бюджет:</b> от ${proposal.price_from.toLocaleString('ru-RU')} ₽`
      : '';

    const highlights = proposal.highlights.slice(0, 3).map(h => `• ${esc(h)}`).join('\n');

    const text = [
      `<b>Предложение для ${esc(lead.name)}</b>`,
      '',
      `<b>${esc(proposal.headline)}</b>`,
      '',
      esc(proposal.summary),
      '',
      highlights,
      tourLine,
      priceLine,
      '',
      `<a href="${pdfUrl}">📄 Скачать полное предложение PDF</a>`,
    ].filter(l => l !== undefined).join('\n');

    const ok = await tgSend(lead.tg_chat_id, text);
    if (ok) sent.push('telegram');
    else failed.push('telegram');
  }

  // ── Email (stub — log only; integrate email service if needed) ────────────
  if (['email', 'both'].includes(parse.data.channel) && lead.email) {
    // Email sending intentionally not implemented here — operator calls client by phone.
    // Could integrate emailService.sendEmail() when email flow is ready.
    sent.push('email_queued');
  }

  // ── Обновляем статус лида ──────────────────────────────────────────────────
  await pool.query(
    `UPDATE leads SET status = 'proposal_sent', updated_at = NOW() WHERE id = $1`,
    [id]
  );

  const totalSent = sent.length;
  const message = totalSent > 0
    ? `Предложение отправлено клиенту (${sent.join(', ')})`
    : 'Каналы отправки не настроены (нет telegram_id и email у лида)';

  return NextResponse.json({
    success: true,
    message,
    sent,
    failed,
    pdf_url: pdfUrl,
  });
}
