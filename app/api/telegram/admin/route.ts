/**
 * GET /api/telegram/admin?command=health
 * POST /api/telegram/admin
 * Личный admin-бот владельца (@tourhab_bot). Работает 24/7.
 *
 * GET: Тестирование команд без webhook
 *      ?command=health
 *      ?command=stats
 *      ?command=leads
 *      ?command=tip
 *
 * POST: Webhook для получения команд из Telegram
 *       Требует регистрации webhook:
 *       curl -X POST https://api.telegram.org/botTOKEN/setWebhook \
 *         -d url=https://tourhab.ru/api/telegram/admin \
 *         -d secret_token=SECRET
 *
 * Env vars (Timeweb):
 *   TELEGRAM_ADMIN_BOT_TOKEN — токен @tourhab_bot
 *   TELEGRAM_OWNER_ID        — Telegram user ID владельца (833478813)
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { callAIWaterfall, callOpenrouter } from '@/lib/ai/providers';
import { postKuzmichRoute, postKuzmichTip } from '@/lib/notifications/telegram-channel';
import type { ChatMessage } from '@/lib/ai/prompts';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { PlatformAgent } from '@/lib/agents';

const adminGetLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

// ── Conversation history ──────────────────────────────────────────────────────

async function getAdminHistory(chatId: number): Promise<ChatMessage[]> {
  try {
    const { rows } = await pool.query<{ role: string; content: string }>(
      `SELECT role, content
       FROM tg_conversations
       WHERE chat_id = $1 AND mode = 'admin'
       ORDER BY created_at DESC
       LIMIT 16`,
      [chatId],
    );
    return rows.reverse() as ChatMessage[];
  } catch {
    return [];
  }
}

async function saveAdminMessage(
  chatId: number,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO tg_conversations (chat_id, mode, role, content) VALUES ($1, 'admin', $2, $3)`,
      [chatId, role, content],
    );
  } catch { /* таблица ещё не создана — не блокируем */ }
}

export const dynamic = 'force-dynamic';

// ── Telegram helper ───────────────────────────────────────────────────────────

async function reply(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  }).catch(() => {});
}

// ── Platform stats ────────────────────────────────────────────────────────────

async function getStats(): Promise<string> {
  try {
    const [leads, bookings, users, tours, held, views] = await Promise.all([
      pool.query<{ total: string; new_cnt: string }>(
        `SELECT COUNT(*) as total,
                COUNT(*) FILTER (WHERE status='new') as new_cnt
         FROM leads`
      ),
      pool.query<{ today: string; pending: string }>(
        `SELECT COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today,
                COUNT(*) FILTER (WHERE booking_status='new') as pending
         FROM operator_bookings`
      ),
      pool.query<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM users`),
      pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM operator_tours WHERE is_active = true`
      ),
      pool.query<{ cnt: string; amt: string }>(
        `SELECT COUNT(*) as cnt,
                COALESCE(SUM(retail_amount),0) as amt
         FROM tour_payments WHERE status='HELD'`
      ),
      pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM page_views WHERE created_at >= CURRENT_DATE`
      ).catch(() => ({ rows: [{ cnt: 'n/a' }] })),
    ]);

    const heldAmt = parseFloat(held.rows[0]?.amt ?? '0');
    return [
      `Лиды: ${leads.rows[0]?.total ?? 0} всего, ${leads.rows[0]?.new_cnt ?? 0} новых`,
      `Брони сегодня: ${bookings.rows[0]?.today ?? 0} | ожидают: ${bookings.rows[0]?.pending ?? 0}`,
      `HELD-платежи: ${held.rows[0]?.cnt ?? 0} шт. на ${heldAmt.toLocaleString('ru-RU')} руб`,
      `Пользователей: ${users.rows[0]?.cnt ?? 0} | Туров: ${tours.rows[0]?.cnt ?? 0}`,
      `Просмотров сегодня: ${views.rows[0]?.cnt ?? 0}`,
    ].join('\n');
  } catch (e) {
    return `Ошибка БД: ${e instanceof Error ? e.message : 'unknown'}`;
  }
}

async function getLeads(): Promise<string> {
  try {
    const res = await pool.query<{
      name: string; phone: string; status: string;
      route_title: string | null; created_at: Date;
    }>(
      `SELECT name, phone, status, route_title, created_at
       FROM leads ORDER BY created_at DESC LIMIT 8`
    );
    if (!res.rows.length) return 'Лидов нет';
    return res.rows.map(l =>
      `${l.name} | ${l.phone} | ${l.status}${l.route_title ? ' | ' + l.route_title.slice(0, 25) : ''}`
    ).join('\n');
  } catch { return 'Ошибка получения лидов'; }
}

// ── AI health check ───────────────────────────────────────────────────────────

async function checkHealth(): Promise<string> {
  const ping: ChatMessage[] = [
    { role: 'system', content: 'Ты помощник.' },
    { role: 'user', content: 'ок' },
  ];

  const probe = async (fn: (m: ChatMessage[]) => Promise<string | null>): Promise<boolean> => {
    try {
      const r = await Promise.race([
        fn(ping),
        new Promise<null>((res) => setTimeout(() => res(null), 7000)),
      ]);
      return !!r;
    } catch { return false; }
  };

  const orOk = await probe(callOpenrouter);

  // DB checks
  const issues: string[] = [];
  try {
    const held = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*) as cnt FROM tour_payments
       WHERE status='HELD' AND release_after < NOW() - INTERVAL '2 hours'`
    );
    const n = parseInt(held.rows[0]?.cnt ?? '0', 10);
    if (n > 0) issues.push(`${n} HELD-платежей просрочены`);
  } catch { issues.push('Ошибка проверки платежей'); }

  try {
    const stuck = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*) as cnt FROM leads WHERE status='new' AND created_at < NOW() - INTERVAL '6 hours'`
    );
    const n = parseInt(stuck.rows[0]?.cnt ?? '0', 10);
    if (n > 3) issues.push(`${n} лидов без обработки > 6ч`);
  } catch { /* skip */ }

  return [
    `AI: OpenRouter=${orOk ? 'OK' : 'X'}`,
    `БД: ${issues.length === 0 ? 'OK' : issues.join('; ')}`,
    `Сайт: https://tourhab.ru`,
  ].join('\n');
}

