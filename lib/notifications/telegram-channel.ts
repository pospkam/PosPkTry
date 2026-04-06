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
import { validateRoutePost, validateTextPost, logValidationFailure } from './post-validation';
import { maxPostToChannel } from './max-channel';
import { checkPublicationStandards, logPublicationResult } from './publication-standards';

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

  // Валидация перед публикацией
  const validation = await validateRoutePost(r.id, text);
  if (!validation.valid) {
    await logValidationFailure('route_to_channel', validation);
    return { ok: false, error: `Валидация: ${validation.errors.join('; ')}` };
  }

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

  const text = await callAIWithModelDirect([
    { role: 'user', content: prompt },
  ], getModelForAgent('kuzmich'));

  return tgPost(channelId, text);
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

  return tgPost(channelId, text);
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

// Карта location_type → фото
const LOCATION_PHOTO: Record<string, string> = {
  volcano:     '/images/activities/volcanoes.jpg',
  hot_spring:  '/images/activities/hotsprings.jpg',
  lake:        '/images/hero/hero-light.jpeg',
  mountain:    '/images/activities/volcanoes.jpg',
  river:       '/images/activities/fishing.jpg',
  bay:         '/images/activities/sea.jpg',
  waterfall:   '/images/activities/rafting.jpg',
  island:      '/images/activities/sea.jpg',
  forest:      '/images/activities/volcanoes.jpg',
};

function buildRoutePhotoUrl(r: KuzmichRouteRow, routePhotos?: string[] | null): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';
  // 1. Реальные фото маршрута из БД (приоритет)
  if (routePhotos && routePhotos.length > 0) {
    const photo = routePhotos[0];
    // Абсолютный URL — используем как есть, относительный — добавляем домен
    return photo.startsWith('http') ? photo : `${appUrl}${photo}`;
  }
  // 2. Тематическое фото по типу активности (реальные фото с Камчатки)
  const actPhoto = ACTIVITY_PHOTO[r.activity_type ?? ''];
  if (actPhoto) return `${appUrl}${actPhoto}`;
  // 3. Тематическое фото по типу локации
  const locPhoto = LOCATION_PHOTO[r.location_type ?? ''];
  if (locPhoto) return `${appUrl}${locPhoto}`;
  // 4. Общее фото Камчатки (лучше чем карта)
  return `${appUrl}/images/hero/hero-light.jpeg`;
}

/**
 * Выбирает случайный маршрут, не постившийся последние 30 дней,
 * генерирует пост голосом Кузьмича, проводит AI-ревью,
 * генерирует AI-картинку и публикует в канал.
 *
 * Стандарты публикации:
 *   - AI Content Director ревьюирует текст (оценка >= 6/10)
 *   - AI-картинка генерируется через Pollinations (Flux)
 *   - Ссылка на маршрут проверяется на доступность (HTTP 200)
 *   - Если текст отклонён — перегенерация (до 2 попыток)
 *
 * Ответственный AI-директор: Content (#7)
 */
