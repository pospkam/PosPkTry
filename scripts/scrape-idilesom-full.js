#!/usr/bin/env node
/**
 * scripts/scrape-idilesom-full.js
 *
 * Full scraper for idilesom.com/kam/places — all pages via AJAX pagination.
 * Fetches ~331 places with coordinates, descriptions, difficulty, duration.
 * Saves directly to agent_route_knowledge with deduplication.
 *
 * Usage:
 *   node scripts/scrape-idilesom-full.js              -- scrape all pages
 *   node scripts/scrape-idilesom-full.js --dry-run    -- no DB writes
 *   node scripts/scrape-idilesom-full.js --stats      -- DB stats only
 *   node scripts/scrape-idilesom-full.js --limit=5    -- max pages
 */

'use strict';

const { JSDOM } = require('jsdom');
const { Pool } = require('pg');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Suppress JSDOM CSS warnings
const origErr = console.error;
console.error = (...a) => { if (typeof a[0] === 'string' && a[0].includes('Could not parse CSS')) return; origErr(...a); };

// ── Load .env.local ──────────────────────────────────────────
function loadDotEnv() {
  for (const f of ['.env.local', '.env']) {
    const full = path.resolve(process.cwd(), f);
    if (fs.existsSync(full)) {
      fs.readFileSync(full, 'utf8').split('\n').forEach(line => {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      });
      break;
    }
  }
}
loadDotEnv();

const DATABASE_URL = process.env.DATABASE_URL;
const DRY_RUN = process.argv.includes('--dry-run');
const STATS_ONLY = process.argv.includes('--stats');
const MAX_PAGES = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '50', 10);

if (!DATABASE_URL) { console.error('DATABASE_URL is not set'); process.exit(1); }

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=no-verify') ? { rejectUnauthorized: false } : undefined,
  max: 3,
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── HTTP fetch ───────────────────────────────────────────────
async function fetchUrl(url, headers = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        ...headers,
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return { data: await res.text() };
  } catch (e) {
    clearTimeout(timer);
    return { error: String(e.message || e) };
  }
}

// ── Category detection ───────────────────────────────────────
const CATEGORY_RULES = [
  { cat: 'vulkani', re: /вулкан|volcano|кратер|лавов|магма/i },
  { cat: 'geyzery', re: /гейзер|geyser|долина гейзеров/i },
  { cat: 'termalnye_istochniki', re: /терм|горячий источник|горячие источник|горячие ключ/i },
  { cat: 'medvedi', re: /медвед|медвежий|bear/i },
  { cat: 'rybalka', re: /рыбалк|рыбн|fishing|лосось|нерест/i },
  { cat: 'snegohod', re: /снегоход|snowmobile/i },
  { cat: 'vertoletnye_tury', re: /вертолет|вертолётн|helicopter/i },
  { cat: 'morskie_progulki', re: /морск|яхт|кит|бухт|океан|берег|пляж|мыс|остров/i },
  { cat: 'rivers', re: /сплав|рафтинг|каяк|река|рек[еи]/i },
  { cat: 'lakes', re: /озеро|озёр|кальдера|lake/i },
  { cat: 'mountains', re: /перевал|вершин|хребет|восхожден|гора |горн/i },
  { cat: 'trekking', re: /трекинг|hiking|пешеход|поход|маршрут/i },
  { cat: 'dzhip', re: /джип|jeep|вездеход/i },
];

function detectCategory(text) {
  for (const { cat, re } of CATEGORY_RULES) {
    if (re.test(text)) return cat;
  }
  return 'eco';
}

// ── Dedupe ───────────────────────────────────────────────────
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

// ── DB operations ────────────────────────────────────────────
async function filterNewRoutes(routes) {
  if (!routes?.length) return [];
  const client = await pool.connect();
  try {
    const keys = routes.map(r => makeDedupeKey(r.source_url, r.title));
    const normTitles = routes.map(r => normTitle(r.title));
    const resKeys = await client.query(
      'SELECT route_dedupe_key FROM agent_route_knowledge WHERE route_dedupe_key = ANY($1)', [keys]
    );
    const existingKeys = new Set(resKeys.rows.map(r => r.route_dedupe_key));
    const resTitles = await client.query(
      `SELECT lower(regexp_replace(translate(title,'ё','е'),'[^а-яa-z0-9]+',' ','g')) AS nt FROM agent_route_knowledge`
    );
    const existingNorm = new Set(resTitles.rows.map(r => (r.nt || '').trim()));
    return routes.filter((r, i) => !existingKeys.has(keys[i]) && !existingNorm.has(normTitles[i]));
  } finally { client.release(); }
}

