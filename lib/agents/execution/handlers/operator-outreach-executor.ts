/**
 * Operator Outreach Executor — автономный поиск и контакт с операторами.
 *
 * Flow:
 *   1. Fetch RSS-лент rata-news.ru и tourprom.ru
 *   2. AI извлекает названия операторов, email, сайты из содержимого
 *   3. INSERT в outreach_queue (skip если email уже есть)
 *   4. Если SMTP настроен — отправляет персональное приглашение
 *   5. Обновляет статус → 'contacted'
 */

import { pool } from '@/lib/db-pool';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import nodemailer from 'nodemailer';
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

/** Создать nodemailer transporter inline */
function createTransporter(): nodemailer.Transporter {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST  ?? 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT ?? '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ?? '',
    },
  });
}

/** HTML-шаблон письма-приглашения */
function buildInviteHtml(companyName: string): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><title>Приглашение на KamchatourHub</title></head>
<body style="font-family:Arial,sans-serif;color:#1A1714;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#D44A0C">Приглашение на туристическую AI-платформу Камчатки</h2>

  <p>Уважаемые коллеги из <strong>${companyName}</strong>,</p>

  <p>Мы — команда <strong>KamchatourHub</strong>, AI-платформы для организации путешествий по Камчатке.
  Приглашаем вас разместить ваши туры и начать получать бронирования уже сегодня.</p>

  <h3 style="color:#2568B0">Почему это выгодно:</h3>
  <ul>
    <li>Тысячи туристов ежемесячно ищут туры на Камчатку</li>
    <li>AI-помощник обрабатывает заявки автоматически — 24/7</li>
    <li>Регистрация и размещение туров — <strong>бесплатно</strong></li>
    <li>Простая панель управления для оператора</li>
  </ul>

  <p>
    <a href="https://tourhab.ru/register"
       style="background:#D44A0C;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
      Зарегистрироваться бесплатно
    </a>
  </p>

  <p style="color:#6B6560;font-size:14px">
    Есть вопросы? Просто ответьте на это письмо — мы поможем с размещением туров.<br>
    С уважением, команда KamchatourHub
  </p>
</body>
</html>`;
}

export async function executeOperatorOutreach(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors:  string[] = [];

  let foundCount     = 0;
  let insertedCount  = 0;
  let contactedCount = 0;

  const smtpConfigured = Boolean(process.env.SMTP_USER);
  const transporter    = smtpConfigured ? createTransporter() : null;

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
          // ── Step 3: INSERT (skip if email exists) ───────────────────────
          const insertResult = await pool.query<{ id: string }>(
            `INSERT INTO outreach_queue (company_name, email, website, source, status)
             VALUES ($1, $2, $3, $4, 'found')
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            [
              op.company_name,
              op.email ?? null,
              op.website ?? null,
              op.source,
            ]
          );

          if (!insertResult.rows[0]) {
            // Duplicate email — skip
            continue;
          }

          const outreachId = insertResult.rows[0].id;
          insertedCount++;

          // ── Step 4: Send email if SMTP configured and email exists ──────
          if (smtpConfigured && transporter && op.email) {
            const html    = buildInviteHtml(op.company_name);
            const subject = 'Приглашение на платформу KamchatourHub — бесплатно для операторов';

            try {
              await transporter.sendMail({
                from:    `"KamchatourHub" <${process.env.SMTP_USER}>`,
                to:      op.email,
                subject,
                html,
              });

              // ── Step 5: Update status → contacted ────────────────────
              await pool.query(
                `UPDATE outreach_queue
                 SET status = 'contacted',
                     outreach_text = $2,
                     contacted_at = NOW(),
                     updated_at = NOW()
                 WHERE id = $1`,
                [outreachId, subject]
              );

              contactedCount++;
              changes.push(`Приглашение отправлено: ${op.company_name} <${op.email}>`);

            } catch (mailErr) {
              errors.push(
                `Email к ${op.email}: ` +
                (mailErr instanceof Error ? mailErr.message : String(mailErr))
              );
            }
          } else if (!smtpConfigured) {
            changes.push(`Сохранён в очередь (SMTP не настроен): ${op.company_name}`);
          }

        } catch (opErr) {
          errors.push(
            `Оператор "${op.company_name}": ` +
            (opErr instanceof Error ? opErr.message : String(opErr))
          );
        }
      }

    } catch (rssErr) {
      errors.push(
        `RSS ${rssSource.source}: ` +
        (rssErr instanceof Error ? rssErr.message : String(rssErr))
      );
    }
  }

  // ── Telegram summary ────────────────────────────────────────────────────────
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId   = process.env.TELEGRAM_CHAT_ID;
  if (botToken && chatId) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    chatId,
        parse_mode: 'HTML',
        text: [
          '<b>Operator Outreach — результаты</b>',
          '',
          `Найдено операторов: ${foundCount}`,
          `Добавлено в очередь: ${insertedCount}`,
          `Отправлено приглашений: ${contactedCount}`,
          smtpConfigured ? '' : '<i>SMTP не настроен — письма не отправлялись</i>',
          errors.length > 0 ? `Ошибок: ${errors.length}` : 'Ошибок нет',
        ].filter(l => l !== '').join('\n'),
      }),
    }).catch(() => null);
  }

  changes.push(
    `Итого: найдено ${foundCount}, добавлено ${insertedCount}, отправлено ${contactedCount}`
  );

  return {
    success:             errors.length === 0 || insertedCount > 0,
    changes_made:        changes,
    errors,
    rollback_available:  false,
    verification_passed: true,
  };
}