export async function postKuzmichRoute(): Promise<{ ok: boolean; routeId?: string; error?: string; score?: number }> {
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

  // Валидация маршрута перед генерацией текста
  const preCheck = await validateRoutePost(r.id, 'placeholder text for pre-check is long enough to pass basic validation rules');
  if (!preCheck.valid) {
    // Маршрут не прошёл базовую проверку (не виден, 404) — не тратим ресурсы
    await logValidationFailure('kuzmich_route_precheck', preCheck);
    return { ok: false, routeId: r.id, error: `Маршрут непригоден: ${preCheck.errors.join('; ')}` };
  }

  // Генерация текста с возможностью перегенерации (до 2 попыток)
  let text = '';
  let standardsResult;
  const MAX_ATTEMPTS = 2;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const attemptHint = attempt > 1 ? '\nВАЖНО: предыдущий текст был отклонён контент-директором. Напиши ДРУГОЙ текст, более конкретный и живой.' : '';

    const prompt = `Ты — Кузьмич, камчадал в третьем поколении. Напиши короткий пост для Telegram-канала о конкретном месте.

Место: ${r.title}
Тип: ${locLabel || 'природный объект'}${actLabel ? ', ' + actLabel : ''}
Описание: ${r.description?.slice(0, 300) ?? 'нет данных'}${reviewCtx}${attemptHint}

Требования:
- 70-100 слов, живой голос местного, без рекламы и пафоса
- Конкретная деталь или секрет этого места, которую знают не все
- Лёгкая ирония над городскими туристами которые едут и не знают куда
- В конце обязательно ссылка: ${appUrl}/routes/${r.id}
- HTML-теги Telegram: <b>жирный</b>, <i>курсив</i>
- Не начинай с "Привет" или своего имени`;

    text = await callAIWithModelDirect([{ role: 'user', content: prompt }], getModelForAgent('kuzmich'));

    // Валидация текста
    const validation = await validateRoutePost(r.id, text);
    if (!validation.valid) {
      await logValidationFailure('kuzmich_route', validation);
      if (attempt === MAX_ATTEMPTS) {
        return { ok: false, routeId: r.id, error: `Валидация: ${validation.errors.join('; ')}` };
      }
      continue;
    }

    // Проверка по стандартам публикации (AI-ревью + картинка)
    standardsResult = await checkPublicationStandards(text, 'route', r.id, {
      routeTitle: r.title,
      locationType: r.location_type ?? undefined,
    });

    if (standardsResult.passed || attempt === MAX_ATTEMPTS) break;
    // Текст не прошёл AI-ревью — перегенерируем
  }

  if (!standardsResult) {
    return { ok: false, routeId: r.id, error: 'Не удалось пройти стандарты публикации' };
  }

  await logPublicationResult('route', standardsResult, r.id);

  // Если стандарты не пройдены после всех попыток — не публикуем
  if (!standardsResult.passed) {
    return { ok: false, routeId: r.id, error: `Стандарты: ${standardsResult.errors.join('; ')}`, score: standardsResult.score };
  }

  // Выбор картинки: AI-сгенерированная > фото из БД > тематическое фото
  let routePhotos: string[] | null = null;
  try {
    const photoRes = await query<{ photos: unknown }>(
      `SELECT payload->'photos' AS photos FROM agent_route_knowledge WHERE id = $1`, [r.id]
    );
    const raw = photoRes.rows[0]?.photos;
    if (Array.isArray(raw)) routePhotos = raw as string[];
  } catch { /* ok */ }

  const photoUrl = standardsResult.imageUrl ?? buildRoutePhotoUrl(r, routePhotos);

  const result = photoUrl
    ? await tgPostPhoto(channelId, photoUrl, text)
    : await tgPost(channelId, text);

  if (result.ok) {
    // Дублируем в MAX-канал
    await maxPostToChannel(text).catch(() => {});
    try {
      await query(
        `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
        ['kuzmich_post', JSON.stringify({
          route_id: r.id,
          route_title: r.title,
          quality_score: standardsResult.score,
          has_ai_image: !!standardsResult.imageUrl,
          warnings: standardsResult.warnings,
        })]
      );
    } catch { /* таблица ещё не создана — не блокируем пост */ }
  }

  return { ...result, routeId: r.id, score: standardsResult.score };
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
 * AI Content Director ревьюирует текст. Перегенерация при score < 6.
 */
export async function postKuzmichTip(): Promise<{ ok: boolean; error?: string; score?: number }> {
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!channelId) return { ok: false, error: 'TELEGRAM_CHANNEL_ID not set' };

  const topic = KUZMICH_TIP_TOPICS[Math.floor(Math.random() * KUZMICH_TIP_TOPICS.length)];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';

  let text = '';
  let standardsResult;
  const MAX_ATTEMPTS = 2;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const attemptHint = attempt > 1 ? '\nВАЖНО: предыдущий текст отклонён. Напиши ДРУГОЙ, более живой и конкретный.' : '';

    const prompt = `Ты — Кузьмич, камчадал в третьем поколении. Напиши практичный совет для Telegram-канала.

Тема: ${topic}${attemptHint}

Требования:
- 60-90 слов, разговорный стиль, как объясняешь знакомому
- Конкретный совет, никаких общих слов
- Немного юмора или самоиронии
- HTML-теги: <b>жирный</b>, <i>курсив</i>
- В конце можно добавить: ${appUrl}/routes`;

    text = await callAIWithModelDirect([{ role: 'user', content: prompt }], getModelForAgent('kuzmich'));

    const validation = validateTextPost(text);
    if (!validation.valid) {
      await logValidationFailure('kuzmich_tip', validation);
      if (attempt === MAX_ATTEMPTS) {
        return { ok: false, error: `Валидация: ${validation.errors.join('; ')}` };
      }
      continue;
    }

    standardsResult = await checkPublicationStandards(text, 'tip');
    if (standardsResult.passed || attempt === MAX_ATTEMPTS) break;
  }

  if (!standardsResult) {
    return { ok: false, error: 'Не удалось пройти стандарты' };
  }

  await logPublicationResult('tip', standardsResult);

  if (!standardsResult.passed) {
    return { ok: false, error: `Стандарты: ${standardsResult.errors.join('; ')}`, score: standardsResult.score };
  }

  const result = await tgPost(channelId, text);

  if (result.ok) {
    await maxPostToChannel(text).catch(() => {});
    try {
      await query(
        `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
        ['kuzmich_tip', JSON.stringify({ topic, quality_score: standardsResult.score })]
      );
    } catch { /* таблица ещё не создана */ }
  }

  return result;
}

