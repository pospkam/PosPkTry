#!/usr/bin/env node
/**
 * scripts/geocode-routes.js
 *
 * Геокодирует маршруты без координат через Nominatim (OpenStreetMap).
 * При наличии YANDEX_MAPS_API_KEY использует Yandex как основной, Nominatim как fallback.
 * Обновляет lat/lng в agent_route_knowledge.
 *
 * Usage:
 *   node scripts/geocode-routes.js              -- geocode all missing
 *   node scripts/geocode-routes.js --dry-run    -- show what would be geocoded
 *   node scripts/geocode-routes.js --limit=50   -- limit to N routes
 *   node scripts/geocode-routes.js --stats      -- show current coverage
 */

'use strict';

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
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      });
      break;
    }
  }
}
loadDotEnv();

const DATABASE_URL  = process.env.DATABASE_URL;
const YANDEX_KEY    = (process.env.YANDEX_MAPS_API_KEY || process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || '').trim();
const DRY_RUN       = process.argv.includes('--dry-run');
const STATS_ONLY    = process.argv.includes('--stats');
const LIMIT         = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '200', 10);
// Nominatim: max 1 req/s. Yandex: max 5 req/s. Use safer 1.1s for both.
const DELAY_MS      = YANDEX_KEY ? 250 : 1100;

// Kamchatka bounding box for validation
const KAM_BBOX = { latMin: 50, latMax: 64, lonMin: 155, lonMax: 170 };

if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=no-verify') ? { rejectUnauthorized: false } : undefined,
  max: 3,
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Category → search hints ──────────────────────────────────
const CAT_HINTS = {
  vulkani:              'вулкан Камчатка',
  termalnye_istochniki: 'термальные источники Камчатка',
  geyzery:              'гейзер Камчатка',
  morskie_progulki:     'бухта Камчатка',
  lakes:                'озеро Камчатка',
  mountains:            'гора Камчатка',
  rivers:               'река Камчатка',
  rybalka:              'Камчатка',
  trekking:             'Камчатка',
  eco:                  'Камчатка',
};

function buildQuery(title, category) {
  const hint = CAT_HINTS[category] ?? 'Камчатка';
  // If title already contains Камчатка — don't duplicate
  if (/камчатк/i.test(title)) return title;
  return `${title} ${hint}`;
}

function insideKamchatka(lat, lon) {
  return lat >= KAM_BBOX.latMin && lat <= KAM_BBOX.latMax &&
         lon >= KAM_BBOX.lonMin && lon <= KAM_BBOX.lonMax;
}

// ── Nominatim (OpenStreetMap) ────────────────────────────────
async function geocodeNominatim(title, category) {
  const q = encodeURIComponent(buildQuery(title, category));
  // viewbox: left,top,right,bottom = lonMin,latMax,lonMax,latMin
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=3&countrycodes=ru&viewbox=155,64,170,50&bounded=1`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'kamchatour-geocoder/1.0 (https://kamchatour.ru)' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.length) return null;

    const best = json[0];
    const lat = parseFloat(best.lat);
    const lon = parseFloat(best.lon);
    if (!insideKamchatka(lat, lon)) return null;

    return { lat, lon, precision: best.type ?? 'unknown', kind: best.class ?? 'unknown', provider: 'nominatim' };
  } catch {
    return null;
  }
}

// ── Yandex Geocoder (if API key available) ───────────────────
async function geocodeYandex(title, category) {
  if (!YANDEX_KEY) return null;
  const query = encodeURIComponent(buildQuery(title, category));
  const url = `https://geocode-maps.yandex.ru/1.x/?format=json&results=1&geocode=${query}&apikey=${YANDEX_KEY}&bbox=155,50~170,64`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();

    const members = json?.response?.GeoObjectCollection?.featureMember;
    if (!members?.length) return null;

    const point = members[0]?.GeoObject?.Point?.pos;
    if (!point) return null;

    const [lonStr, latStr] = point.split(' ');
    const lon = parseFloat(lonStr);
    const lat = parseFloat(latStr);
    if (!insideKamchatka(lat, lon)) return null;

    const precision = members[0]?.GeoObject?.metaDataProperty?.GeocoderMetaData?.precision ?? 'unknown';
    const kind      = members[0]?.GeoObject?.metaDataProperty?.GeocoderMetaData?.kind ?? 'unknown';
    return { lat, lon, precision, kind, provider: 'yandex' };
  } catch {
    return null;
  }
}

