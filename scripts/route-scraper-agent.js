#!/usr/bin/env node
/**
 * scripts/route-scraper-agent.js
 *
 * Агент-скрапер туристических маршрутов Камчатки.
 * Паттерн: Agent Loop из https://github.com/shareAI-lab/learn-claude-code
 *
 * Провайдер: Anthropic Claude (claude-opus-4-6) через raw fetch
 * БД: PostgreSQL (agent_route_knowledge), соединение из DATABASE_URL
 * Парсинг HTML: jsdom
 *
 * Запуск:
 *   node scripts/route-scraper-agent.js
 *   node scripts/route-scraper-agent.js --dry-run   (без записи в БД)
 *   node scripts/route-scraper-agent.js --stats     (только статистика)
 */

'use strict';

const { JSDOM } = require('jsdom');
const { URL }   = require('url');
const { Pool }  = require('pg');
const crypto    = require('crypto');
const fs        = require('fs');
const path      = require('path');

// ── Загрузка .env.local ──────────────────────────────────────
function loadDotEnv() {
  const candidates = ['.env.local', '.env'];
  for (const f of candidates) {
    const full = path.resolve(process.cwd(), f);
    if (fs.existsSync(full)) {
      const lines = fs.readFileSync(full, 'utf8').split('\n');
      for (const line of lines) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        }
      }
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
if (!DATABASE_URL)      { console.error('❌ DATABASE_URL не задан'); process.exit(1); }

// ── PostgreSQL ───────────────────────────────────────────────
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=no-verify') ? { rejectUnauthorized: false } : undefined,
  max: 3,
});

// ── HTML → читаемый текст (до 6000 символов) ────────────────
function htmlToText(html, maxLen = 6000) {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    // Убрать скрипты, стили, нструкции
    for (const el of doc.querySelectorAll('script,style,noscript,svg,iframe,header,footer,nav')) {
      el.remove();
    }
    const text = (doc.body?.textContent ?? doc.documentElement.textContent ?? '')
      .replace(/\s{3,}/g, '\n\n').trim();
    return text.slice(0, maxLen);
  } catch {
    return String(html).slice(0, maxLen);
  }
}