/**
 * Генерирует промо-пост от Кузьмича с кросс-ссылками на все каналы.
 */
export async function postKuzmichPromo(): Promise<{ ok: boolean; error?: string }> {
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!channelId) return { ok: false, error: 'TELEGRAM_CHANNEL_ID not set' };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';

  const prompt = `Ты — Кузьмич, камчадал в третьем поколении. Напиши промо-пост для Telegram-канала.

Тема: у тебя теперь есть три канала, где ты помогаешь туристам с Камчаткой:
1. Сайт tourhab.ru — 131 маршрут, 13 туров, онлайн-бронирование
2. Telegram-бот @KuzmichKam_bot — личный AI-помощник по Камчатке
3. MAX-бот max.ru/id4101147649_bot — тот же Кузьмич, но в MAX мессенджере

Требования:
- 80-120 слов, живой голос местного, не рекламный пафос
- Покажи ценность: подберу тур, рассчитаю бюджет, расскажу где медведи и горячие источники
- Лёгкая ирония: мол, раньше только в тайге рассказывал, теперь вот и в интернете
- HTML-теги: <b>жирный</b>, <i>курсив</i>
- В конце обязательно три ссылки:
  ${appUrl}
  t.me/KuzmichKam_bot
  max.ru/id4101147649_bot`;

  const text = await callAIWithModelDirect([{ role: 'user', content: prompt }], getModelForAgent('kuzmich'));

  // Валидация промо-поста
  const validation = validateTextPost(text);
  if (!validation.valid) {
    await logValidationFailure('kuzmich_promo', validation);
    return { ok: false, error: `Валидация: ${validation.errors.join('; ')}` };
  }

  const result = await tgPost(channelId, text);

  if (result.ok) {
    // Дублируем в MAX-канал
    await maxPostToChannel(text).catch(() => {});
    try {
      await query(
        `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
        ['kuzmich_promo', JSON.stringify({ channels: ['site', 'telegram', 'max'] })]
      );
    } catch { /* ok */ }
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
  telegram_bot: 'Телеграм-бот',
  trip_planner: 'TripPlanner',
  website:      'Сайт',
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

  const title = source ? `<b>Лид — ${esc(source)}</b>` : '<b>Лид с сайта</b>';

  const lines = [
    title,
    '',
    `<b>Имя:</b> ${esc(lead.name)}`,
    `<b>Тел:</b> <a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a>`,
  ];

  if (interests.length > 0) {
    const labels = interests.map(i => LEAD_INTEREST_LABELS[i] ?? i).join(', ');
    lines.push(`<b>Интересы:</b> ${esc(labels)}`);
  }
  if (dateFrom) {
    lines.push(`<b>Даты:</b> ${esc(dateFrom)} — ${dateTo ? esc(dateTo) : '?'}`);
  }
  if (sd?.trip_days) lines.push(`<b>Длина:</b> ${sd.trip_days} дн.`);
  if (lead.comment) lines.push(`<b>Комментарий:</b> ${esc(lead.comment)}`);
  if (lead.routeTitle) lines.push(`<b>Маршрут:</b> ${esc(lead.routeTitle)}`);
  if (lead.sourceUrl) lines.push(`<b>Страница:</b> ${esc(lead.sourceUrl)}`);
  lines.push('', `<code>${lead.id}</code>`);

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
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });
  } catch { /* некритично */ }
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
