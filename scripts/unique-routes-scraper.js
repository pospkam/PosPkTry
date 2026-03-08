#!/usr/bin/env node
/**
 * scripts/unique-routes-scraper.js
 *
 * Агент-скрапер: парсит ТОЛЬКО те маршруты, которых ещё нет в БД.
 * Целевые сайты:
 *   - tripadvisor.ru  — достопримечательности и туры Камчатки
 *   - mestechkokam.ru — местные маршруты
 *
 * Инструменты:
 *   fetch_url        — скачать страницу
 *   extract_links    — найти ссылки на маршруты
 *   check_new_routes — отфильтровать уже существующие (по dedupe_key)
 *   save_new_routes  — сохранить только новые (INSERT, без UPDATE)
 *   get_stats        — статистика БД
 *
 * Запуск:
 *   node scripts/unique-routes-scraper.js
 *   node scripts/unique-routes-scraper.js --dry-run
 *   node scripts/unique-routes-scraper.js --stats
 */

'use strict';

const { JSDOM } = require('jsdom');
const { URL }   = require('url');
const { Pool }  = require('pg');
const crypto    = require('crypto');
const fs        = require('fs');
const path      = require('path');

// ── .env ─────────────────────────────────────────────────────
function loadDotEnv() {
  for (const f of ['.env.local', '.env']) {
    const full = path.resolve(process.cwd(), f);
    if (fs.existsSync(full)) {
      fs.readFileSync(full, 'utf8').split('\n').forEach(line => {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        // .env.local ВСЕГДА имеет приоритет над shell-переменными
        if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      });
      break;
    }
  }
}
loadDotEnv();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const DATABASE_URL      = process.env.DATABASE_URL;
const DRY_RUN           = process.argv.includes('--dry-run');
const STATS_ONLY        = process.argv.includes('--stats');
const MODEL             = 'claude-opus-4-6';

if (!ANTHROPIC_API_KEY) { console.error('❌ ANTHROPIC_API_KEY не задан'); process.exit(1); }
if (!DATABASE_URL)      { console.error('❌ DATABASE_URL не задан');      process.exit(1); }

// ── PostgreSQL ───────────────────────────────────────────────
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=no-verify') ? { rejectUnauthorized: false } : undefined,
  max: 3,
});

// ── Вычислить dedupe_key (как в основном скрапере) ───────────
function makeDedupeKey(sourceUrl, title) {
  try {
    const hostname = new URL(sourceUrl).hostname;
    const slug = title.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 80);
    return `${hostname}:${slug}`;
  } catch {
    return crypto.createHash('md5').update(sourceUrl + title).digest('hex');
  }
}

// ── Проверить какие маршруты ещё не в БД ─────────────────────
async function filterNewRoutes(routes) {
  if (!routes?.length) return [];
  const client = await pool.connect();
  try {
    const keys = routes.map(r => makeDedupeKey(r.source_url, r.title));
    const res  = await client.query(
      `SELECT route_dedupe_key FROM agent_route_knowledge WHERE route_dedupe_key = ANY($1)`,
      [keys]
    );
    const existingKeys = new Set(res.rows.map(r => r.route_dedupe_key));
    return routes.filter((r, i) => !existingKeys.has(keys[i]));
  } finally {
    client.release();
  }
}

// ── Сохранить ТОЛЬКО новые маршруты (INSERT, без UPDATE) ──────
async function saveNewRoutes(routes, sourceName) {
  if (!routes?.length) return { saved: 0, skipped: 0 };

  // Сначала фильтруем уже существующие
  const newRoutes = await filterNewRoutes(routes);
  const alreadyExists = routes.length - newRoutes.length;

  if (!newRoutes.length) {
    return { saved: 0, skipped: routes.length, already_in_db: alreadyExists };
  }

  if (DRY_RUN) {
    console.log(`[dry-run] Новых маршрутов (не записываются): ${newRoutes.map(r => r.title).join(' | ')}`);
    return { saved: 0, skipped: routes.length, new_found: newRoutes.length, already_in_db: alreadyExists, dry_run: true };
  }

  let saved = 0, skipped = 0;
  const client = await pool.connect();
  try {
    for (const r of newRoutes) {
      if (!r.title?.trim() || !r.category || !r.source_url) { skipped++; continue; }

      const dedupeKey  = makeDedupeKey(r.source_url, r.title);
      const searchText = [r.title, r.description ?? '', r.category].filter(Boolean).join(' ');
      const sourceHash = crypto.createHash('md5').update(searchText).digest('hex');

      try {
        await client.query(`
          INSERT INTO agent_route_knowledge
            (route_dedupe_key, category, title, description, lat, lng,
             source_url, source_name, search_text, payload, source_hash, last_synced_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,NOW())
          ON CONFLICT (route_dedupe_key) DO NOTHING
        `, [
          dedupeKey,
          r.category,
          r.title.trim(),
          r.description ?? null,
          r.lat ?? null,
          r.lng ?? null,
          r.source_url,
          sourceName ?? new URL(r.source_url).hostname,
          searchText,
          JSON.stringify(r.extra ?? {}),
          sourceHash,
        ]);
        saved++;
      } catch { skipped++; }
    }
  } finally { client.release(); }

  return { saved, skipped, already_in_db: alreadyExists, total_checked: routes.length };
}

