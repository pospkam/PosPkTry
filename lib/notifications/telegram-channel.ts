/**
 * Posting to Telegram channel (TELEGRAM_CHANNEL_ID)
 *
 * Используется для двух типов постов:
 *   А — контент: новые маршруты и операторы (маркетинг)
 *   Б — уведомления: новые лиды и брони (в TELEGRAM_CHAT_ID, admin-группа)
 */

import { query } from '@/lib/database';
import { callAIWaterfallDirect } from '@/lib/ai/providers';

// ── helpers ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function tgPost(chatId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return { ok: false, error: 'not configured' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false }),
    });
    const data = await res.json() as { ok: boolean; description?: string };
    return { ok: data.ok, error: data.description };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'fetch error' };
  }
}

// sendPhoto — caption до 1024 символов
async function tgPostPhoto(chatId: string, photoUrl: string, caption: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return { ok: false, error: 'not configured' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption: caption.slice(0, 1024),
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json() as { ok: boolean; description?: string };
    // Если фото по URL недоступно — fallback на текстовый пост
    if (!data.ok) return tgPost(chatId, caption);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'fetch error' };
  }
}

const LOCATION_LABELS: Record<string, string> = {
  volcano:    'Вулкан',
  geyser:     'Гейзеры',
  hot_spring: 'Термальные источники',
  lake:       'Озеро',
  mountain:   'Горы',
  river:      'Река',
  bay:        'Морское побережье',
  waterfall:  'Водопад',
  cape:       'Мыс',
  island:     'Остров',
  rock:       'Скалы',
  forest:     'Лес',
  beach:      'Пляж',
  viewpoint:  'Смотровая',
  settlement: 'Населённый пункт',
  other:      'Природный объект',
};

const ACTIVITY_LABELS: Record<string, string> = {
  trekking:   'Треккинг',
  fishing:    'Рыбалка',
  thermal:    'Термальный отдых',
  volcano:    'Восхождение на вулкан',
  helicopter: 'Вертолётная экскурсия',
  boat_trip:  'Морская прогулка',
  snowmobile: 'Снегоходы',
  skiing:     'Лыжи / скитур',
  diving:     'Дайвинг',
  kayak:      'Байдарки',
  horseback:  'Конный маршрут',
  birdwatching: 'Орнитология',
  photography: 'Фотоохота',
  other:      'Активный отдых',
};

// ── А. Контентные посты ───────────────────────────────────────────────────────

interface RouteRow {
  id: string;
  title: string;
  description: string | null;
  location_type: string | null;
  activity_type: string | null;
  price_from: number | null;
  duration_days: number | null;
}

/**
 * Постит маршрут в канал.
 * @param photoUrl — необязательно, если задан — пост с фото (sendPhoto)
 */
export async function postRouteToChannel(routeId: string, photoUrl?: string): Promise<{ ok: boolean; error?: string }> {
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!channelId) return { ok: false, error: 'TELEGRAM_CHANNEL_ID not set' };

  const res = await query<RouteRow>(
    `SELECT id, title, description, location_type, activity_type,
            (payload->>'price_from')::numeric AS price_from,
            (payload->>'duration_days')::numeric AS duration_days
     FROM agent_route_knowledge
     WHERE id = $1 AND is_visible = TRUE`,
    [routeId]
  );
  const r = res.rows[0];
  if (!r) return { ok: false, error: 'Route not found or not visible' };

  const locLabel   = LOCATION_LABELS[r.location_type ?? ''] ?? r.location_type ?? '';
  const actLabel   = ACTIVITY_LABELS[r.activity_type ?? ''] ?? r.activity_type ?? '';
  const desc = r.description ? r.description.slice(0, 200).trimEnd() + (r.description.length > 200 ? '…' : '') : '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';

  const lines: string[] = [];
  lines.push(`🌋 <b>${esc(r.title)}</b>`);
  lines.push('');
  if (desc) lines.push(esc(desc));
  lines.push('');

  const tags: string[] = [];
  if (locLabel)  tags.push(`📍 ${esc(locLabel)}`);
  if (actLabel)  tags.push(`🥾 ${esc(actLabel)}`);
  if (tags.length) lines.push(tags.join('  ·  '));

  const meta: string[] = [];
  if (r.duration_days) meta.push(`${r.duration_days} дн.`);
  if (r.price_from)    meta.push(`от ${r.price_from.toLocaleString('ru-RU')} ₽`);
  if (meta.length) lines.push(`💰 ${meta.join('  ·  ')}`);

  lines.push('');
  lines.push(`<a href="${appUrl}/routes/${r.id}">Смотреть маршрут →</a>`);

  const text = lines.join('\n');
  return photoUrl ? tgPostPhoto(channelId, photoUrl, text) : tgPost(channelId, text);
}

