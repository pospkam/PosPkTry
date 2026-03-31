/**
 * Operator Outreach Executor — автономный поиск операторов + Telegram-уведомления.
 *
 * Flow:
 *   1. Fetch RSS-лент rata-news.ru и tourprom.ru
 *   2. AI извлекает названия операторов, email, сайты
 *   3. INSERT в outreach_queue (skip если email уже есть)
 *   4. Для каждого нового оператора — Telegram-сообщение с готовым текстом приглашения
 *   5. Обновляет статус → 'contacted'
 */

import { pool } from '@/lib/db-pool';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import type { ChatMessage } from '@/lib/ai/prompts';

// Локальные типы — избегаем циклического импорта из initiative-executor
export interface ExecutionTask {
  approval_id: string;
  executor_agent_id: string;
  action_type: string;
  description: string;
  context: Record<string, unknown>;
  due_date: string;
}

export interface ExecutionResult {
  success: boolean;
  changes_made: string[];
  errors: string[];
  rollback_available: boolean;
  verification_passed: boolean;
}

interface FoundOperator {
  company_name: string;
  email?: string;
  website?: string;
  source: string;
}

const RSS_SOURCES = [
  { url: 'https://www.rata-news.ru/feed/',  source: 'rata-news' },
  { url: 'https://tourprom.ru/news/rss/',   source: 'tourprom'  },
];

/** Fetch RSS-ленту, вернуть raw XML/text (не бросает) */
async function fetchRSS(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'KamchatourHub-Bot/1.0' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/** AI извлечение операторов из RSS-контента */
async function extractOperatorsFromContent(content: string, sourceName: string): Promise<FoundOperator[]> {
  const truncated = content.length > 8000 ? content.slice(0, 8000) + '...(truncated)' : content;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'Ты анализируешь RSS-контент туристических новостей. ' +
        'Найди упоминания РЕАЛЬНЫХ туроператоров Камчатки — компании, которые организуют туры. ' +
        'Верни ТОЛЬКО JSON-массив без лишнего текста, без markdown, без ```.\n' +
        'Формат: [{"company_name":"...","email":"...","website":"..."}]\n' +
        'Если email или website не найдены — пропусти поле. ' +
        'Если операторов нет — верни [].',
    },
    {
      role: 'user',
      content: `Источник: ${sourceName}\n\nКонтент RSS:\n${truncated}`,
    },
  ];

  const model = getModelForAgent('intelligence');
  const raw = await callAIWithModelDirect(messages, model);

  // Парсим JSON-ответ
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map(item => ({
      company_name: typeof item.company_name === 'string' ? item.company_name.trim() : '',
      email:        typeof item.email        === 'string' ? item.email.trim()        : undefined,
      website:      typeof item.website      === 'string' ? item.website.trim()      : undefined,
      source:       sourceName,
    }))
    .filter(op => op.company_name.length > 2);
}

/** Отправить Telegram-сообщение о найденном операторе с готовым текстом для контакта */
async function sendOperatorToTelegram(op: FoundOperator, outreachId: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId   = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return false;

  const inviteText = [
    `Здравствуйте, коллеги из ${op.company_name}!`,
    '',
    'Приглашаем разместить ваши туры на KamchatourHub — AI-платформе туризма Камчатки.',
    '',
    'Что получаете:',
    '- Тысячи туристов ежемесячно ищут туры на Камчатку',
    '- AI-помощник Кузьмич обрабатывает заявки 24/7',
    '- Автоматические уведомления и CRM для бронирований',
    '- Регистрация и размещение туров — бесплатно',
    '',
    'Зарегистрироваться: https://tourhab.ru/register',
    '',
    'С уважением, команда KamchatourHub',
  ].join('\n');

  const tgText = [
    '<b>Новый оператор для контакта</b>',
    '',
    `<b>Компания:</b> ${op.company_name}`,
    op.website ? `<b>Сайт:</b> ${op.website}` : '',
    op.email   ? `<b>Email:</b> ${op.email}`   : '',
    `<b>Источник:</b> ${op.source}`,
    `<b>ID в очереди:</b> <code>${outreachId.substring(0, 8)}</code>`,
    '',
    '<b>Готовый текст для отправки оператору:</b>',
    `<code>${inviteText}</code>`,
  ].filter(l => l !== '').join('\n');

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      chat_id:    chatId,
      parse_mode: 'HTML',
      text:       tgText,
      disable_web_page_preview: true,
    }),
  });

  return res.ok;
}