// ── Статистика ────────────────────────────────────────────────
async function getDBStats() {
  const client = await pool.connect();
  try {
    const res   = await client.query(
      `SELECT category, COUNT(*) as cnt FROM agent_route_knowledge GROUP BY category ORDER BY cnt DESC`
    );
    const total = await client.query('SELECT COUNT(*) AS n FROM agent_route_knowledge');
    return {
      total: Number(total.rows[0]?.n ?? 0),
      by_category: Object.fromEntries(res.rows.map(r => [r.category, Number(r.cnt)])),
    };
  } finally { client.release(); }
}

// ── HTML → читаемый текст ─────────────────────────────────────
function htmlToText(html, maxLen = 6000) {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Извлечь JSON-LD (schema.org) — очень полезно для TripAdvisor
    const jsonLdBlocks = [];
    for (const el of doc.querySelectorAll('script[type="application/ld+json"]')) {
      try { jsonLdBlocks.push(el.textContent); } catch { /* ok */ }
    }

    for (const el of doc.querySelectorAll('script,style,noscript,svg,iframe,header,footer,nav')) {
      el.remove();
    }

    const mainText = (doc.body?.textContent ?? doc.documentElement.textContent ?? '')
      .replace(/\s{3,}/g, '\n\n').trim();

    const combined = (jsonLdBlocks.length
      ? '=== JSON-LD ===\n' + jsonLdBlocks.join('\n') + '\n\n=== Текст ===\n'
      : '') + mainText;

    return combined.slice(0, maxLen);
  } catch {
    return String(html).slice(0, maxLen);
  }
}