async function saveRoutes(routes) {
  if (!routes?.length) return { saved: 0, skipped: 0 };
  const newRoutes = await filterNewRoutes(routes);
  const existing = routes.length - newRoutes.length;
  if (!newRoutes.length) return { saved: 0, skipped: routes.length, already_in_db: existing };
  if (DRY_RUN) {
    for (const r of newRoutes) console.log(`  [dry] ${r.title} [${r.category}]`);
    return { saved: 0, new_found: newRoutes.length, already_in_db: existing, dry_run: true };
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
          r.lat ?? null, r.lng ?? null, r.source_url, 'idilesom.com',
          searchText, JSON.stringify(r.extra ?? {}), sourceHash,
        ]);
        saved++;
      } catch { skipped++; }
    }
  } finally { client.release(); }
  return { saved, skipped, already_in_db: existing };
}

async function getDBStats() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT category, COUNT(*) as cnt FROM agent_route_knowledge GROUP BY category ORDER BY cnt DESC');
    const total = await client.query('SELECT COUNT(*) AS n FROM agent_route_knowledge');
    return { total: Number(total.rows[0]?.n ?? 0), by_category: Object.fromEntries(res.rows.map(r => [r.category, Number(r.cnt)])) };
  } finally { client.release(); }
}

// ── Parse place detail page ──────────────────────────────────
function parseDetailPage(html, placeId) {
  let doc;
  try { doc = new JSDOM(html).window.document; } catch { return null; }

  // Title
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  const h1 = doc.querySelector('h1');
  let title = (ogTitle?.content || h1?.textContent || '').trim();
  title = title.replace(/\s*[—\-]\s*ИдиЛесом.*$/i, '').replace(/\s*[—\-]\s*Камчатка.*$/i, '').trim();
  if (!title || title.length < 3) return null;

  // Description
  const ogDesc = doc.querySelector('meta[property="og:description"]');
  const descEl = doc.querySelector('.description, .place-description, .text-content, .detail-text');
  let description = (ogDesc?.content || descEl?.textContent || '').trim().slice(0, 300);
  description = description.replace(/Маршрут и все подробности на ИдиЛесом\.?/gi, '').trim();

  // Coordinates
  let lat = null, lng = null;
  const fullHtml = html;
  const latMatch = fullHtml.match(/"latitude"\s*:\s*([\d.]+)/);
  const lngMatch = fullHtml.match(/"longitude"\s*:\s*([\d.]+)/);
  if (latMatch && lngMatch) {
    lat = parseFloat(latMatch[1]);
    lng = parseFloat(lngMatch[1]);
  }
  if (!lat) {
    const llMatch = fullHtml.match(/ll=([\d.]+),([\d.]+)/);
    if (llMatch) { lat = parseFloat(llMatch[1]); lng = parseFloat(llMatch[2]); }
  }
  if (!lat) {
    const geoMatch = fullHtml.match(/(5[0-9]\.\d{4,})\D+(15[5-9]\.\d{4,})/);
    if (geoMatch) { lat = parseFloat(geoMatch[1]); lng = parseFloat(geoMatch[2]); }
  }

  // Category
  const fullText = title + ' ' + (description || '');
  const category = detectCategory(fullText);

  // Enrichment
  const extra = {};
  const bodyText = doc.body?.textContent || '';

  const diffMatch = bodyText.match(/(Лёгкий|Легкий|Средний|Сложный|Очень сложный)/i);
  if (diffMatch) {
    const diffMap = { 'лёгкий': 'easy', 'легкий': 'easy', 'средний': 'medium', 'сложный': 'hard', 'очень сложный': 'extreme' };
    extra.difficulty = diffMap[diffMatch[1].toLowerCase()] || diffMatch[1];
  }

  const durMatch = bodyText.match(/(Целый день|Несколько часов|Несколько дней|Больше недели|\d+\s*(дн|час|дней|суток))/i);
  if (durMatch) extra.duration = durMatch[0].trim();

  const districtMatch = bodyText.match(/Район[^:]*:\s*([А-Яа-яёЁ\s-]+)/i);
  if (districtMatch) extra.district = districtMatch[1].trim().slice(0, 80);

  const lenMatch = bodyText.match(/(\d+[.,]\d+)\s*км/);
  if (lenMatch) extra.length_km = parseFloat(lenMatch[1].replace(',', '.'));

  extra.idilesom_id = placeId;

  return {
    title,
    description: description || null,
    category,
    source_url: `https://idilesom.com/kam/places/${placeId}`,
    lat,
    lng,
    extra,
  };
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  if (STATS_ONLY) {
    const s = await getDBStats();
    console.log(`Routes in DB: ${s.total}`);
    for (const [cat, cnt] of Object.entries(s.by_category)) console.log(`  ${cat.padEnd(26)}: ${cnt}`);
    await pool.end();
    return;
  }

  console.log('idilesom.com Full Scraper (AJAX pagination)');
  if (DRY_RUN) console.log('DRY RUN - no DB writes');
  console.log(`Max pages: ${MAX_PAGES}`);
  console.log('-'.repeat(55));

  const statsBefore = await getDBStats();
  console.log(`DB before: ${statsBefore.total} routes\n`);

  // Phase 1: collect all place IDs via pagination
  const allPlaceIds = new Set();
  let page = 1;

  console.log('Phase 1: Collecting place IDs...');
  // Page 1 comes from regular HTML
  const firstPage = await fetchUrl('https://idilesom.com/kam/places');
  if (firstPage.data) {
    const matches = firstPage.data.match(/\/kam\/places\/(\d+)/g) || [];
    matches.forEach(m => allPlaceIds.add(m.split('/').pop()));
  }
  console.log(`  Page 1: ${allPlaceIds.size} places`);

  // Pages 2+ come from AJAX
  for (page = 2; page <= MAX_PAGES; page++) {
    await sleep(400);
    const res = await fetchUrl(`https://idilesom.com/kam/places?page=${page}`, {
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json',
    });
    if (res.error) { console.log(`  Page ${page}: error (${res.error})`); break; }
    try {
      const json = JSON.parse(res.data);
      if (json.empty) { console.log(`  Page ${page}: empty (end)`); break; }
      const matches = (json.list || '').match(/\/kam\/places\/(\d+)/g) || [];
      const ids = [...new Set(matches.map(m => m.split('/').pop()))];
      ids.forEach(id => allPlaceIds.add(id));
      console.log(`  Page ${page}: +${ids.length} places (total: ${allPlaceIds.size})`);
    } catch {
      console.log(`  Page ${page}: JSON parse error`);
      break;
    }
  }

  console.log(`\nTotal unique place IDs: ${allPlaceIds.size}`);

  // Phase 2: fetch each place detail page
  console.log('\nPhase 2: Fetching place details...');
  const routes = [];
  let fetched = 0, failed = 0;

  for (const placeId of allPlaceIds) {
    await sleep(600);
    const res = await fetchUrl(`https://idilesom.com/kam/places/${placeId}`);
    if (res.error) { failed++; continue; }
    fetched++;
    const route = parseDetailPage(res.data, placeId);
    if (route?.title) {
      routes.push(route);
      const coordStr = route.lat ? `[${route.lat},${route.lng}]` : 'no coords';
      const diffStr = route.extra?.difficulty || '';
      console.log(`  [${fetched}] ${route.title.slice(0, 50)} [${route.category}] ${coordStr} ${diffStr}`);
    }
  }

  console.log(`\nParsed: ${routes.length} routes from ${fetched} pages (${failed} failed)`);

  // Phase 3: save to DB
  console.log('\nPhase 3: Saving to DB...');
  const result = await saveRoutes(routes);
  console.log(`Saved: ${result.saved}, already in DB: ${result.already_in_db ?? 0}`);

  const statsAfter = await getDBStats();
  console.log('\n' + '='.repeat(55));
  console.log(`Result: ${statsBefore.total} -> ${statsAfter.total} routes (+${statsAfter.total - statsBefore.total})`);
  console.log('\nBy category:');
  for (const [cat, cnt] of Object.entries(statsAfter.by_category)) {
    const before = statsBefore.by_category[cat] || 0;
    const diff = cnt - before;
    console.log(`  ${cat.padEnd(26)}: ${cnt}${diff > 0 ? ` (+${diff})` : ''}`);
  }

  await pool.end();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