async function geocode(title, category) {
  if (YANDEX_KEY) {
    const r = await geocodeYandex(title, category);
    if (r) return r;
  }
  return geocodeNominatim(title, category);
}

async function main() {
  // ── Stats mode ──────────────────────────────────────────────
  if (STATS_ONLY) {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                               AS total,
        COUNT(lat)                             AS has_coords,
        COUNT(*) FILTER (WHERE lat IS NULL)    AS missing_coords,
        COUNT(*) FILTER (WHERE payload->>'geocoded_by' = 'yandex')    AS geocoded_yandex,
        COUNT(*) FILTER (WHERE payload->>'geocoded_by' = 'nominatim') AS geocoded_osm
      FROM agent_route_knowledge
    `);
    const s = rows[0];
    const pct = s.total > 0 ? Math.round(s.has_coords / s.total * 100) : 0;
    console.log(`Total: ${s.total} | has_coords: ${s.has_coords} (${pct}%)`);
    console.log(`Missing: ${s.missing_coords} | geocoded by Yandex: ${s.geocoded_yandex} | by Nominatim: ${s.geocoded_osm}`);
    await pool.end();
    return;
  }

  const provider = YANDEX_KEY ? 'Yandex + Nominatim fallback' : 'Nominatim (OSM) — keyless';
  console.log(`Geocoder: ${provider}`);
  console.log(`Delay: ${DELAY_MS}ms/req`);

  // ── Fetch routes without coords ──────────────────────────────
  const { rows } = await pool.query(
    `SELECT id, title, category
     FROM agent_route_knowledge
     WHERE lat IS NULL
       AND source_name NOT LIKE 'openstreetmap%'
     ORDER BY
       CASE WHEN source_name = 'idilesom.com' THEN 0
            WHEN source_name = 'kamchatintour.ru' THEN 1
            ELSE 2 END,
       title ASC
     LIMIT $1`,
    [LIMIT]
  );

  console.log(`Routes without coords: ${rows.length} (limit: ${LIMIT})`);
  if (DRY_RUN) console.log('DRY RUN — no DB writes\n');
  console.log('-'.repeat(60));

  let updated = 0, failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const { id, title, category } = rows[i];
    process.stdout.write(`  [${i + 1}/${rows.length}] ${title.slice(0, 48).padEnd(50)}`);

    const result = await geocode(title, category);

    if (!result) {
      process.stdout.write(`✗ no result\n`);
      failed++;
    } else {
      process.stdout.write(`✓ ${result.lat.toFixed(4)},${result.lon.toFixed(4)} [${result.provider}/${result.kind}]\n`);
      if (!DRY_RUN) {
        await pool.query(
          `UPDATE agent_route_knowledge
           SET lat = $1, lng = $2,
               payload = payload || $3::jsonb,
               updated_at = NOW()
           WHERE id = $4`,
          [result.lat, result.lon,
           JSON.stringify({
             geocoded_by: result.provider,
             geocoded_at: new Date().toISOString(),
             geocode_precision: result.precision,
             geocode_kind: result.kind,
           }),
           id]
        );
        updated++;
      } else {
        updated++;
      }
    }

    if (i < rows.length - 1) await sleep(DELAY_MS);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Result: +${updated} coords | failed: ${failed}`);
  if (DRY_RUN) console.log('(dry run — nothing written)');

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