// ── Извлечь ссылки из HTML ───────────────────────────────────
function extractLinks(html, baseUrl, filterPattern = '') {
  const links = new Set();
  try {
    const dom  = new JSDOM(html, { url: baseUrl });
    const base = new URL(baseUrl);
    for (const a of dom.window.document.querySelectorAll('a[href]')) {
      try {
        const href = new URL(a.href, baseUrl);
        // Только страницы того же домена и HTML
        if (href.hostname === base.hostname && !href.href.match(/\.(pdf|jpg|png|gif|zip|doc)$/i)) {
          if (!filterPattern || href.pathname.includes(filterPattern)) {
            links.add(href.href.replace(/#.*$/, ''));
          }
        }
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return [...links].slice(0, 30);
}

// ── Сохранить маршруты в БД ──────────────────────────────────
async function saveRoutesToDB(routes, sourceName) {
  if (!routes?.length) return { saved: 0, skipped: 0 };
  if (DRY_RUN) {
    console.log(`[dry-run] Маршруты (не записываются): ${routes.map(r => r.title).join(' | ')}`);
    return { saved: 0, skipped: routes.length, dry_run: true };
  }

  let saved = 0, skipped = 0;
  const client = await pool.connect();
  try {
    for (const r of routes) {
      if (!r.title?.trim() || !r.category || !r.source_url) { skipped++; continue; }

      const dedupeKey = `${new URL(r.source_url).hostname}:${r.title.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 80)}`;
      const searchText = [r.title, r.description ?? '', r.category].filter(Boolean).join(' ');
      const sourceHash = crypto.createHash('md5').update(searchText).digest('hex');

      await client.query(`
        INSERT INTO agent_route_knowledge
          (route_dedupe_key, category, title, description, lat, lng,
           source_url, source_name, search_text, payload, source_hash, last_synced_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,NOW())
        ON CONFLICT (route_dedupe_key) DO UPDATE SET
          title         = EXCLUDED.title,
          description   = COALESCE(EXCLUDED.description, agent_route_knowledge.description),
          lat           = COALESCE(EXCLUDED.lat,         agent_route_knowledge.lat),
          lng           = COALESCE(EXCLUDED.lng,         agent_route_knowledge.lng),
          search_text   = EXCLUDED.search_text,
          source_hash   = EXCLUDED.source_hash,
          last_synced_at = NOW(),
          updated_at    = NOW()
        WHERE agent_route_knowledge.source_hash != EXCLUDED.source_hash
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
    }
  } finally { client.release(); }
  return { saved, skipped };
}

// ── Статистика из БД ──────────────────────────────────────────
async function getDBStats() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT category, COUNT(*) as cnt
      FROM agent_route_knowledge
      GROUP BY category ORDER BY cnt DESC
    `);
    const total = await client.query('SELECT COUNT(*) AS n FROM agent_route_knowledge');
    return {
      total: Number(total.rows[0]?.n ?? 0),
      by_category: Object.fromEntries(res.rows.map(r => [r.category, Number(r.cnt)])),
    };
  } finally { client.release(); }
}

// ── Обёртка fetch с таймаутом ────────────────────────────────
async function fetchUrl(url, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KamchatourBot/1.0; +https://pospkam-pospktry-c1f3.twc1.net)' },
    });
    clearTimeout(timer);
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const html = await res.text();
    return { html, url: res.url, length: html.length };
  } catch (e) {
    clearTimeout(timer);
    return { error: String(e.message ?? e) };
  }
}

// ─────────────────────────────────────────────────────────────
// TOOL SCHEMAS (паттерн из s02_tool_use.py)
// ─────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'fetch_url',
    description: 'Скачать страницу по URL и вернуть очищенный текст. Используй для изучения сайтов с маршрутами.',
    input_schema: {
      type: 'object',
      properties: { url: { type: 'string', description: 'Полный URL страницы' } },
      required: ['url'],
    },
  },
  {
    name: 'extract_links',
    description: 'Найти ссылки на странице по URL. Возвращает до 30 ссылок того же домена.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL уже загруженной страницы (для фильтрации по домену)' },
        html: { type: 'string', description: 'HTML-контент страницы' },
        filter: { type: 'string', description: 'Подстрока пути для фильтрации ссылок (например: /tour, /route, /marshrut)' },
      },
      required: ['url', 'html'],
    },
  },
  {
    name: 'save_routes',
    description: 'Сохранить извлечённые маршруты в базу данных. Вызывай после изучения страницы с маршрутами.',
    input_schema: {
      type: 'object',
      properties: {
        source_name: { type: 'string', description: 'Название источника (например: visitkamchatka.ru)' },
        routes: {
          type: 'array',
          description: 'Список маршрутов для сохранения',
          items: {
            type: 'object',
            properties: {
              title:       { type: 'string', description: 'Название маршрута или тура' },
              description: { type: 'string', description: 'Описание (до 500 символов)' },
              category:    {
                type: 'string',
                enum: ['vulkani', 'rybalka', 'termalnye_istochniki', 'snegohod', 'dzhip', 'trekking', 'medvedi', 'geyzery', 'eco', 'mountains', 'rivers', 'lakes', 'morskie_progulki', 'vertoletnye_tury'],
                description: 'Категория маршрута (vulkani=вулканы, rybalka=рыбалка, termalnye_istochniki=термы, snegohod, trekking, medvedi, geyzery, eco, mountains, rivers, lakes)',
              },
              source_url:  { type: 'string', description: 'Прямая ссылка на страницу маршрута' },
              lat:         { type: 'number', description: 'Широта (если известна)' },
              lng:         { type: 'number', description: 'Долгота (если известна)' },
            },
            required: ['title', 'category', 'source_url'],
          },
        },
      },
      required: ['routes', 'source_name'],
    },
  },
  {
    name: 'get_stats',
    description: 'Получить статистику: сколько маршрутов уже в БД по категориям.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
];

// ─────────────────────────────────────────────────────────────
// TOOL HANDLERS (dispatch map — паттерн s02_tool_use.py)
// ─────────────────────────────────────────────────────────────

// Кэш: url → html (чтобы не качать дважды)
const htmlCache = new Map();

const TOOL_HANDLERS = {
  fetch_url: async ({ url }) => {
    console.log(`  ↓ fetch_url: ${url}`);
    if (htmlCache.has(url)) {
      const cached = htmlCache.get(url);
      return JSON.stringify({ url, text: htmlToText(cached), cached: true, length: cached.length });
    }
    const res = await fetchUrl(url);
    if (res.error) return JSON.stringify({ error: res.error });
    htmlCache.set(url, res.html);
    const text = htmlToText(res.html);
    return JSON.stringify({ url: res.url, text, length: res.length });
  },

  extract_links: async ({ url, html, filter = '' }) => {
    console.log(`  ↓ extract_links: ${url} (filter: "${filter}")`);
    // Если html не передан — попробуем кэш
    const rawHtml = html || htmlCache.get(url) || '';
    const links = extractLinks(rawHtml, url, filter);
    return JSON.stringify({ links, count: links.length });
  },

  save_routes: async ({ routes, source_name }) => {
    console.log(`  ↓ save_routes: ${routes?.length ?? 0} маршрутов от "${source_name}"`);
    const result = await saveRoutesToDB(routes, source_name);
    return JSON.stringify(result);
  },

  get_stats: async () => {
    console.log(`  ↓ get_stats`);
    const stats = await getDBStats();
    return JSON.stringify(stats);
  },
};

