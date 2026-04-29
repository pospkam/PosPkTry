#!/usr/bin/env node
/**
 * scripts/scrape-routes-brightdata.js
 *
 * Mass scraper for Kamchatka tourist routes using Bright Data Web Unlocker API.
 * Reads pages as markdown, extracts structured route data, saves to agent_route_knowledge.
 *
 * Usage:
 *   node scripts/scrape-routes-brightdata.js                   -- scrape all sources
 *   node scripts/scrape-routes-brightdata.js --dry-run         -- no DB writes
 *   node scripts/scrape-routes-brightdata.js --stats           -- DB stats only
 *   node scripts/scrape-routes-brightdata.js --source=kamchatkaland  -- single source
 */

'use strict';

const { JSDOM } = require('jsdom');
const { Pool } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Suppress JSDOM CSS parse warnings
const origConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Could not parse CSS')) return;
  origConsoleError(...args);
};

// ── Load .env.local ──────────────────────────────────────────
function loadDotEnv() {
  for (const f of ['.env.local', '.env']) {
    const full = path.resolve(process.cwd(), f);
    if (fs.existsSync(full)) {
      fs.readFileSync(full, 'utf8').split('\n').forEach(line => {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        }
      });
      break;
    }
  }
}
loadDotEnv();

const BRIGHTDATA_API_TOKEN = process.env.BRIGHTDATA_API_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;
const DRY_RUN = process.argv.includes('--dry-run');
const STATS_ONLY = process.argv.includes('--stats');
const SOURCE_ARG = process.argv.find(a => a.startsWith('--source='))?.split('=')[1];

if (!BRIGHTDATA_API_TOKEN && !STATS_ONLY) {
  console.log('BRIGHTDATA_API_TOKEN not set -- using direct fetch mode');
}
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

// ── PostgreSQL ───────────────────────────────────────────────
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=no-verify') ? { rejectUnauthorized: false } : undefined,
  max: 3,
});

// ── Category detection ────────────────────────────────────────
const CATEGORY_RULES = [
  { cat: 'vulkani', re: /вулкан|volcano|eruption|лавов|кратер|магма|авачинск|корякск|мутновск|горелый/i },
  { cat: 'geyzery', re: /гейзер|geyser|долина гейзеров/i },
  { cat: 'termalnye_istochniki', re: /терм|горячий источник|горячие источник|горячие ключ|hot spring/i },
  { cat: 'medvedi', re: /медвед|медвежий|bear watch/i },
  { cat: 'rybalka', re: /рыбалк|рыбн|fishing|лосось|salmon|нерест|форель|хариус/i },
  { cat: 'snegohod', re: /снегоход|snowmobile/i },
  { cat: 'vertoletnye_tury', re: /вертолет|вертолётн|helicopter/i },
  { cat: 'morskie_progulki', re: /морск|яхт|кит|whale|круиз|дельфин|акватор|бухт/i },
  { cat: 'rivers', re: /сплав|рафтинг|kayak|каяк|рек[еиу]/i },
  { cat: 'lakes', re: /озеро|озёр|кальдера|lake|курильское/i },
  { cat: 'mountains', re: /перевал|вершин|хребет|восхожден/i },
  { cat: 'trekking', re: /трекинг|hiking|пешеход|поход|хайк|trek/i },
  { cat: 'dzhip', re: /джип|jeep|вездеход|внедорожник|4x4/i },
  { cat: 'eco', re: /экотур|wildlife|природ|заповедник/i },
];

function detectCategory(text) {
  for (const { cat, re } of CATEGORY_RULES) {
    if (re.test(text)) return cat;
  }
  return 'eco';
}

// ── Dedupe key ───────────────────────────────────────────────
function makeDedupeKey(sourceUrl, title) {
  try {
    const hostname = new URL(sourceUrl).hostname;
    const slug = title.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 80);
    return `${hostname}:${slug}`;
  } catch {
    return crypto.createHash('md5').update(sourceUrl + title).digest('hex');
  }
}