// ── Ссылки из HTML ────────────────────────────────────────────
function extractLinks(html, baseUrl, filterPattern = '') {
  const links = new Set();
  try {
    const dom  = new JSDOM(html, { url: baseUrl });
    const base = new URL(baseUrl);
    for (const a of dom.window.document.querySelectorAll('a[href]')) {
      try {
        const href = new URL(a.href, baseUrl);
        if (href.hostname === base.hostname &&
            !href.href.match(/\.(pdf|jpg|png|gif|zip|doc|css|js)$/i)) {
          if (!filterPattern || href.pathname.includes(filterPattern)) {
            links.add(href.href.replace(/#.*$/, ''));
          }
        }
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return [...links].slice(0, 40);
}

// ── HTTP fetch с User-Agent / retry ──────────────────────────
async function fetchUrl(url, timeoutMs = 12000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal:  ctrl.signal,
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control':   'no-cache',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { error: `HTTP ${res.status} — ${url}` };
    const html = await res.text();
    return { html, url: res.url, length: html.length };
  } catch (e) {
    clearTimeout(timer);
    return { error: String(e.message ?? e) };
  }
}

// ─────────────────────────────────────────────────────────────
// TOOL SCHEMAS
// ─────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name:        'fetch_url',
    description: 'Загрузить страницу. Возвращает очищенный текст + JSON-LD структуру (если есть).',
    input_schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
    },
  },
  {
    name:        'extract_links',
    description: 'Найти ссылки на странице (до 40) того же домена. Используй filter для фильтрации по пути.',
    input_schema: {
      type: 'object',
      properties: {
        url:    { type: 'string', description: 'URL для определения домена' },
        html:   { type: 'string', description: 'HTML-контент (опционально, иначе из кэша)' },
        filter: { type: 'string', description: 'Подстрока пути: tour, route, attraction, place, marshrut' },
      },
      required: ['url'],
    },
  },
  {
    name:        'check_new_routes',
    description: 'Проверить список маршрутов — вернуть ТОЛЬКО те, которых ещё НЕТ в базе данных. Всегда вызывай перед save_new_routes.',
    input_schema: {
      type: 'object',
      properties: {
        routes: {
          type:  'array',
          description: 'Потенциальные маршруты для проверки',
          items: {
            type: 'object',
            properties: {
              title:      { type: 'string' },
              source_url: { type: 'string' },
            },
            required: ['title', 'source_url'],
          },
        },
      },
      required: ['routes'],
    },
  },
  {
    name:        'save_new_routes',
    description: 'Сохранить маршруты в БД. Автоматически пропускает уже существующие. Возвращает счётчики: saved (новые), already_in_db (уже были).',
    input_schema: {
      type: 'object',
      properties: {
        source_name: { type: 'string', description: 'Название источника (tripadvisor.ru / mestechkokam.ru)' },
        routes: {
          type:  'array',
          items: {
            type: 'object',
            properties: {
              title:       { type: 'string', description: 'Конкретное название (не "Туры на Камчатку")' },
              description: { type: 'string', description: 'Описание до 300 символов' },
              category: {
                type: 'string',
                enum: ['vulkani','rybalka','termalnye_istochniki','snegohod','dzhip',
                       'trekking','medvedi','geyzery','eco','mountains','rivers',
                       'lakes','morskie_progulki','vertoletnye_tury','combo'],
              },
              source_url:  { type: 'string' },
              lat:         { type: 'number' },
              lng:         { type: 'number' },
            },
            required: ['title', 'category', 'source_url'],
          },
        },
      },
      required: ['routes', 'source_name'],
    },
  },
  {
    name:        'get_stats',
    description: 'Статистика БД: сколько маршрутов уже есть по категориям.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
];

// ─────────────────────────────────────────────────────────────
// TOOL HANDLERS
// ─────────────────────────────────────────────────────────────

const htmlCache = new Map();

const TOOL_HANDLERS = {
  fetch_url: async ({ url }) => {
    console.log(`  ↓ fetch  ${url}`);
    if (htmlCache.has(url)) {
      const cached = htmlCache.get(url);
      return JSON.stringify({ url, text: htmlToText(cached), cached: true });
    }
    const res = await fetchUrl(url);
    if (res.error) return JSON.stringify({ error: res.error });
    htmlCache.set(url, res.html);
    return JSON.stringify({ url: res.url, text: htmlToText(res.html), length: res.length });
  },

  extract_links: async ({ url, html, filter = '' }) => {
    console.log(`  ↓ links  ${url}  filter="${filter}"`);
    const raw   = html || htmlCache.get(url) || '';
    const links = extractLinks(raw, url, filter);
    return JSON.stringify({ links, count: links.length });
  },

  check_new_routes: async ({ routes }) => {
    console.log(`  ↓ check  ${routes?.length ?? 0} маршрутов...`);
    const newRoutes = await filterNewRoutes(routes);
    const existing  = (routes?.length ?? 0) - newRoutes.length;
    console.log(`     → новых: ${newRoutes.length}, уже в БД: ${existing}`);
    return JSON.stringify({
      new_routes:    newRoutes,
      new_count:     newRoutes.length,
      existing_count: existing,
    });
  },

  save_new_routes: async ({ routes, source_name }) => {
    console.log(`  ↓ save   ${routes?.length ?? 0} маршрутов от "${source_name}"`);
    const result = await saveNewRoutes(routes, source_name);
    console.log(`     → сохранено: ${result.saved}, пропущено (уже в БД): ${result.already_in_db ?? 0}`);
    return JSON.stringify(result);
  },

  get_stats: async () => {
    console.log(`  ↓ stats`);
    const stats = await getDBStats();
    return JSON.stringify(stats);
  },
};

// ─────────────────────────────────────────────────────────────
// Claude API
// ─────────────────────────────────────────────────────────────

async function callClaude(messages, system) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 4096, system, tools: TOOLS, messages }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Anthropic ${res.status}: ${err}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────
// AGENT LOOP
// ─────────────────────────────────────────────────────────────

async function agentLoop(task, system) {
  const messages = [{ role: 'user', content: task }];
  let round = 0;

  while (true) {
    round++;
    console.log(`\n[раунд ${round}]`);

    const response = await callClaude(messages, system);
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason !== 'tool_use') {
      const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
      if (text) console.log('\n[итог] ' + text);
      break;
    }

    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      const handler = TOOL_HANDLERS[block.name];
      let output;
      try {
        output = handler ? await handler(block.input) : `Unknown tool: ${block.name}`;
      } catch (e) {
        output = `Error: ${e.message}`;
      }
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: String(output) });
    }

    messages.push({ role: 'user', content: toolResults });
    if (round >= 50) { console.log('[стоп] лимит 50 раундов'); break; }
  }
}

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ты агент-скрапер туристических маршрутов Камчатки.
Задача: найти и сохранить ТОЛЬКО УНИКАЛЬНЫЕ маршруты — те, которых ещё нет в базе данных.