interface PartnerRow {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  location: string | null;
  hero_image: string | null;
}

/**
 * Постит оператора (партнёра) в канал.
 * Автоматически берёт hero_image из БД если photoUrl не передан.
 */
export async function postOperatorToChannel(slug: string, photoUrl?: string): Promise<{ ok: boolean; error?: string }> {
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!channelId) return { ok: false, error: 'TELEGRAM_CHANNEL_ID not set' };

  const res = await query<PartnerRow>(
    `SELECT id, name, description, slug, location->>'city' AS location, hero_image
     FROM partners
     WHERE slug = $1 AND is_public = TRUE`,
    [slug]
  );
  const p = res.rows[0];
  if (!p) return { ok: false, error: 'Operator not found or not public' };

  const desc = p.description ? p.description.slice(0, 250).trimEnd() + (p.description.length > 250 ? '…' : '') : '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';

  const lines: string[] = [];
  lines.push(`🏔 <b>${esc(p.name)}</b> — партнёр TourHab`);
  lines.push('');
  if (desc) lines.push(esc(desc));
  if (p.location) lines.push(`\n📍 ${esc(p.location)}`);
  lines.push('');
  lines.push(`<a href="${appUrl}/operators/${p.slug}">Профиль оператора →</a>`);

  const text = lines.join('\n');
  const photo = photoUrl ?? p.hero_image ?? undefined;
  return photo ? tgPostPhoto(channelId, photo, text) : tgPost(channelId, text);
}

/**
 * AI генерирует сезонный пост в голосе Кузьмича и публикует в канал.
 */
export async function postSezonToChannel(): Promise<{ ok: boolean; error?: string }> {
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!channelId) return { ok: false, error: 'TELEGRAM_CHANNEL_ID not set' };

  const month = new Date().toLocaleString('ru-RU', { month: 'long' });

  const prompt = `Ты — Кузьмич, камчадал в третьем поколении. Напиши короткий пост для Telegram-канала о Камчатке.
Тема: что интересного можно сделать на Камчатке в ${month}.
Требования:
- 80-120 слов
- живой голос местного, не рекламный
- конкретные активности для этого месяца
- заканчивай ссылкой: tourhab.ru/routes
- HTML-теги Telegram: <b>жирный</b>, <i>курсив</i>
- начни с эмодзи настроения месяца`;

  const text = await callAIWaterfallDirect([
    { role: 'user', content: prompt },
  ]);

  return tgPost(channelId, text);
}

// ── Б. Оперативные уведомления (в admin-чат) ─────────────────────────────────

/**
 * Дублирует лид в централизованный admin-чат (TELEGRAM_CHAT_ID).
 * Вызывается fire-and-forget из /api/leads.
 */
export async function notifyAdminNewLead(lead: {
  id: string;
  name: string;
  phone: string;
  comment?: string | null;
  routeTitle?: string | null;
  sourceUrl?: string | null;
}): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const leadsChatId = process.env.TELEGRAM_LEADS_CHAT_ID;
  // не дублируем если это тот же чат
  if (!chatId || chatId === leadsChatId) return;

  const lines = [
    '<b>Лид с сайта</b>',
    '',
    `<b>Имя:</b> ${esc(lead.name)}`,
    `<b>Тел:</b> <a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a>`,
  ];
  if (lead.comment) lines.push(`<b>Комментарий:</b> ${esc(lead.comment)}`);
  if (lead.routeTitle) lines.push(`<b>Маршрут:</b> ${esc(lead.routeTitle)}`);
  if (lead.sourceUrl) lines.push(`<b>Страница:</b> ${esc(lead.sourceUrl)}`);
  lines.push('', `<code>${lead.id}</code>`);

  await tgPost(chatId, lines.join('\n'));
}

/**
 * Дублирует новое бронирование в централизованный admin-чат (TELEGRAM_CHAT_ID).
 * Вызывается fire-and-forget из /api/bookings.
 */
export async function notifyAdminNewBooking(booking: {
  id: string;
  tourName: string;
  departureDate: string;
  participants: number;
  totalAmount: number;
  touristName: string;
  touristEmail: string;
}): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return;

  const date = new Date(booking.departureDate).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const lines = [
    '<b>Новое бронирование</b>',
    '',
    `<b>Тур:</b> ${esc(booking.tourName)}`,
    `<b>Дата:</b> ${date}`,
    `<b>Участников:</b> ${booking.participants}`,
    `<b>Сумма:</b> ${booking.totalAmount.toLocaleString('ru-RU')} ₽`,
    '',
    `<b>Гость:</b> ${esc(booking.touristName)}`,
    `<b>Email:</b> ${esc(booking.touristEmail)}`,
    '',
    `<code>${booking.id}</code>`,
  ];

  await tgPost(chatId, lines.join('\n'));
}