function normTitle(t) {
  return (t || '').trim().toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Bright Data: scrape URL as markdown ──────────────────────
async function scrapeAsMarkdown(url, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BRIGHTDATA_API_TOKEN}`,
      },
      body: JSON.stringify({
        zone: 'mcp_unlocker',
        url,
        format: 'raw',
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { error: `BD HTTP ${res.status}`, url };
    }
    const html = await res.text();
    return { html, url: res.url || url, length: html.length };
  } catch (e) {
    clearTimeout(timer);
    return { error: String(e.message || e), url };
  }
}

// ── Fallback: direct fetch with UA ───────────────────────────
async function fetchDirect(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { error: `HTTP ${res.status}`, url };
    const html = await res.text();
    return { html, url: res.url || url, length: html.length };
  } catch (e) {
    clearTimeout(timer);
    return { error: String(e.message || e), url };
  }
}

// ── Smart fetch: try Bright Data if token available, otherwise direct ─
async function smartFetch(url) {
  if (BRIGHTDATA_API_TOKEN) {
    const bd = await scrapeAsMarkdown(url);
    if (!bd.error) return bd;
    console.log(`    BD failed (${bd.error}), trying direct...`);
  }
  return fetchDirect(url);
}

// ── Fetch with DDoSGuard bypass (two-step cookie handshake) ──
async function fetchWithDDGBypass(url, timeoutMs = 15000) {
  const HDRS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
  };
  // Step 1: fire first request just to collect DDG session cookies
  const cookies = {};
  try {
    const r1 = await fetch(url, { signal: AbortSignal.timeout(10000), headers: HDRS });
    for (const [k, v] of r1.headers.entries()) {
      if (k.toLowerCase() === 'set-cookie') {
        const m = v.match(/^([^=]+)=([^;]+)/);
        if (m) cookies[m[1].trim()] = m[2].trim();
      }
    }
  } catch { /* ignore challenge response */ }
  // Step 2: real request with cookies
  const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r2 = await fetch(url, {
      signal: ctrl.signal,
      headers: { ...HDRS, ...(cookieStr ? { Cookie: cookieStr } : {}) },
    });
    clearTimeout(timer);
    if (!r2.ok) return { error: `HTTP ${r2.status}`, url };
    const html = await r2.text();
    return { html, url: r2.url || url, length: html.length };
  } catch (e) {
    clearTimeout(timer);
    return { error: String(e.message || e), url };
  }
}

// ── HTML parsing helpers ─────────────────────────────────────
function htmlToText(html, maxLen = 8000) {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    for (const el of doc.querySelectorAll('script,style,noscript,svg,iframe,header,footer,nav')) {
      el.remove();
    }
    return (doc.body?.textContent ?? '').replace(/\s{3,}/g, '\n\n').trim().slice(0, maxLen);
  } catch {
    return String(html).slice(0, maxLen);
  }
}

function extractLinks(html, baseUrl, filterFn) {
  const links = new Set();
  try {
    const dom = new JSDOM(html, { url: baseUrl });
    const base = new URL(baseUrl);
    for (const a of dom.window.document.querySelectorAll('a[href]')) {
      try {
        const href = new URL(a.href, baseUrl);
        if (href.hostname === base.hostname &&
            !href.href.match(/\.(pdf|jpg|png|gif|zip|doc|css|js|ico|woff)$/i) &&
            filterFn(href.pathname)) {
          links.add(href.href.replace(/#.*$/, ''));
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return [...links];
}

function parseGenericPage(html, url) {
  let doc;
  try { doc = new JSDOM(html, { url }).window.document; } catch { return null; }
  const h1 = doc.querySelector('h1');
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  const title = (h1?.textContent ?? ogTitle?.content ?? '').trim().slice(0, 120);
  if (!title || title.length < 5) return null;
  // Skip generic pages
  if (/главная|контакт|о нас|о компании|оплата|доставка|политика|вакансии|новости|блог|отзывы$/i.test(title)) return null;
  const ogDesc = doc.querySelector('meta[property="og:description"]');
  const metaDesc = doc.querySelector('meta[name="description"]');
  const firstP = [...doc.querySelectorAll('p')].find(p => p.textContent.trim().length > 40);
  const desc = (ogDesc?.content ?? metaDesc?.content ?? firstP?.textContent ?? '').trim().slice(0, 300);
  // Extract coordinates
  const fullText = doc.body?.textContent ?? '';
  const coordMatch = fullText.match(/(\d{2,3}\.\d{4,})[,\s]+(\d{2,3}\.\d{4,})/);
  let lat = null, lng = null;
  if (coordMatch) {
    const a = parseFloat(coordMatch[1]);
    const b = parseFloat(coordMatch[2]);
    // Kamchatka: lat ~50-60, lng ~155-165
    if (a >= 50 && a <= 62 && b >= 155 && b <= 170) { lat = a; lng = b; }
    else if (b >= 50 && b <= 62 && a >= 155 && a <= 170) { lat = b; lng = a; }
  }
  return {
    title,
    description: desc || null,
    category: detectCategory(title + ' ' + (desc || '')),
    source_url: url,
    lat,
    lng,
  };
}

// ── Extract enrichment from page text ────────────────────────
function extractEnrichment(text) {
  const extra = {};
  // Duration
  const durMatch = text.match(/(\d+)\s*(дн|день|дней|суток)/i) ||
                   text.match(/(\d+)\s*(час|часа|часов)/i) ||
                   text.match(/(Целый день|Несколько часов|Несколько дней)/i);
  if (durMatch) extra.duration = durMatch[0].trim();
  // Difficulty
  if (/экстремальн|крайне сложн/i.test(text)) extra.difficulty = 'extreme';
  else if (/сложн|тяжел|advanced/i.test(text)) extra.difficulty = 'hard';
  else if (/средн|moderate|умеренн/i.test(text)) extra.difficulty = 'medium';
  else if (/лёгк|легк|простой|начинающ|easy/i.test(text)) extra.difficulty = 'easy';
  // Season
  const seasonMatch = text.match(/(июн[ья]?\s*[-–]\s*сентябр[ья]?|июл[ья]?\s*[-–]\s*август|круглогодичн|зимний|летний|с\s+\w+\s+по\s+\w+)/i);
  if (seasonMatch) extra.season = seasonMatch[0].trim();
  // Price
  const priceMatch = text.match(/(\d[\d\s]*)\s*(руб|₽|р\.)/i);
  if (priceMatch) {
    const price = parseInt(priceMatch[1].replace(/\s/g, ''), 10);
    if (price >= 500 && price <= 5000000) extra.price_from = price;
  }
  // Altitude
  const altMatch = text.match(/(\d{3,5})\s*(м\s+над|метр|м\.?\s*н\.?\s*у\.?\s*м)/i);
  if (altMatch) {
    const alt = parseInt(altMatch[1], 10);
    if (alt >= 100 && alt <= 5000) extra.altitude = alt;
  }
  // Group size
  const groupMatch = text.match(/(?:до|max|группа[^.]{0,20}?)\s*(\d{1,3})\s*(?:человек|чел|person)/i);
  if (groupMatch) extra.group_size_max = parseInt(groupMatch[1], 10);
  return extra;
}

// ── DB: filter existing routes ───────────────────────────────
async function filterNewRoutes(routes) {
  if (!routes?.length) return [];
  const client = await pool.connect();
  try {
    const keys = routes.map(r => makeDedupeKey(r.source_url, r.title));
    const normTitles = routes.map(r => normTitle(r.title));
    const resKeys = await client.query(
      'SELECT route_dedupe_key FROM agent_route_knowledge WHERE route_dedupe_key = ANY($1)',
      [keys]
    );
    const existingKeys = new Set(resKeys.rows.map(r => r.route_dedupe_key));
    const resTitles = await client.query(
      `SELECT lower(regexp_replace(translate(title,'ё','е'),'[^а-яa-z0-9]+',' ','g')) AS nt
       FROM agent_route_knowledge`
    );
    const existingNormTitles = new Set(resTitles.rows.map(r => (r.nt || '').trim()));
    return routes.filter((r, i) =>
      !existingKeys.has(keys[i]) && !existingNormTitles.has(normTitles[i])
    );
  } finally { client.release(); }
}

// ── DB: save new routes ──────────────────────────────────────
async function saveNewRoutes(routes, sourceName) {
  if (!routes?.length) return { saved: 0, skipped: 0 };
  const newRoutes = await filterNewRoutes(routes);
  const alreadyExists = routes.length - newRoutes.length;
  if (!newRoutes.length) {
    return { saved: 0, skipped: routes.length, already_in_db: alreadyExists };
  }
  if (DRY_RUN) {
    console.log(`  [dry-run] New routes: ${newRoutes.map(r => r.title).join(' | ')}`);
    return { saved: 0, skipped: routes.length, new_found: newRoutes.length, already_in_db: alreadyExists, dry_run: true };
  }
  let saved = 0, skipped = 0;
  const client = await pool.connect();
  try {
    for (const r of newRoutes) {
      if (!r.title?.trim() || !r.category || !r.source_url) { skipped++; continue; }
      const dedupeKey = makeDedupeKey(r.source_url, r.title);
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
          dedupeKey, r.category, r.title.trim(), r.description ?? null,
          r.lat ?? null, r.lng ?? null, r.source_url,
          sourceName ?? new URL(r.source_url).hostname,
          searchText, JSON.stringify(r.extra ?? {}), sourceHash,
        ]);
        saved++;
      } catch { skipped++; }
    }
  } finally { client.release(); }
  return { saved, skipped, already_in_db: alreadyExists, total_checked: routes.length };
}

// ── DB: stats ────────────────────────────────────────────────
async function getDBStats() {
  const client = await pool.connect();
  try {
    const res = await client.query(
      'SELECT category, COUNT(*) as cnt FROM agent_route_knowledge GROUP BY category ORDER BY cnt DESC'
    );
    const total = await client.query('SELECT COUNT(*) AS n FROM agent_route_knowledge');
    return {
      total: Number(total.rows[0]?.n ?? 0),
      by_category: Object.fromEntries(res.rows.map(r => [r.category, Number(r.cnt)])),
    };
  } finally { client.release(); }
}

// ── GraphQL scraper: zimaletokamchatka.ru ────────────────────
const ZIMALET_CAT_MAP = {
  'Рыбалка': 'rybalka', 'Пешая прогулка': 'trekking', 'Сплав': 'rivers',
  'Термальные источники': 'termalnye_istochniki', 'Этнокультурный туризм': 'eco',
  'Морская прогулка': 'morskie_progulki', 'Конная прогулка': 'eco',
  'Восхождение': 'mountains', 'На джипе': 'dzhip', 'Обзорная экскурсия': 'eco',
};

async function scrapeZimaletokamchatkaGraphQL() {
  console.log('  Fetching via GraphQL API...');
  try {
    const res = await fetch('https://app.zimaletokamchatka.ru/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 Chrome/124.0.0.0',
        'Origin': 'https://zimaletokamchatka.ru',
      },
      body: JSON.stringify({ query: `{
        tours    { name alias summary categories { name } }
        programs { name alias summary categories { name } }
        charters { name alias summary categories { name } }
      }` }),
    });
    if (!res.ok) { console.log(`  GraphQL HTTP ${res.status}`); return []; }
    const data = await res.json();
    const tours = (data.data?.tours || []).map(t => ({ ...t, _type: 'tours' }));
    const programs = (data.data?.programs || []).map(t => ({ ...t, _type: 'programs' }));
    const charters = (data.data?.charters || []).map(t => ({ ...t, _type: 'charters' }));
    const all = [...tours, ...programs, ...charters].filter(t => t.name && t.alias);
    console.log(`  GraphQL returned ${all.length} items`);
    return all.map(t => {
      let cat = 'eco';
      for (const c of (t.categories || [])) {
        if (ZIMALET_CAT_MAP[c.name]) { cat = ZIMALET_CAT_MAP[c.name]; break; }
      }
      if (cat === 'eco') cat = detectCategory(t.name);
      return {
        title: t.name.trim().slice(0, 200),
        description: (t.summary || '').trim().slice(0, 300) || null,
        category: cat,
        source_url: `https://zimaletokamchatka.ru/${t._type}/${t.alias}`,
      };
    });
  } catch (e) {
    console.log(`  GraphQL error: ${e.message}`);
    return [];
  }
}

