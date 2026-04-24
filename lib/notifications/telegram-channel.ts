/**
 * Posting to Telegram channel (TELEGRAM_CHANNEL_ID)
 *
 * Используется для двух типов постов:
 *   А — контент: новые маршруты и операторы (маркетинг)
 *   Б — уведомления: новые лиды и брони (в TELEGRAM_CHAT_ID, admin-группа)
 */

import { query } from '@/lib/database';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';

// ── helpers ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function tgPost(chatId: string, text: string, botToken?: string): Promise<{ ok: boolean; error?: string }> {
  const token = botToken ?? process.env.TELEGRAM_BOT_TOKEN;
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
async function tgPostPhoto(chatId: string, photoUrl: string, caption: string, botToken?: string): Promise<{ ok: boolean; error?: string }> {
  const token = botToken ?? process.env.TELEGRAM_BOT_TOKEN;
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
    if (!data.ok) return tgPost(chatId, caption, token);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'fetch error' };
  }
}

/** Отправка в MAX канал через MAX Platform API */
async function maxChannelPost(
  text: string,
  photoUrl?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.MAX_BOT_TOKEN;
  const channelId = process.env.MAX_CHANNEL_ID;
  if (!token || !channelId) return { ok: false, error: 'MAX_BOT_TOKEN or MAX_CHANNEL_ID not set' };

  const attachments: Array<Record<string, unknown>> = [];
  if (photoUrl) {
    attachments.push({ type: 'image', payload: { url: photoUrl } });
  }

  try {
    const body: Record<string, unknown> = {
      text,
      format: 'html',
      notify: true,
    };
    if (attachments.length > 0) body.attachments = attachments;

    const res = await fetch(
      `https://platform-api.max.ru/messages?chat_id=${channelId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
        },
        body: JSON.stringify(body),
      },
    );
    const data = await res.json() as { message?: Record<string, unknown>; code?: string; description?: string };
    if (data.message) return { ok: true };
    return { ok: false, error: data.description ?? data.code ?? 'unknown MAX error' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'MAX fetch error' };
  }
}

/** Публикация в основной TG-канал + MAX канал с кросс-ссылками */
async function postToAllChannels(
  mainChannelId: string,
  text: string,
  photoUrl?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const tgLink = process.env.TELEGRAM_CHANNEL_LINK ?? '';
  const maxLink = process.env.MAX_CHANNEL_LINK ?? '';

  // Текст для TG → добавляем ссылку на MAX
  const tgText = maxLink
    ? text + `\n\n<a href="${maxLink}">Мы в MAX</a>`
    : text;

  // Текст для MAX → добавляем ссылку на TG
  const maxText = tgLink
    ? text + `\n\n<a href="${tgLink}">Мы в Telegram</a>`
    : text;

  // 1. Основной TG-канал
  const mainResult = photoUrl
    ? await tgPostPhoto(mainChannelId, photoUrl, tgText)
    : await tgPost(mainChannelId, tgText);

  // 2. MAX канал (fire-and-forget)
  maxChannelPost(maxText, photoUrl).then(r => {
    if (!r.ok) console.error('[postToAllChannels] MAX channel error:', r.error);
  }).catch(() => {});

  return mainResult;
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
  return postToAllChannels(channelId, text, photoUrl);
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
  return postToAllChannels(channelId, text, photo);
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

  const text = await callAIWithModelDirect([
    { role: 'user', content: prompt },
  ], getModelForAgent('kuzmich'));

  return postToAllChannels(channelId, text);
}

// ── Справочник «Друзья» — внешние партнёры без страницы на сайте ─────────────

interface FriendEntry {
  name: string;
  tagline: string;
  contact: string;
  tg?: string;
  context: string;  // контекст для AI
}

const FRIENDS: Record<string, FriendEntry> = {
  soulful: {
    name: 'SoulfulKamchatka',
    tagline: 'Один день — три места. На джипе. По бездорожью.',
    contact: '+7 929 901-97-87 (WA)',
    tg: '@soulfulKamchatka',
    context: 'Джип-туры по Камчатке. Группы до 4 человек. За один день объезжают несколько труднодоступных мест. Работают круглый год. Неформальный подход, без лишних слов.',
  },
  mestechko: {
    name: 'Местечко Камчатка',
    tagline: 'Вертолёты, джипы, рыбалка. Всё серьёзно.',
    contact: '+7 914 998-19-80',
    tg: '@mestechkokam',
    context: 'Туроператор из Петропавловска-Камчатского. Вертолётные экскурсии в Долину гейзеров и на Курильское. Джип-туры по бездорожью. Морские прогулки. Снегоходы. Хели-ски. Рыбалка. Работают с 2010-х. Сайт mestechkokam.ru.',
  },
};

/**
 * AI генерирует пост в голосе Кузьмича про внешнего партнёра («друга»)
 * и публикует в канал.
 */
export async function postFriendToChannel(slug: string): Promise<{ ok: boolean; error?: string }> {
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!channelId) return { ok: false, error: 'TELEGRAM_CHANNEL_ID not set' };

  const friend = FRIENDS[slug];
  if (!friend) {
    const available = Object.keys(FRIENDS).join(', ');
    return { ok: false, error: `Друг «${slug}» не найден. Доступные: ${available}` };
  }

  const prompt = `Ты — Кузьмич, камчадал в третьем поколении. Пишешь пост для Telegram-канала.
Тема: рекомендуешь своих друзей — ${friend.name}.
Контекст: ${friend.context}

Требования:
- 60-100 слов, живой голос местного жителя, без рекламного пафоса
- Немного иронии над городскими туристами которые сидят в гостиницах
- Конкретно и по делу — что они делают, чем отличаются
- В конце контакты: ${friend.contact}${friend.tg ? `, ${friend.tg}` : ''}
- HTML-теги Telegram: <b>жирный</b>, <i>курсив</i>
- Начни не с имени, а с наблюдения или ситуации`;

  const text = await callAIWithModelDirect([
    { role: 'user', content: prompt },
  ], getModelForAgent('kuzmich'));

  return postToAllChannels(channelId, text);
}

// ── А2. Кузьмич — AI-пост о конкретном маршруте (автономный cron) ────────────

interface KuzmichRouteRow {
  id: string;
  title: string;
  description: string | null;
  location_type: string | null;
  activity_type: string | null;
  zone: string | null;
  kuzmich_review: string | null;
  lat: number | null;
  lng: number | null;
}

// Карта activity_type → фото из public/images/activities/ (fallback)
const ACTIVITY_PHOTO: Record<string, string> = {
  trekking:    '/images/activities/volcanoes.jpg',
  fishing:     '/images/activities/fishing.jpg',
  helicopter:  '/images/activities/helicopter.jpg',
  thermal:     '/images/activities/hotsprings.jpg',
  boat_trip:   '/images/activities/sea.jpg',
  snowmobile:  '/images/activities/snowmobile.jpg',
  bears:       '/images/hero/bears-kurilskoye.jpg',
};

function buildRoutePhotoUrl(r: KuzmichRouteRow): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';
  // 1. Яндекс Static Maps если есть координаты
  if (r.lat && r.lng) {
    const ll = `${r.lng},${r.lat}`;
    return `https://static-maps.yandex.ru/1.x/?ll=${ll}&z=11&size=650,400&pt=${ll},pm2rdm&l=map`;
  }
  // 2. Тематическое фото по типу активности
  const actPhoto = ACTIVITY_PHOTO[r.activity_type ?? ''];
  if (actPhoto) return `${appUrl}${actPhoto}`;
  return null;
}

/**
 * Выбирает случайный маршрут, не постившийся последние 30 дней,
 * генерирует пост голосом Кузьмича и публикует в канал.
 * Логирует в ai_actions_log.
 */
export async function postKuzmichRoute(): Promise<{ ok: boolean; routeId?: string; error?: string }> {
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!channelId) return { ok: false, error: 'TELEGRAM_CHANNEL_ID not set' };

  // Берём маршрут, который не постили последние 30 дней
  const pickResult = await query<KuzmichRouteRow>(`
    SELECT id, title, description, location_type, activity_type, zone, kuzmich_review, lat, lng
    FROM agent_route_knowledge
    WHERE is_visible = TRUE
      AND id::text NOT IN (
        SELECT metadata->>'route_id'
        FROM ai_actions_log
        WHERE action_type = 'kuzmich_post'
          AND created_at > NOW() - INTERVAL '30 days'
          AND metadata->>'route_id' IS NOT NULL
      )
    ORDER BY RANDOM()
    LIMIT 1
  `, []);

  if (!pickResult.rows[0]) return { ok: false, error: 'Нет маршрутов для поста (все опубликованы в последние 30 дней)' };
  const r = pickResult.rows[0];

  const locLabel = LOCATION_LABELS[r.location_type ?? ''] ?? r.location_type ?? '';
  const actLabel = ACTIVITY_LABELS[r.activity_type ?? ''] ?? r.activity_type ?? '';
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';

  const reviewCtx = r.kuzmich_review
    ? `\nМои заметки об этом месте: "${r.kuzmich_review.slice(0, 280)}"`
    : '';

  const prompt = `Ты — Кузьмич, камчадал в третьем поколении. Напиши короткий пост для Telegram-канала о конкретном месте.

Место: ${r.title}
Тип: ${locLabel || 'природный объект'}${actLabel ? ', ' + actLabel : ''}
Описание: ${r.description?.slice(0, 300) ?? 'нет данных'}${reviewCtx}

Требования:
- 70-100 слов, живой голос местного, без рекламы и пафоса
- Конкретная деталь или секрет этого места, которую знают не все
- Лёгкая ирония над городскими туристами которые едут и не знают куда
- В конце обязательно ссылка: ${appUrl}/routes/${r.id}
- HTML-теги Telegram: <b>жирный</b>, <i>курсив</i>
- Не начинай с "Привет" или своего имени`;

  const text = await callAIWithModelDirect([{ role: 'user', content: prompt }], getModelForAgent('kuzmich'));
  const photoUrl = buildRoutePhotoUrl(r);
  const result = await postToAllChannels(channelId, text, photoUrl);

  if (result.ok) {
    try {
      await query(
        `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
        ['kuzmich_post', JSON.stringify({ route_id: r.id, route_title: r.title })]
      );
    } catch { /* таблица ещё не создана — не блокируем пост */ }
  }

  return { ...result, routeId: r.id };
}

const KUZMICH_TIP_TOPICS = [
  'как правильно выбрать время для поездки на Камчатку',
  'что взять с собой на вулкан — и чего точно не стоит',
  'почему рыбалка на Камчатке — это не только про рыбу',
  'как не облажаться с погодой на Камчатке',
  'чем Камчатка отличается от любого другого путешествия',
  'почему термальные источники лучше любого пятизвёздочного спа',
  'как местные относятся к медведям — и как надо вести себя туристу',
  'зачем ехать на Камчатку не в август, а в другое время',
  'что туристы чаще всего недооценивают в поездке на Камчатку',
];

/**
 * Генерирует практичный совет от Кузьмича и публикует в канал.
 */
export async function postKuzmichTip(): Promise<{ ok: boolean; error?: string }> {
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!channelId) return { ok: false, error: 'TELEGRAM_CHANNEL_ID not set' };

  const topic = KUZMICH_TIP_TOPICS[Math.floor(Math.random() * KUZMICH_TIP_TOPICS.length)];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';

  const prompt = `Ты — Кузьмич, камчадал в третьем поколении. Напиши практичный совет для Telegram-канала.

Тема: ${topic}

Требования:
- 60-90 слов, разговорный стиль, как объясняешь знакомому
- Конкретный совет, никаких общих слов
- Немного юмора или самоиронии
- HTML-теги: <b>жирный</b>, <i>курсив</i>
- В конце можно добавить: ${appUrl}/routes`;

  const text = await callAIWithModelDirect([{ role: 'user', content: prompt }], getModelForAgent('kuzmich'));
  const result = await postToAllChannels(channelId, text);

  if (result.ok) {
    try {
      await query(
        `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
        ['kuzmich_tip', JSON.stringify({ topic })]
      );
    } catch { /* таблица ещё не создана */ }
  }

  return result;
}

