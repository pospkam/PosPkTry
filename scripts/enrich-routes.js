#!/usr/bin/env node
/**
 * scripts/enrich-routes.js
 *
 * Enrichment pipeline for routes in agent_route_knowledge.
 * Re-fetches source URLs via Bright Data and extracts metadata:
 * difficulty, duration, season, best_months, altitude, danger_level,
 * required_equipment, price_from, group_size_max
 *
 * All data stored in payload JSONB (no schema migration needed).
 *
 * Usage:
 *   node scripts/enrich-routes.js                   -- enrich all unenriched
 *   node scripts/enrich-routes.js --dry-run         -- show what would be enriched
 *   node scripts/enrich-routes.js --force            -- re-enrich all routes
 *   node scripts/enrich-routes.js --limit=50        -- max routes to process
 *   node scripts/enrich-routes.js --category=vulkani -- single category
 */

'use strict';

const { JSDOM } = require('jsdom');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
const FORCE = process.argv.includes('--force');
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '200', 10);
const CATEGORY = process.argv.find(a => a.startsWith('--category='))?.split('=')[1];

if (!BRIGHTDATA_API_TOKEN) {
  console.log('BRIGHTDATA_API_TOKEN not set -- using direct fetch mode');
}
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=no-verify') ? { rejectUnauthorized: false } : undefined,
  max: 3,
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Fetch with Bright Data ───────────────────────────────────
async function fetchViaBD(url, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BRIGHTDATA_API_TOKEN}`,
      },
      body: JSON.stringify({ zone: 'mcp_unlocker', url, format: 'raw' }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { error: `BD ${res.status}` };
    return { html: await res.text() };
  } catch (e) {
    clearTimeout(timer);
    return { error: String(e.message || e) };
  }
}

// ── Direct fetch fallback ────────────────────────────────────
async function fetchDirect(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return { html: await res.text() };
  } catch (e) {
    clearTimeout(timer);
    return { error: String(e.message || e) };
  }
}

async function smartFetch(url) {
  if (BRIGHTDATA_API_TOKEN) {
    const bd = await fetchViaBD(url);
    if (!bd.error) return bd;
  }
  return fetchDirect(url);
}

// ── HTML to text ─────────────────────────────────────────────
function htmlToText(html, maxLen = 12000) {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    for (const el of doc.querySelectorAll('script,style,noscript,svg,iframe')) {
      el.remove();
    }
    return (doc.body?.textContent ?? '').replace(/\s{3,}/g, '\n\n').trim().slice(0, maxLen);
  } catch {
    return String(html).slice(0, maxLen);
  }
}

// ── Month name to number map ─────────────────────────────────
const MONTH_MAP = {
  'январ': 1, 'феврал': 2, 'март': 3, 'апрел': 4,
  'ма': 5, 'июн': 6, 'июл': 7, 'август': 8,
  'сентябр': 9, 'октябр': 10, 'ноябр': 11, 'декабр': 12,
};

function parseMonths(text) {
  const months = new Set();
  for (const [prefix, num] of Object.entries(MONTH_MAP)) {
    if (text.toLowerCase().includes(prefix)) months.add(num);
  }
  return months.size > 0 ? [...months].sort((a, b) => a - b) : null;
}

// ── Extract enrichment from full text ────────────────────────
function extractEnrichment(text, existingPayload) {
  const payload = { ...(existingPayload || {}) };

  // Duration
  const durDays = text.match(/(\d+)\s*(дн|день|дней|суток)/i);
  const durHours = text.match(/(\d+)\s*(час|часа|часов)/i);
  const durGeneric = text.match(/(Целый день|Полдня|Несколько часов|Несколько дней)/i);
  if (durDays) payload.duration = `${durDays[1]} дн.`;
  else if (durHours) payload.duration = `${durHours[1]} ч.`;
  else if (durGeneric) payload.duration = durGeneric[0].trim();

  // Difficulty
  if (/экстремальн|крайне сложн|extreme/i.test(text)) payload.difficulty = 'extreme';
  else if (/сложн|тяжел|advanced|hard/i.test(text)) payload.difficulty = 'hard';
  else if (/средн|moderate|умеренн/i.test(text)) payload.difficulty = 'medium';
  else if (/лёгк|легк|простой|начинающ|easy|без подготовки/i.test(text)) payload.difficulty = 'easy';

  // Season text
  const seasonMatch = text.match(/(с\s+\w+\s+по\s+\w+|июн[ья]?\s*[-–]\s*сентябр[ья]?|июл[ья]?\s*[-–]\s*август|круглогодичн|зимний сезон|летний сезон)/i);
  if (seasonMatch) payload.season = seasonMatch[0].trim();

  // Best months (array of numbers)
  const monthsFromSeason = parseMonths(text.slice(0, 3000));
  if (monthsFromSeason) payload.best_months = monthsFromSeason;

  // Price
  const priceMatch = text.match(/(?:от|цена|стоимость)[^.]{0,30}?(\d[\d\s]*)\s*(руб|₽|р\.)/i);
  if (priceMatch) {
    const price = parseInt(priceMatch[1].replace(/\s/g, ''), 10);
    if (price >= 500 && price <= 5000000) payload.price_from = price;
  }

  // Altitude
  const altMatch = text.match(/(\d{3,5})\s*(м\s+над|метр[ов]*\s+над|м\.?\s*н\.?\s*у\.?\s*м)/i);
  if (altMatch) {
    const alt = parseInt(altMatch[1], 10);
    if (alt >= 100 && alt <= 5000) payload.altitude = alt;
  }

  // Danger level
  if (/опасн|высокий риск|extreme danger|запрещён|закрыт для посещения/i.test(text)) payload.danger_level = 'high';
  else if (/осторожн|будьте внимательн|risk|moderate danger|потенциально опасн/i.test(text)) payload.danger_level = 'moderate';
  else if (/безопасн|подходит для детей|семейн|safe/i.test(text)) payload.danger_level = 'low';

  // Required equipment
  const equipPatterns = [
    /треккинговы[ех]\s*бот/i, /каск[аеу]/i, /ледоруб/i,
    /кошк[иа] для/i, /палатк[аеу]/i, /спальн[а-я]+ мешо[кг]/i,
    /термобель[ёе]/i, /дождевик/i, /солнцезащитн/i,
    /рюкзак/i, /гамаш[иы]/i, /перчатк[иа]/i,
    /фонар[ьи]/i, /верёвк[аеу]/i, /страхов[а-я]+ систем/i,
    /спасательн[а-я]+ жилет/i, /гидрокостюм/i,
    /удочк[аеу]|спиннинг/i,
  ];
  const equipment = [];
  for (const pat of equipPatterns) {
    const m = text.match(pat);
    if (m) equipment.push(m[0].trim().toLowerCase());
  }
  if (equipment.length) payload.required_equipment = [...new Set(equipment)];

  // Group size
  const groupMax = text.match(/(?:до|max|максимум|группа[^.]{0,20}?)\s*(\d{1,3})\s*(?:человек|чел|person)/i);
  if (groupMax) payload.group_size_max = parseInt(groupMax[1], 10);
  const groupMin = text.match(/(?:от|min|минимум)\s*(\d{1,2})\s*(?:человек|чел)/i);
  if (groupMin) payload.group_size_min = parseInt(groupMin[1], 10);

  // Mark as enriched
  payload.enriched_at = new Date().toISOString();

  return payload;
}

// ── Get routes to enrich ─────────────────────────────────────
async function getRoutesToEnrich() {
  const client = await pool.connect();
  try {
    let whereClause = '1=1';
    const params = [];
    if (!FORCE) {
      whereClause += " AND (payload->>'enriched_at') IS NULL";
    }
    if (CATEGORY) {
      params.push(CATEGORY);
      whereClause += ` AND category = $${params.length}`;
    }
    whereClause += ' AND source_url IS NOT NULL';

    const sql = `
      SELECT id, title, category, source_url, payload
      FROM agent_route_knowledge
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${LIMIT}
    `;
    const res = await client.query(sql, params);
    return res.rows;
  } finally { client.release(); }
}

// ── Update route payload ─────────────────────────────────────
async function updatePayload(routeId, payload) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE agent_route_knowledge
       SET payload = $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(payload), routeId]
    );
  } finally { client.release(); }
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('Route Enrichment Pipeline');
  if (DRY_RUN) console.log('DRY RUN - no DB writes');
  if (FORCE) console.log('FORCE - re-enriching already enriched routes');
  if (CATEGORY) console.log(`Category filter: ${CATEGORY}`);
  console.log(`Limit: ${LIMIT}`);
  console.log('-'.repeat(55));

  const routes = await getRoutesToEnrich();
  console.log(`Routes to enrich: ${routes.length}`);

  if (!routes.length) {
    console.log('Nothing to enrich.');
    await pool.end();
    return;
  }

  let enriched = 0, failed = 0, fieldsFound = {};

  for (const route of routes) {
    console.log(`  [${enriched + failed + 1}/${routes.length}] ${route.title.slice(0, 50)} (${route.category})`);

    await sleep(700);
    const res = await smartFetch(route.source_url);
    if (res.error) {
      console.log(`    Failed to fetch: ${res.error}`);
      failed++;
      continue;
    }

    const fullText = htmlToText(res.html);
    const existingPayload = typeof route.payload === 'string' ? JSON.parse(route.payload) : (route.payload || {});
    const newPayload = extractEnrichment(fullText, existingPayload);

    // Count fields found
    for (const key of ['difficulty', 'duration', 'season', 'best_months', 'altitude', 'danger_level', 'required_equipment', 'price_from', 'group_size_max']) {
      if (newPayload[key] !== undefined && newPayload[key] !== null) {
        fieldsFound[key] = (fieldsFound[key] || 0) + 1;
      }
    }

    if (DRY_RUN) {
      const newFields = Object.entries(newPayload)
        .filter(([k]) => !['enriched_at'].includes(k) && existingPayload[k] === undefined)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`);
      if (newFields.length) {
        console.log(`    New: ${newFields.join(', ')}`);
      } else {
        console.log('    No new data extracted');
      }
    } else {
      await updatePayload(route.id, newPayload);
    }
    enriched++;
  }

  console.log('\n' + '='.repeat(55));
  console.log(`Enriched: ${enriched}  |  Failed: ${failed}`);
  console.log('\nFields extracted:');
  for (const [field, count] of Object.entries(fieldsFound).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${field.padEnd(22)}: ${count}/${enriched}`);
  }

  await pool.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