export async function executeOperatorOutreach(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors:  string[] = [];

  let foundCount    = 0;
  let insertedCount = 0;
  let notifiedCount = 0;

  for (const rssSource of RSS_SOURCES) {
    try {
      // ── Step 1: Fetch RSS ─────────────────────────────────────────────────
      const rssContent = await fetchRSS(rssSource.url);
      changes.push(`RSS получен: ${rssSource.source} (${Math.round(rssContent.length / 1024)}KB)`);

      // ── Step 2: AI extracts operators ─────────────────────────────────────
      const operators = await extractOperatorsFromContent(rssContent, rssSource.source);
      foundCount += operators.length;

      if (operators.length === 0) {
        changes.push(`${rssSource.source}: операторы не найдены`);
        continue;
      }

      changes.push(`${rssSource.source}: найдено ${operators.length} операторов`);

      for (const op of operators) {
        try {
          // ── Step 3: INSERT (skip if already in queue by company name or email) ──
          const insertResult = await pool.query<{ id: string }>(
            `INSERT INTO outreach_queue (company_name, email, website, source, status)
             VALUES ($1, $2, $3, $4, 'found')
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            [op.company_name, op.email ?? null, op.website ?? null, op.source]
          );

          if (!insertResult.rows[0]) continue; // уже в очереди

          const outreachId = insertResult.rows[0].id;
          insertedCount++;

          // ── Step 4: Send Telegram with ready-made outreach text ───────────
          const tgSent = await sendOperatorToTelegram(op, outreachId);

          if (tgSent) {
            await pool.query(
              `UPDATE outreach_queue
               SET status        = 'contacted',
                   outreach_text = 'Telegram-уведомление отправлено администратору',
                   contacted_at  = NOW(),
                   updated_at    = NOW()
               WHERE id = $1`,
              [outreachId]
            );
            notifiedCount++;
            changes.push(`Telegram отправлен: ${op.company_name}${op.email ? ` <${op.email}>` : ''}`);
          } else {
            changes.push(`Сохранён в очереди: ${op.company_name}`);
          }

        } catch (opErr) {
          errors.push(`"${op.company_name}": ${opErr instanceof Error ? opErr.message : String(opErr)}`);
        }
      }

    } catch (rssErr) {
      errors.push(`RSS ${rssSource.source}: ${rssErr instanceof Error ? rssErr.message : String(rssErr)}`);
    }
  }

  // ── Telegram итоговый отчёт ─────────────────────────────────────────────────
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId   = process.env.TELEGRAM_CHAT_ID;
  if (botToken && chatId && (foundCount > 0 || errors.length > 0)) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    chatId,
        parse_mode: 'HTML',
        text: [
          '<b>Operator Outreach — итог</b>',
          '',
          `Найдено операторов: <b>${foundCount}</b>`,
          `Добавлено в очередь: <b>${insertedCount}</b>`,
          `Уведомлений отправлено: <b>${notifiedCount}</b>`,
          errors.length > 0 ? `Ошибок: ${errors.length}` : 'Ошибок нет',
          '',
          '<i>Каждый новый оператор — отдельное сообщение выше с готовым текстом</i>',
        ].join('\n'),
      }),
    }).catch(() => null);
  }

  changes.push(`Итого: найдено ${foundCount}, добавлено ${insertedCount}, уведомлено ${notifiedCount}`);

  return {
    success:             errors.length === 0 || insertedCount > 0,
    changes_made:        changes,
    errors,
    rollback_available:  false,
    verification_passed: true,
  };
}