// ── Custom scraper: morskoyblyuz.ru (Tilda one-pager, DDoSGuard) ─
async function scrapeMorskoyblyuz() {
  console.log('  Fetching with DDoSGuard bypass...');
  const result = await fetchWithDDGBypass('https://morskoyblyuz.ru/');
  if (result.error || (result.length ?? 0) < 50000) {
    console.log(`  Failed: ${result.error || 'response too small'}`);
    return [];
  }
  let doc;
  try { doc = new JSDOM(result.html, { url: 'https://morskoyblyuz.ru/' }).window.document; } catch { return []; }
  const routes = [];
  const seen = new Set();
  for (const h of doc.querySelectorAll('h1,h2,h3')) {
    const title = h.textContent.trim().replace(/\s+/g, ' ');
    if (title.length < 10 || title.length > 150) continue;
    if (seen.has(title.toLowerCase())) continue;
    // Skip non-route headings (CTA, contacts, about)
    if (/телефон|звоните|контакт|форма|запис|отправ|нажим|согласи|конфиден|наши услуг|почему|оплат|доставк/i.test(title)) continue;
    // Keep only headings that name a route/excursion
    if (!/прогулк|экскурс|поход|бухт|остров|скал|маршрут|вулкан|рыбалк|кит|тур|сафари/i.test(title)) continue;
    seen.add(title.toLowerCase());
    // Grab first substantial paragraph after this heading
    let desc = '';
    let next = h.nextElementSibling;
    for (let i = 0; i < 5 && next && !desc; i++) {
      const t = next.textContent.trim().replace(/\s+/g, ' ');
      if (t.length > 40) desc = t.slice(0, 300);
      next = next.nextElementSibling;
    }
    routes.push({
      title,
      description: desc || null,
      category: detectCategory(title + ' ' + desc),
      source_url: 'https://morskoyblyuz.ru/',
    });
  }
  console.log(`  Parsed ${routes.length} routes from Tilda page`);
  return routes;
}