// ── Claude digest ─────────────────────────────────────────────────────────────

async function runDigest(): Promise<string> {
  const stats = await getStats();
  const date = new Date().toLocaleDateString('ru-RU', {
    timeZone: 'Asia/Kamchatka', day: 'numeric', month: 'long',
  });

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты AI-директор туристической платформы TourHab (Камчатка).
Анализируй метрики кратко. Дай 1 строку общей оценки и 3 приоритета на день.`,
    },
    {
      role: 'user',
      content: `Метрики за ${date}:\n${stats}\n\nДай оценку и 3 приоритета.`,
    },
  ];

  const answer = await callAIWaterfall(messages);
  return answer ?? 'AI временно недоступен';
}

// ── Command handlers ──────────────────────────────────────────────────────────

async function handleCommand(cmd: string, chatId: number): Promise<void> {
  switch (cmd) {
    case '/start':
    case '/help':
      await reply(chatId, [
        '<b>TourHab Admin</b>',
        '',
        '/health — AI + БД',
        '/stats — цифры платформы',
        '/leads — последние лиды',
        '/digest — анализ AI',
        '/agents — команда AI',
        '/kuzmich — пост маршрута',
        '/tip — совет Кузьмича',
        '',
        'Любой текст — уходит в Команду AI и возвращается с ответом нужного агента',
      ].join('\n'));
      break;

    case '/health':
      await reply(chatId, 'Проверяю...');
      await reply(chatId, await checkHealth());
      break;

    case '/stats':
      await reply(chatId, '<b>Статистика</b>\n\n' + await getStats());
      break;

    case '/leads':
      await reply(chatId, '<b>Последние лиды</b>\n\n<code>' + await getLeads() + '</code>');
      break;

    case '/digest':
      await reply(chatId, 'Анализирую...');
      await reply(chatId, '<b>Дайджест Claude</b>\n\n' + await runDigest());
      break;

    case '/kuzmich':
      await reply(chatId, 'Публикую маршрут...');
      {
        const r = await postKuzmichRoute();
        await reply(chatId, r.ok ? `Опубликовано (${r.routeId ?? 'ok'})` : `Ошибка: ${r.error ?? 'unknown'}`);
      }
      break;

    case '/agents':
      await reply(chatId, [
        '<b>Команда AI</b>',
        '',
        'Просто пиши — нужный агент ответит автоматически.',
        '',
        'Примеры:',
        '"проверь договор с оператором" → Legal',
        '"аномалии в доступах" → Security',
        '"как поднять конверсию" → Hacker',
        '"погодные риски на маршрутах" → Rescue',
        '"нагрузка на природу" → Eco',
        '"аудит описаний туров" → Content',
        '"прогноз бронирований на лето" → Planning',
        '"отзывы с рейтингом ниже 3" → Quality',
        '"оптимизация платформы" → Evo',
        '"последние лиды" → Leads',
        '',
        'Не подошло — отвечает Admin AI с данными платформы.',
      ].join('\n'));
      break;

    case '/tip':
      await reply(chatId, 'Публикую совет...');
      {
        const r = await postKuzmichTip();
        await reply(chatId, r.ok ? 'Совет опубликован' : `Ошибка: ${r.error ?? 'unknown'}`);
      }
      break;

    default:
      await reply(chatId, `Неизвестная команда. /help`);
  }
}

// ── Agent name labels ─────────────────────────────────────────────────────────

const AGENT_LABELS: Record<string, string> = {
  admin: 'Admin',
  legal: 'Legal',
  sec: 'Security',
  hack: 'Hacker',
  rescue: 'Rescue',
  eco: 'Eco',
  evo: 'Evo',
  content: 'Content',
  mkt: 'Marketing',
  plan: 'Planning',
  qa: 'Quality',
  lead: 'Leads',
  op: 'Operator',
  tourist: 'Tourist',
  guide: 'Guide',
  transfer: 'Transfer',
};

function agentLabel(intent: string): string {
  const prefix = intent.split('_')[0] ?? '';
  return AGENT_LABELS[prefix] ? `[${AGENT_LABELS[prefix]}]` : '[AI]';
}

// ── Free text → PlatformAgent + conversation history ─────────────────────────

async function handleFreeText(text: string, chatId: number): Promise<void> {
  const ownerId = parseInt(process.env.TELEGRAM_OWNER_ID ?? '833478813', 10);

  await saveAdminMessage(chatId, 'user', text);

  try {
    const result = await PlatformAgent.dispatch({
      message: text,
      userId: ownerId,
      role: 'admin',
    });

    const label = agentLabel(result.intent);
    const header = result.intent !== 'unknown' ? `${label}\n\n` : '';
    const response = header + result.response;
    await saveAdminMessage(chatId, 'assistant', result.response);
    await reply(chatId, response);
  } catch {
    // fallback — AI ответ со статистикой и историей разговора
    const [stats, history] = await Promise.all([getStats(), getAdminHistory(chatId)]);
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Ты AI-директор платформы TourHab (Камчатка). Отвечаешь владельцу кратко и по делу.\nДанные платформы:\n${stats}`,
      },
      ...history,
    ];
    const answer = await callAIWaterfall(messages);
    await saveAdminMessage(chatId, 'assistant', answer);
    await reply(chatId, answer);
  }
}