═══ ЦЕЛЕВЫЕ САЙТЫ ═══

1. TRIPADVISOR (https://www.tripadvisor.ru/Attractions-g298491-Activities-Kamchatka_Krai_Far_Eastern_District.html)
   - Страницы достопримечательностей и активностей на Камчатке
   - JSON-LD будет в <script type="application/ld+json"> — используй его для извлечения данных
   - Фильтр ссылок: "Attraction_Review" или "AttractionProductReview"
   - source_name: "tripadvisor.ru"

2. MESTECHKOKAM (https://mestechkokam.ru/)
   - Местный сайт маршрутов Камчатки
   - Ищи ссылки с /tour/ /marshrut/ /route/ /trek/ /pohod/
   - source_name: "mestechkokam.ru"

3. ZIMALETOKAMCHATKA (https://zimaletokamchatka.ru/)
   - Сезонные туры и маршруты Камчатки (зима/лето)
   - Ищи ссылки с /tour/ /marshrut/ /program/ /ekskursii/ /pohod/
   - source_name: "zimaletokamchatka.ru"

═══ АЛГОРИТМ ═══

Шаг 1. get_stats → посмотри что уже есть

Шаг 2. Для КАЖДОГО сайта:
  а) fetch_url(главная страница)
  б) extract_links(url, filter="Attraction_Review") — для TripAdvisor
     extract_links(url, filter="tour") — для mestechkokam
  в) Для каждой найденной ссылки:
     - fetch_url(ссылка)
     - Извлеки: title, description, category из текста/JSON-LD
     - Собери пачку из 5-10 маршрутов
  г) check_new_routes(пачка) → получи ТОЛЬКО новые
  д) Если новые есть → save_new_routes(новые, source_name)

Шаг 3. Итоговый отчёт: сколько новых добавлено, сколько уже было в БД

═══ КАТЕГОРИИ ═══
vulkani | rybalka | termalnye_istochniki | snegohod | dzhip |
trekking | medvedi | geyzery | eco | mountains | rivers |
lakes | morskie_progulki | vertoletnye_tury | combo

Соответствие ключевых слов:
- вулкан / eruption / volcano → vulkani
- рыбалк / рыб / fishing / fish → rybalka
- термы / горячий источник / hot spring → termalnye_istochniki
- гейзер / geyser → geyzery
- медведь / bear watching → medvedi
- снегоход / snowmobile → snegohod
- джип / jeep / внедорожник → dzhip
- трекинг / hiking / поход / пешеход → trekking
- вертолет / helicopter → vertoletnye_tury
- море / яхт / кит / dolphin / whale → morskie_progulki
- озеро / lake → lakes
- река / сплав / rafting / kayak → rivers
- гор / mountain / перевал → mountains
- экотур / wildlife / природ → eco

═══ ПРАВИЛА ═══
- title: конкретное название, не "Туры на Камчатку" (до 80 символов)
- description: 50–300 символов, без рекламных фраз
- Всегда вызывай check_new_routes ПЕРЕД save_new_routes — это ключевое требование
- Не сохраняй дубликаты — check_new_routes отфильтрует уже существующие
- TripAdvisor: ищи JSON-LD Schema.org в тексте — там есть name, description, geo`;

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
  if (STATS_ONLY) {
    const s = await getDBStats();
    console.log(`\n📊 Всего маршрутов: ${s.total}`);
    for (const [cat, cnt] of Object.entries(s.by_category))
      console.log(`   ${cat.padEnd(26)}: ${cnt}`);
    await pool.end();
    return;
  }

  console.log('🤖 Unique-Routes Scraper — только новые маршруты');
  console.log(`   Модель : ${MODEL}`);
  console.log(`   Сайты  : tripadvisor.ru, mestechkokam.ru, zimaletokamchatka.ru`);
  if (DRY_RUN) console.log('   ⚠️  DRY RUN — в БД не пишем');
  console.log('─'.repeat(55));

  const task = `Обойди три сайта и сохрани только НОВЫЕ маршруты Камчатки:
1. TripAdvisor: https://www.tripadvisor.ru/Attractions-g298491-Activities-Kamchatka_Krai_Far_Eastern_District.html
2. Mestechkokam: https://mestechkokam.ru/
3. ZimaletоKamchatka: https://zimaletokamchatka.ru/

Алгоритм: get_stats → fetch каждый сайт → extract_links → fetch страниц маршрутов → check_new_routes → save_new_routes.
Сохраняй только маршруты, которых нет в БД (check_new_routes обязателен перед save_new_routes).`;

  try {
    await agentLoop(task, SYSTEM_PROMPT);
  } finally {
    htmlCache.clear();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