// ── Custom scraper: volcanoesland.ru (Bitrix, h1 has breadcrumb) ─
async function scrapeVolcanoesland() {
  const BASE = 'https://volcanoesland.ru';
  const LISTING_URLS = [
    `${BASE}/tours/`,
    `${BASE}/tours/?types=47&filter=Y`,
    `${BASE}/tours/?types=48&filter=Y`,
    `${BASE}/tours/?types=49&filter=Y`,
    `${BASE}/tours/?types=50&filter=Y`,
  ];
  // Collect all tour page URLs
  const tourLinks = new Set();
  for (const url of LISTING_URLS) {
    const res = await smartFetch(url);
    if (res.error) { console.log(`  listing failed: ${url}`); continue; }
    extractLinks(res.html, url, (p) => /^\/tours\/[a-z0-9-]+\/?$/i.test(p) && p !== '/tours/')
      .forEach(l => tourLinks.add(l));
    await sleep(700);
  }
  console.log(`  Found ${tourLinks.size} unique tour pages`);
  // Parse each tour page — title from <title> tag, not h1 (which has breadcrumb)
  const routes = [];
  for (const tourUrl of tourLinks) {
    await sleep(600);
    const res = await smartFetch(tourUrl);
    if (res.error) continue;
    let doc;
    try { doc = new JSDOM(res.html, { url: tourUrl }).window.document; } catch { continue; }
    // Title: from <title> tag, strip trailing site name
    const pageTitle = (doc.querySelector('title')?.textContent ?? '')
      .replace(/\s*[|–—-]\s*[^|–—-]{3,}$/, '').trim().slice(0, 120);
    if (!pageTitle || pageTitle.length < 5) continue;
    // Description: og:description or first long <p>
    const ogDesc = doc.querySelector('meta[property="og:description"]');
    const metaDesc = doc.querySelector('meta[name="description"]');
    const firstP = [...doc.querySelectorAll('p')].find(p => p.textContent.trim().length > 40);
    const desc = (ogDesc?.content ?? metaDesc?.content ?? firstP?.textContent ?? '').trim().slice(0, 300) || null;
    // Coords
    const fullText = doc.body?.textContent ?? '';
    const cm = fullText.match(/(\d{2,3}\.\d{4,})[,\s]+(\d{2,3}\.\d{4,})/);
    let lat = null, lng = null;
    if (cm) {
      const a = parseFloat(cm[1]), b = parseFloat(cm[2]);
      if (a >= 50 && a <= 62 && b >= 155 && b <= 170) { lat = a; lng = b; }
      else if (b >= 50 && b <= 62 && a >= 155 && a <= 170) { lat = b; lng = a; }
    }
    const extra = extractEnrichment(htmlToText(res.html));
    routes.push({ title: pageTitle, description: desc, category: detectCategory(pageTitle + ' ' + (desc ?? '')), source_url: tourUrl, lat, lng, extra });
    console.log(`    + ${pageTitle.slice(0, 60)} [${routes[routes.length-1].category}]`);
  }
  return routes;
}