// ── Webhook ───────────────────────────────────────────────────────────────────

interface TgUpdate {
  message?: { chat: { id: number }; from?: { id: number }; text?: string };
}

// ── GET: Тестирование команд ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!adminGetLimiter.check(ip)) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const command = searchParams.get('command')?.toLowerCase() ?? '';
    const ownerId = parseInt(process.env.TELEGRAM_OWNER_ID ?? '833478813', 10);

    if (!command) {
      return NextResponse.json({
        error: 'Missing command parameter',
        available_commands: ['/health', '/stats', '/leads', '/digest', '/tip'],
        example: '/api/telegram/admin?command=health'
      }, { status: 400 });
    }

    // Используем owner ID как chat ID для тестирования
    await handleCommand('/' + command, ownerId);

    return NextResponse.json({
      success: true,
      command,
      message_sent_to: ownerId,
      hint: 'Чек сообщение в твоём Telegram чате'
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── POST: Webhook Telegram ───────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const update = await request.json() as TgUpdate;
    const msg = update.message;
    if (!msg?.text) return NextResponse.json({ ok: true });

    const chatId = msg.chat.id;
    const fromId = msg.from?.id;
    const ownerId = parseInt(process.env.TELEGRAM_OWNER_ID ?? '833478813', 10);

    if (fromId !== ownerId) {
      await reply(chatId, 'Доступ закрыт.');
      return NextResponse.json({ ok: true });
    }

    const text = msg.text.trim();
    const cmd = text.split(' ')[0]?.toLowerCase() ?? '';

    if (cmd.startsWith('/')) {
      await handleCommand(cmd, chatId);
    } else {
      await handleFreeText(text, chatId);
    }
  } catch { /* silent */ }

  return NextResponse.json({ ok: true });
}
