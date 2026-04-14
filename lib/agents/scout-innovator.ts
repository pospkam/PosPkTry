/**
 * lib/agents/scout-innovator.ts
 *
 * Scout-Innovator — ежедневный синтез разведданных → конкретные предложения.
 * Читает Brain (agent_knowledge), анализирует платформу, формирует 2-3 действия.
 *
 * Запускается через /api/cron/scout (06:00 UTC, после intelligence monitor).
 */

import { callAIFast } from '@/lib/ai/providers';
import { knowledgeBase } from '@/lib/agents/memory/agent-knowledge';
import { pool } from '@/lib/db-pool';
import type { ChatMessage } from '@/lib/ai/prompts';

export interface ScoutInnovatorResult {
  proposals_count: number;
  sent_to_tg: boolean;
  intel_entries: number;
  duration_ms: number;
}

async function tgSend(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.substring(0, 4000),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json() as { ok: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function runScoutInnovator(): Promise<ScoutInnovatorResult> {
  const start = Date.now();
  const dateKey = new Date().toISOString().slice(0, 10);

  // 1. Читаем последние разведданные из Brain (intel + scout digests)
  const [intelPages, scoutPages] = await Promise.all([
    knowledgeBase.list({ type: 'intel', limit: 5 }),
    knowledgeBase.search('scout digest дайджест', { limit: 3 }),
  ]);

  const allPages = [...intelPages, ...scoutPages].slice(0, 6);

  // 2. Платформа за 7 дней
  let platformStats = { bookings_week: '0', confirmed_week: '0', new_operators: '0' };
  try {
    const { rows } = await pool.query<{
      bookings_week: string;
      confirmed_week: string;
      new_operators: string;
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE created_at > NOW() - '7 days'::interval)::text AS bookings_week,
        COUNT(*) FILTER (WHERE created_at > NOW() - '7 days'::interval AND booking_status = 'confirmed')::text AS confirmed_week,
        (SELECT COUNT(*)::text FROM partners WHERE created_at > NOW() - '7 days'::interval) AS new_operators
      FROM operator_bookings
    `);
    if (rows[0]) platformStats = rows[0];
  } catch (err) {
    console.error('[scout-innovator] Failed to read platform stats:', err);
  }

  if (allPages.length === 0) {
    console.error('[scout-innovator] No intel data in Brain — skipping');
    return { proposals_count: 0, sent_to_tg: false, intel_entries: 0, duration_ms: Date.now() - start };
  }

  // 3. AI синтез
  const intelContext = allPages
    .map(p => `[${p.slug}]\n${(p.compiled_truth ?? '').slice(0, 300)}`)
    .join('\n\n---\n\n');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты Scout-Innovator — стратегический аналитик туристической платформы TourHab (Камчатка).
На основе собранных разведданных формируй 2-3 конкретных, выполнимых предложения для владельца платформы.

Каждое предложение — это конкретное действие + ожидаемый результат (не теория).
Избегай общих фраз типа "улучшить качество" или "развивать платформу".

Формат ответа — HTML для Telegram:
<b>Scout-Innovator ${dateKey}</b>

<b>Предложения:</b>
1. [конкретное действие] — [ожидаемый результат]
2. [конкретное действие] — [ожидаемый результат]

<b>Платформа за 7 дней:</b>
- Бронирований: [N] всего, [M] подтверждено

Если нет конкретных идей — честно напиши "Нет новых сигналов для действий".
Пиши по-русски. Без воды.`,
    },
    {
      role: 'user',
      content: `Разведданные из Brain (последние записи):

${intelContext}

Платформа за 7 дней:
- Бронирований: ${platformStats.bookings_week} всего, ${platformStats.confirmed_week} подтверждено
- Новых операторов: ${platformStats.new_operators}

Дай 2-3 конкретных предложения.`,
    },
  ];

  let proposals: string;
  try {
    proposals = await callAIFast(messages);
  } catch (err) {
    console.error('[scout-innovator] AI call failed:', err);
    return { proposals_count: 0, sent_to_tg: false, intel_entries: allPages.length, duration_ms: Date.now() - start };
  }

  if (!proposals.trim()) {
    return { proposals_count: 0, sent_to_tg: false, intel_entries: allPages.length, duration_ms: Date.now() - start };
  }

  // 4. Сохраняем в Brain
  try {
    await knowledgeBase.upsert({
      slug: `proposals/${dateKey}`,
      type: 'decision',
      title: `Scout-Innovator предложения ${dateKey}`,
      compiled_truth: proposals,
      metadata: {
        intel_entries: allPages.length,
        bookings_week: platformStats.bookings_week,
        generated_at: dateKey,
      },
      agent_id: 'scout-innovator',
    });
  } catch (err) {
    console.error('[scout-innovator] Failed to save to Brain:', err);
  }

  // 5. Telegram
  const sent = await tgSend(proposals);

  const proposalCount = (proposals.match(/^\d\./gm) ?? []).length || 1;

  return {
    proposals_count: proposalCount,
    sent_to_tg: sent,
    intel_entries: allPages.length,
    duration_ms: Date.now() - start,
  };
}