// ── Source definitions ────────────────────────────────────────
// Tested 2026-03-14. Working with direct fetch (no headless browser).
// Sources that need JS rendering are marked needsBrowser: true (skipped in direct mode).
const SOURCES = {
  kamchatintour: {
    name: 'kamchatintour.ru',
    startUrls: [
      'https://kamchatintour.ru/tours/',
      'https://kamchatintour.ru/tours/?PAGEN_1=2',
      'https://kamchatintour.ru/tours/?PAGEN_1=3',
    ],
    linkFilter: (p) => {
      const CATS = new Set(['vulkany','rybalka','vertoletnye','trekking','morskie','zima','leto','individualnye-tury','gruppovye-tury']);
      const m = p.match(/^\/tours\/([^/]+)\/?$/);
      return !!(m && !CATS.has(m[1]));
    },
  },
  vpoxod: {
    name: 'vpoxod.ru',
    startUrls: ['https://www.vpoxod.ru/route/kamchatka'],
    linkFilter: (p) => /^\/route\/kamchatka\/[a-z0-9-]+$/i.test(p) && !/faq|gallery|responses|map/i.test(p),
  },
  kamchatkatravel: {
    name: 'kamchatkatravel.net',
    startUrls: ['https://kamchatkatravel.net/'],
    linkFilter: (p) => {
      const SKIP = new Set(['/','/o-kompanii','/o-kamchatke','/kamchatka','/kamchatka-tury-ceny',
        '/kak-oplatit-tur-na-kamchatku','/links','/sitemap','/soglashenie','/hotels',
        '/poleznoe-o-kamchatke','/turizm-i-otdyh-na-kamchatke','/spisok-snaryazheniya','/tury-na-kamchatku-iz-moskvy']);
      return /^\/[a-z0-9-]+\/?$/i.test(p) && !SKIP.has(p.replace(/\/$/,''));
    },
  },
  mestechkokam: {
    name: 'mestechkokam.ru',
    startUrls: ['https://mestechkokam.ru/katalog-ekskursij/'],
    linkFilter: (p) => /^\/ekskursii\/[a-z0-9-]+\/[a-z0-9-]+\/?$/i.test(p),
  },
  kamcha10: {
    name: 'kamcha10.ru',
    startUrls: [
      'https://kamcha10.ru/',
      'https://kamcha10.ru/category/blog/chto-posmotret/',
      'https://kamcha10.ru/morskie-progulki-na-kamchatke/',
    ],
    linkFilter: (p) => {
      if (/vladivostok|sahalin|millionka|russkij-most|zolotoj-most|\/otel-|strahovka|o-sajte|kontakty|karta-|\/avia|moskva|kamchatka-v-|kogda-ehat|mozhno-li|pogoda|\/page\/|\/category\/|\/tag\//i.test(p)) return false;
      return /^\/[a-z][a-z0-9-]{4,}\/?$/i.test(p);
    },
  },
  morskoyblyuz: {
    name: 'morskoyblyuz.ru',
    startUrls: [],
    linkFilter: () => false,
    customScraper: scrapeMorskoyblyuz,
  },
  tokamchatka: {
    name: 'tokamchatka.ru',
    startUrls: [
      'https://tokamchatka.ru/',
      'https://tokamchatka.ru/tours.shtm',
    ],
    linkFilter: (p) => {
      // Skip known meta/info/service pages
      if (/^\/(contacts|agentstvam|karta-sayta|korporativ|o-kamchatke|refer|tour_dates|tours|turistam|zakaz_tura|oper|kamchatka_|kamchatka-glazami|sov_|gostinitsa|apatr_|baza-|map_|tourism|zap-i-parki|favicon|t\/|g\/)/.test(p)) return false;
      // Accept numbered tour pages: /tour01.shtm etc.
      if (/^\/tour\d+\.shtm?$/i.test(p)) return true;
      // Accept named .shtm pages that are not excluded above
      if (/^\/[a-z][a-z0-9_-]+\.shtm?$/i.test(p)) return true;
      // Accept clean slug pages (no extension)
      if (/^\/[a-z][a-z0-9-]{3,}$/i.test(p)) return true;
      return false;
    },
  },
  // GraphQL source — no HTML scraping needed
  zimaletokamchatka: {
    name: 'zimaletokamchatka.ru',
    startUrls: [],
    linkFilter: () => false,
    customScraper: scrapeZimaletokamchatkaGraphQL,
  },
  volcanoesland: {
    name: 'volcanoesland.ru',
    startUrls: [],
    linkFilter: () => false,
    customScraper: scrapeVolcanoesland,
  },
  sputnik8: {
    name: 'sputnik8.com',
    startUrls: ['https://www.sputnik8.com/ru/kamchatka'],
    linkFilter: (p) => /^\/ru\/kamchatka\/activities\/[a-z0-9][a-z0-9-]+$/i.test(p),
  },
  // --- JS-rendered sites (need headless browser in future) ---
  russiadiscovery: {
    name: 'russiadiscovery.ru',
    startUrls: [
      'https://www.russiadiscovery.ru/regions/kamchatka/',
      'https://www.russiadiscovery.ru/tours/?region=kamchatka',
    ],
    linkFilter: (p) => /^\/tours\/[a-z0-9-]*kamchatk[a-z0-9-]*\/?$/i.test(p),
  },
  visitkamchatka: {
    name: 'visitkamchatka.ru',
    needsBrowser: true,
    startUrls: ['https://visitkamchatka.ru/'],
    linkFilter: (p) => /\/(marshrut|tur|dostoprimechatelnost|ekskursi)[a-z]*\/[^/]+/i.test(p),
  },
  kamchatkaland: {
    name: 'kamchatkaland.ru',
    needsBrowser: true,
    startUrls: ['https://kamchatkaland.ru/'],
    linkFilter: (p) => /\/(catalog|tour|program)[a-z]*\/[^/]+/i.test(p),
  },
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Scrape a single source ───────────────────────────────────
async function scrapeSource(sourceKey) {
  const source = SOURCES[sourceKey];
  if (!source) {
    console.log(`  Unknown source: ${sourceKey}`);
    return { saved: 0, skipped: 0 };
  }

  console.log(`\n--- ${source.name} ---`);

  // Custom scraper (e.g. GraphQL)
  if (source.customScraper) {
    const routes = await source.customScraper();
    if (!routes.length) {
      console.log('  No routes from custom scraper');
      return { saved: 0, skipped: 0, source: source.name };
    }
    console.log(`  Custom scraper returned ${routes.length} routes`);
    const result = await saveNewRoutes(routes, source.name);
    console.log(`  Saved: ${result.saved}, already in DB: ${result.already_in_db ?? 0}`);
    return { ...result, source: source.name };
  }

  // Skip JS-rendered sites when no Bright Data proxy available
  if (source.needsBrowser && !BRIGHTDATA_API_TOKEN) {
    console.log('  Skipped: requires JS rendering (set BRIGHTDATA_API_TOKEN or add Playwright)');
    return { saved: 0, skipped: 0, source: source.name };
  }

  // Standard HTML scraper
  const allTourLinks = new Set();

  // Phase 1: collect tour page links from listing pages
  for (const startUrl of source.startUrls) {
    console.log(`  Fetching listing: ${startUrl}`);
    const res = await smartFetch(startUrl);
    if (res.error) {
      console.log(`    Failed: ${res.error}`);
      continue;
    }
    const links = extractLinks(res.html, startUrl, source.linkFilter);
    links.forEach(l => allTourLinks.add(l));
    console.log(`    Found ${links.length} tour links`);
    await sleep(800);
  }

  if (allTourLinks.size === 0) {
    console.log('  No tour links found');
    return { saved: 0, skipped: 0, source: source.name };
  }
  console.log(`  Total unique tour links: ${allTourLinks.size}`);

  // Phase 2: fetch each tour page and extract data
  const routes = [];
  let fetched = 0;
  for (const tourUrl of allTourLinks) {
    if (fetched >= 100) { console.log('  Reached 100 pages limit'); break; }
    await sleep(600);
    const res = await smartFetch(tourUrl);
    if (res.error) { continue; }
    fetched++;
    const route = parseGenericPage(res.html, tourUrl);
    if (!route?.title) continue;
    // Extract enrichment data
    const fullText = htmlToText(res.html);
    route.extra = extractEnrichment(fullText);
    routes.push(route);
    console.log(`    + ${route.title.slice(0, 55)} [${route.category}]`);
  }

  console.log(`  Parsed ${routes.length} routes from ${fetched} pages`);

  // Phase 3: save to DB
  const result = await saveNewRoutes(routes, source.name);
  console.log(`  Saved: ${result.saved}, already in DB: ${result.already_in_db ?? 0}`);
  return { ...result, source: source.name };
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  if (STATS_ONLY) {
    const s = await getDBStats();
    console.log(`\nRoutes in agent_route_knowledge: ${s.total}`);
    console.log('By category:');
    for (const [cat, cnt] of Object.entries(s.by_category)) {
      console.log(`  ${cat.padEnd(26)}: ${cnt}`);
    }
    await pool.end();
    return;
  }

  console.log('Bright Data Route Scraper');
  console.log(`Sources: ${SOURCE_ARG || 'all'}`);
  if (DRY_RUN) console.log('DRY RUN - no DB writes');
  console.log('-'.repeat(55));

  const statsBefore = await getDBStats();
  console.log(`DB before: ${statsBefore.total} routes`);

  let totalSaved = 0, totalExisting = 0;
  const sourceKeys = SOURCE_ARG ? [SOURCE_ARG] : Object.keys(SOURCES);

  for (const key of sourceKeys) {
    try {
      const result = await scrapeSource(key);
      totalSaved += result.saved ?? 0;
      totalExisting += result.already_in_db ?? 0;
    } catch (e) {
      console.error(`  Error scraping ${key}: ${e.message}`);
    }
  }

  const statsAfter = await getDBStats();
  console.log('\n' + '='.repeat(55));
  console.log(`Result: ${statsBefore.total} -> ${statsAfter.total} routes`);
  console.log(`  New: ${totalSaved}  |  Already existed: ${totalExisting}`);

  await pool.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