// ─────────────────────────────────────────────────────────────
// Вызов Anthropic API (raw fetch — паттерн crew-agents.ts)
// ─────────────────────────────────────────────────────────────

async function callClaude(messages, system) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-api-key':       ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 4096,
      system,
      tools:      TOOLS,
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────
// AGENT LOOP (паттерн s01_agent_loop.py)
// ─────────────────────────────────────────────────────────────

async function agentLoop(task, system) {
  const messages = [{ role: 'user', content: task }];
  let round = 0;

  while (true) {
    round++;
    console.log(`\n[Агент] Раунд ${round}...`);

    const response = await callClaude(messages, system);

    // Добавляем ответ ассистента
    messages.push({ role: 'assistant', content: response.content });

    // Если нет tool_use — агент завершил работу
    if (response.stop_reason !== 'tool_use') {
      const finalText = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('\n');
      if (finalText) console.log('\n[Итог]\n' + finalText);
      break;
    }

    // Выполняем инструменты и собираем результаты
    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;

      console.log(`  [tool] ${block.name}(${JSON.stringify(block.input).slice(0, 80)}...)`);
      const handler = TOOL_HANDLERS[block.name];
      let output;
      try {
        output = handler ? await handler(block.input) : `Unknown tool: ${block.name}`;
      } catch (e) {
        output = `Error: ${e.message}`;
      }

      toolResults.push({
        type:        'tool_result',
        tool_use_id: block.id,
        content:     typeof output === 'string' ? output : JSON.stringify(output),
      });
    }

    // Кормим результаты обратно как user-сообщение
    messages.push({ role: 'user', content: toolResults });

    // Защита от бесконечного цикла
    if (round >= 40) {
      console.log('[Агент] Достигнут лимит раундов (40). Завершение.');
      break;
    }
  }

  return messages;
}

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT (задание для агента)
// ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ты агент-скрапер туристических маршрутов Камчатки.
Твоя задача — найти и сохранить маршруты с туристических сайтов в базу данных.

ЦЕЛЕВЫЕ САЙТЫ:
1. https://visitkamchatka.ru — официальный туристический портал
2. https://www.russiadiscovery.ru/tours/?region=kamchatka — каталог туров
3. https://kamchatkatravel.net — туры и маршруты
4. https://www.kamtravel.ru — камчатские туры

КАТЕГОРИИ (используй точно эти значения):
- vulkani — восхождения, вулканы
- rybalka — рыболовные туры
- termalnye_istochniki — горячие источники, термы
- snegohod — снегоходные туры
- dzhip — джип-туры, вездеходы
- trekking — пешие маршруты, треккинг
- medvedi — наблюдение за медведями
- geyzery — Долина гейзеров
- eco — экологические туры
- mountains — горные маршруты (не вулканы)
- rivers — сплавы по рекам
- lakes — маршруты к озёрам
- morskie_progulki — морские прогулки
- vertoletnye_tury — вертолётные туры

ПРАВИЛА:
1. Сначала вызови get_stats — посмотри что уже есть в БД
2. Открывай главную страницу сайта через fetch_url
3. Ищи ссылки на страницы туров/маршрутов через extract_links (фильтр: tour, marshrut, route, trek)
4. Открывай каждую страницу маршрута и извлекай данные
5. Сохраняй пачками через save_routes (5-10 штук за раз)
6. Переходи к следующему сайту
7. Итог: сколько маршрутов добавлено/пропущено

ВАЖНО:
- title: конкретное название маршрута (не "Туры на Камчатку")
- description: до 300 символов
- source_url: прямая ссылка на страницу маршрута
- Не дублируй, если маршрут уже есть по названию и источнику`;

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
  if (STATS_ONLY) {
    const stats = await getDBStats();
    console.log('\n📊 Статистика agent_route_knowledge:');
    console.log(`Всего маршрутов: ${stats.total}`);
    console.log('По категориям:');
    for (const [cat, cnt] of Object.entries(stats.by_category)) {
      console.log(`  ${cat}: ${cnt}`);
    }
    await pool.end();
    return;
  }

  console.log('🤖 Скрапер-агент маршрутов Камчатки');
  console.log(`Модель: ${MODEL}`);
  if (DRY_RUN) console.log('⚠️  DRY RUN — в БД не пишем');
  console.log('─'.repeat(50));

  const task = `Начни скрапинг туристических маршрутов Камчатки.
Сначала проверь статистику БД (get_stats), потом последовательно обходи сайты начиная с visitkamchatka.ru.
Найди и сохрани как можно больше конкретных маршрутов с названиями, описаниями и ссылками.`;

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