// ── AI News channel post ─────────────────────────────────────────────────────

import type { IntelligenceFinding } from '@/lib/services/intelligence-monitor.service';
import { buildPollinationsUrl } from '@/lib/services/ai-image-generator';

/**
 * Publishes an AI/tech intelligence finding to the public AI news channel.
 * Generates an engaging post via AI + a Pollinations.ai image.
 * Only called for ai_tech domain, notable/critical urgency.
 */
export async function postAINewsToChannel(finding: IntelligenceFinding): Promise<{ ok: boolean; error?: string }> {
  const channelId = process.env.TELEGRAM_AI_CHANNEL_ID;
  if (!channelId) return { ok: false, error: 'TELEGRAM_AI_CHANNEL_ID not set' };

  // 1. Build context from signals (top 3 with source links)
  const signalCtx = finding.signals
    .slice(0, 5)
    .map((s, i) => `[${i + 1}] ${s.title} (${s.source})\n${s.snippet.slice(0, 200)}`)
    .join('\n\n');

  // 2. AI generates engaging Telegram post
  const postPrompt = `Ты — редактор AI-канала. Напиши пост для публичного Telegram-канала про AI и заработок на технологиях.

ИСХОДНЫЕ ДАННЫЕ:
Анализ: ${finding.summary}
Действия: ${finding.action_items.join('; ')}

ИСТОЧНИКИ:
${signalCtx}

ТРЕБОВАНИЯ:
- 80-150 слов, живой стиль, без канцелярита
- Заголовок жирным (<b>текст</b>)
- 2-3 ключевых факта из источников
- Практический вывод: что это значит для бизнеса и разработчиков
- В конце хэштеги: #AI + 2-3 релевантных (#LLM #OpenAI #DeepSeek и т.д.)
- HTML-теги для Telegram: <b> <i> <a href="url">текст</a>
- Без markdown (* ** # \`\`\`), без эмодзи
- Пиши на русском`;

  let postText: string;
  try {
    postText = await callAIWithModelDirect(
      [{ role: 'user', content: postPrompt }],
      'google/gemini-2.0-flash-001',
    );
  } catch {
    // Fallback: use raw summary
    postText = `<b>AI Intelligence</b>\n\n${esc(finding.summary)}`;
    if (finding.action_items.length > 0) {
      postText += '\n\n' + finding.action_items.map(a => `- ${esc(a)}`).join('\n');
    }
  }

  // 3. Generate image
  const imagePromptText = `futuristic AI technology concept, neural network visualization, glowing blue and purple data streams, abstract digital brain, ${finding.summary.slice(0, 60)}, dark background, cinematic, 8K, no text, no watermarks`;
  const seed = Math.floor(Math.random() * 9_999_999);
  const imageUrl = buildPollinationsUrl(imagePromptText, seed, 1280, 720);

  // 4. Publish to AI channel (photo + caption)
  const result = await tgPostPhoto(channelId, imageUrl, postText);

  // 5. Log action
  if (result.ok) {
    try {
      await query(
        `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
        ['ai_news_post', JSON.stringify({
          domain: finding.domain,
          urgency: finding.urgency,
          summary: finding.summary.slice(0, 200),
          signals_count: finding.signals.length,
        })],
      );
    } catch { /* not critical */ }
  }

  return result;
}

/**
 * Publishes a travel industry intelligence finding to TourHub channel with image.
 * Only called for travel_industry domain, notable/critical urgency.
 */
export async function postTravelNewsToChannel(finding: IntelligenceFinding): Promise<{ ok: boolean; error?: string }> {
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!channelId) return { ok: false, error: 'TELEGRAM_CHANNEL_ID not set' };

  // 1. Build context from signals (top 3)
  const signalCtx = finding.signals
    .slice(0, 3)
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet.slice(0, 150)}`)
    .join('\n\n');

  // 2. AI generates post for tourists/platform users
  const postPrompt = `Ты — маркетолог туристической платформы Камчатки. Напиши пост для публичного Telegram-канала про новости в туристической индустрии.

ИСХОДНЫЕ ДАННЫЕ:
Анализ: ${finding.summary}
Ключевые действия: ${finding.action_items.join('; ')}

ИСТОЧНИКИ:
${signalCtx}

ТРЕБОВАНИЯ:
- 80-120 слов, увлекательный стиль, актуально для туристов
- Заголовок жирным про туризм/путешествия
- 2-3 факта из источников (регуляции, цены, новые маршруты, тренды)
- Практический вывод: как это влияет на туры Камчатки
- В конце ссылка: <a href="https://tourhab.ru/routes">Наши маршруты →</a>
- Хэштеги: #Путешествия #Туризм #Камчатка
- HTML-теги для Telegram: <b> <i> <a>
- Без markdown (* ** #), без эмодзи
- Пиши на русском`;

  let postText: string;
  try {
    postText = await callAIWithModelDirect(
      [{ role: 'user', content: postPrompt }],
      'google/gemini-2.0-flash-001',
    );
  } catch {
    // Fallback: use raw summary
    postText = `<b>Новости туризма</b>\n\n${esc(finding.summary)}`;
    if (finding.action_items.length > 0) {
      postText += '\n\n' + finding.action_items.map(a => `• ${esc(a)}`).join('\n');
    }
    postText += '\n\n<a href="https://tourhab.ru/routes">Наши маршруты →</a>';
  }

  // 3. Generate image (Kamchatka nature focus)
  const imagePromptText = `wild Kamchatka landscape photography, dramatic volcanic mountains, bears fishing, snow-capped peaks, pristine wilderness, turquoise geysers, cinematic, 8K, no people, no text, no watermarks`;
  const seed = Math.floor(Math.random() * 9_999_999);
  const imageUrl = buildPollinationsUrl(imagePromptText, seed, 1280, 720);

  // 4. Publish to TourHub channel (with MAX parallel post)
  const result = await postToAllChannels(channelId, postText, imageUrl);

  // 5. Log action
  if (result.ok) {
    try {
      await query(
        `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
        ['travel_news_post', JSON.stringify({
          domain: finding.domain,
          urgency: finding.urgency,
          summary: finding.summary.slice(0, 200),
          signals_count: finding.signals.length,
        })],
      );
    } catch { /* not critical */ }
  }

  return result;
}

// ── Safety/News post ─────────────────────────────────────────────────────────

/** Parse RSS headlines (lightweight) */
function parseRssItems(xml: string, limit = 8): Array<{ title: string; text: string; date: string }> {
  const items: Array<{ title: string; text: string; date: string }> = [];
  const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null && items.length < limit) {
    const block = m[1];
    const titleM = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const descM = block.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/);
    const fullM = block.match(/<yandex:full-text>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/yandex:full-text>/);
    const dateM = block.match(/<pubDate>(.*?)<\/pubDate>/);
    if (titleM?.[1]) {
      const body = fullM?.[1]?.replace(/<[^>]+>/g, '').slice(0, 600) ?? descM?.[1] ?? '';
      items.push({ title: titleM[1].trim(), text: body.trim(), date: dateM?.[1] ?? '' });
    }
  }
  return items;
}

/**
 * Fetches latest Kamchatka news, finds safety-relevant stories,
 * generates AI post + image, publishes to channel.
 */
export async function postSafetyToChannel(topic?: string): Promise<{ ok: boolean; error?: string }> {
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!channelId) return { ok: false, error: 'TELEGRAM_CHANNEL_ID not set' };

  // 1. Fetch Kamchatka news
  let newsItems: Array<{ title: string; text: string; date: string }> = [];
  try {
    const res = await fetch('https://kamchatka.aif.ru/rss/all.php', { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const xml = await res.text();
      newsItems = parseRssItems(xml, 15);
    }
  } catch { /* feed unavailable */ }

  // Filter for safety/tourism relevant news
  const safetyKeywords = ['турист', 'безопасн', 'спасат', 'мчс', 'погиб', 'пострад', 'поиск', 'эвакуац', 'вулкан', 'извержен', 'медвед', 'шторм', 'лавин'];
  const safetyNews = newsItems.filter(n => {
    const lower = (n.title + ' ' + n.text).toLowerCase();
    return safetyKeywords.some(kw => lower.includes(kw));
  });

  const relevantNews = safetyNews.length > 0 ? safetyNews : newsItems.slice(0, 3);
  const newsContext = relevantNews.map(n => `${n.title}: ${n.text.slice(0, 300)}`).join('\n\n');

  // 2. Generate post via AI
  const userTopic = topic ? `\nТема от админа: ${topic}\n` : '';
  const postPrompt = `Ты — Кузьмич, AI-агент платформы TourHab. Напиши пост для Telegram-канала о безопасности туристов на Камчатке.
${userTopic}
АКТУАЛЬНЫЕ НОВОСТИ:
${newsContext || 'Нет свежих новостей — напиши общий пост о безопасности.'}

ТРЕБОВАНИЯ:
- 100-150 слов
- Заголовок жирным (<b>текст</b>)
- Факты из новостей, без выдумок
- Практичные советы (3-5 пунктов, через дефис)
- Экстренные номера: 112, МЧС Камчатки 8-415-2-11-05-05
- В конце ссылка: <a href="https://tourhab.ru/routes">Безопасные туры с проверенными операторами</a>
- HTML-теги для Telegram: <b> <i> <a>
- Без markdown (* ** #)
- Без эмодзи
- Спокойный серьёзный тон — Кузьмич предупреждает, не пугает`;

  const postText = await callAIWithModelDirect([{ role: 'user', content: postPrompt }], getModelForAgent('kuzmich'));

  // 3. Generate image
  const imagePrompt = safetyNews.length > 0 && safetyNews[0].title.toLowerCase().includes('перевал')
    ? 'dramatic winter mountain pass in Kamchatka Russia, blizzard snow storm, dangerous weather, rescue helicopter, dark stormy sky, photorealistic, cinematic, 8K, no people, no text, no watermarks'
    : 'Kamchatka wilderness safety concept, volcanic mountain landscape, dramatic weather, moody atmosphere, trail markers, photorealistic, cinematic, 8K, no people, no text, no watermarks';
  const seed = Math.floor(Math.random() * 9999999);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1280&height=720&seed=${seed}&nologo=true`;

  // 4. Publish to all channels
  const result = await postToAllChannels(channelId, postText, imageUrl);

  if (result.ok) {
    try {
      await query(
        `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
        ['kuzmich_safety_post', JSON.stringify({ topic: topic ?? 'auto', news_count: relevantNews.length })]
      );
    } catch { /* not critical */ }
  }

  return result;
}

// ── Б. Оперативные уведомления (в admin-чат) ─────────────────────────────────

/**
 * Дублирует лид в централизованный admin-чат (TELEGRAM_CHAT_ID).
 * Вызывается fire-and-forget из /api/leads.
 */
interface LeadSourceData {
  source?: string;
  interests?: string[];
  date_from?: string;
  date_to?: string;
  arrival?: string;
  departure?: string;
  trip_days?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
}

const LEAD_SOURCE_LABELS: Record<string, string> = {
  telegram_bot:        'Телеграм-бот',
  telegram_lead_flow:  'ТГ-бот (форма)',
  trip_planner:        'TripPlanner',
  website:             'Сайт',
  homepage_cta:        'Главная (CTA)',
  route_page:          'Страница маршрута',
  max_bot:             'MAX-бот',
  widget:              'Виджет партнёра',
  booking_intake_bot:  'AI-бронирование',
};

const LEAD_INTEREST_LABELS: Record<string, string> = {
  volcano: 'Вулкан', trekking: 'Треккинг', fishing: 'Рыбалка',
  thermal: 'Термальный', helicopter: 'Вертолёт', boat_trip: 'Море',
  snowmobile: 'Снегоходы', skiing: 'Лыжи', diving: 'Дайвинг',
  kayak: 'Байдарки', photography: 'Фото', other: 'Другое',
};

export async function notifyAdminNewLead(lead: {
  id: string;
  name: string;
  phone: string;
  comment?: string | null;
  routeTitle?: string | null;
  sourceUrl?: string | null;
  sourceData?: Record<string, unknown> | null;
  score?: number;
  emoji?: string;
  labelRu?: string;
}): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const sd = lead.sourceData as LeadSourceData | null | undefined;
  const interests = sd?.interests ?? [];
  const dateFrom  = sd?.date_from ?? sd?.arrival;
  const dateTo    = sd?.date_to   ?? sd?.departure;
  const source    = sd?.source ? (LEAD_SOURCE_LABELS[sd.source] ?? sd.source) : null;

  // Заголовок с эмодзи по скорингу
  const emoji = lead.emoji ?? '';
  const scoreText = lead.score != null ? ` \u00b7 ${lead.score}/100` : '';
  const label = lead.labelRu ? ` (${lead.labelRu})` : '';
  const title = source
    ? `${emoji} <b>Лид — ${esc(source)}${label}${scoreText}</b>`
    : `${emoji} <b>Новый лид${label}${scoreText}</b>`;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';

  const lines = [
    title,
    '',
    `<b>Имя:</b> ${esc(lead.name)}`,
    `<b>Тел:</b> <code>${esc(lead.phone)}</code> <a href="tel:${esc(lead.phone)}">(позвонить)</a>`,
  ];

  if (interests.length > 0) {
    const labels = interests.map(i => LEAD_INTEREST_LABELS[i] ?? i).join(', ');
    lines.push(`<b>Интересы:</b> ${esc(labels)}`);
  }
  if (dateFrom) {
    lines.push(`<b>Даты:</b> ${esc(dateFrom)} — ${dateTo ? esc(dateTo) : '?'}`);
  }
  if (sd?.trip_days) lines.push(`<b>Длина:</b> ${sd.trip_days} дн.`);
  if (lead.comment) {
    const preview = lead.comment.length > 300 ? lead.comment.slice(0, 300) + '\u2026' : lead.comment;
    lines.push(`<b>Сообщение:</b> ${esc(preview)}`);
  }
  if (lead.routeTitle) lines.push(`<b>Маршрут:</b> ${esc(lead.routeTitle)}`);
  if (lead.sourceUrl) lines.push(`<b>Страница:</b> ${esc(lead.sourceUrl)}`);

  // Ссылка на CRM
  lines.push('', `<a href="${baseUrl}/hub/admin/leads/${lead.id}">Открыть в CRM →</a>`, `<code>${lead.id}</code>`);

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: 'Позвонил', callback_data: `lead_contacted:${lead.id}` },
        { text: 'Квалифицирован', callback_data: `lead_qualified:${lead.id}` },
      ],
      [
        { text: 'Сделка!', callback_data: `lead_converted:${lead.id}` },
        { text: 'Отказ', callback_data: `lead_lost:${lead.id}` },
      ],
    ],
  };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });

    const tgData = await res.json() as { ok: boolean; error_code?: number; description?: string };

    // Логируем попытку в ai_actions_log
    void query(
      `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
      [
        'telegram_lead_notification',
        JSON.stringify({
          lead_id: lead.id,
          chat_id: chatId,
          success: tgData.ok,
          error_code: tgData.error_code ?? null,
          error_description: (tgData.description ?? '').slice(0, 200),
          score: lead.score ?? null,
          source: source ?? 'unknown',
        }),
      ],
    ).catch(() => {});

    if (!tgData.ok) {
      console.error(`[notifyAdminNewLead] Telegram error ${tgData.error_code}: ${tgData.description}`);
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error('[notifyAdminNewLead] fetch error:', errMsg);

    // Логируем ошибку
    void query(
      `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
      [
        'telegram_lead_notification',
        JSON.stringify({
          lead_id: lead.id,
          chat_id: chatId,
          success: false,
          error: errMsg.slice(0, 200),
        }),
      ],
    ).catch(() => {});
  }
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
