#!/usr/bin/env node
/**
 * scripts/enrich-coords-osm.js
 *
 * 1. Fetches Kamchatka POIs from OpenStreetMap Overpass API (free, no key)
 * 2. Matches existing routes by name → updates lat/lng
 * 3. Optionally adds new unique POIs as routes (--import-new)
 *
 * Usage:
 *   node scripts/enrich-coords-osm.js             -- enrich existing coords
 *   node scripts/enrich-coords-osm.js --dry-run   -- preview only
 *   node scripts/enrich-coords-osm.js --import-new-- also add new OSM POIs
 *   node scripts/enrich-coords-osm.js --stats     -- show coverage stats
 */

'use strict';

const { Pool } = require('pg');
const crypto   = require('crypto');
const fs       = require('fs');
const path     = require('path');

// ── Env ──────────────────────────────────────────────────────
function loadDotEnv() {
  for (const f of ['.env.local', '.env']) {
    const full = path.resolve(process.cwd(), f);
    if (!fs.existsSync(full)) continue;
    fs.readFileSync(full, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
    break;
  }
}
loadDotEnv();

const DATABASE_URL = process.env.DATABASE_URL;
const DRY_RUN     = process.argv.includes('--dry-run');
const IMPORT_NEW  = process.argv.includes('--import-new');
const STATS_ONLY  = process.argv.includes('--stats');

if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=no-verify') ? { rejectUnauthorized: false } : undefined,
  max: 3,
});

// ── OSM category map ─────────────────────────────────────────
const OSM_CAT = {
  volcano   : 'vulkani',
  hot_spring: 'termalnye_istochniki',
  geyser    : 'geyzery',
  peak      : 'mountains',
  waterfall : 'eco',
  bay       : 'morskie_progulki',
  cape      : 'morskie_progulki',
  viewpoint : 'eco',
  attraction: 'eco',
  museum    : 'eco',
  water     : 'lakes',
  spring    : 'termalnye_istochniki',
  cave_entrance: 'eco',
};

// ── Name normalisation for fuzzy matching ────────────────────
function norm(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/вулкан\s+/gi, '')
    .replace(/гора\s+/gi, '')
    .replace(/озеро\s+/gi, '')
    .replace(/мыс\s+/gi, '')
    .replace(/бухта\s+/gi, '')
    .replace(/река\s+/gi, '')
    .replace(/гейзер\s+/gi, '')
    .replace(/источник\w*\s*/gi, '')
    .replace(/[^а-яa-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein distance (capped at 5 for performance)
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 5) return 99;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// ── Fetch all Kamchatka POIs from Overpass ───────────────────
async function fetchOSMPois() {
  console.log('Fetching Kamchatka POIs from OpenStreetMap Overpass...');
  const query = `[out:json][timeout:60];(
    node["natural"~"volcano|hot_spring|geyser|peak|waterfall|bay|cape|spring|cave_entrance"](50,155,62,170);
    node["tourism"~"attraction|viewpoint|museum"](50,155,62,170);
    way["natural"="water"]["name"](50,155,62,170);
    way["natural"="volcano"](50,155,62,170);
    relation["natural"="volcano"](50,155,62,170);
  );out center qt 10000;`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const elements = data.elements || [];
    console.log(`  Got ${elements.length} POIs from OSM`);
    return elements.map(e => ({
      id   : e.id,
      type : e.type,
      lat  : e.lat ?? e.center?.lat ?? null,
      lng  : e.lon ?? e.center?.lon ?? null,
      tags : e.tags || {},
      name : e.tags?.['name:ru'] || e.tags?.name || '',
      natural : e.tags?.natural || '',
      tourism : e.tags?.tourism || '',
    })).filter(e => e.name && e.lat && e.lng);
  } catch (err) {
    clearTimeout(timer);
    console.error('  Overpass error:', err.message);
    return [];
  }
}

// ── Load routes needing coord enrichment ─────────────────────
async function loadRoutesWithoutCoords() {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT id, title, category FROM agent_route_knowledge
       WHERE lat IS NULL OR lng IS NULL
       ORDER BY id`
    );
    return res.rows;
  } finally { client.release(); }
}

// ── Update route coords ───────────────────────────────────────
async function updateCoords(routeId, lat, lng, osmName) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE agent_route_knowledge
         SET lat = $1, lng = $2,
             payload = payload || jsonb_build_object('osm_matched_name', $3::text),
             last_synced_at = NOW()
       WHERE id = $4`,
      [lat, lng, osmName, routeId]
    );
  } finally { client.release(); }
}

// ── Import new OSM POI as route ───────────────────────────────
async function importOsmPoi(poi) {
  const dedupeKey = `osm:${poi.type}/${poi.id}`;
  const cat = OSM_CAT[poi.natural || poi.tourism] || 'eco';
  const title = poi.name.trim().slice(0, 200);
  const searchText = [title, cat, poi.natural, poi.tourism].filter(Boolean).join(' ');
  const client = await pool.connect();
  try {
    const existing = await client.query(
      'SELECT id FROM agent_route_knowledge WHERE route_dedupe_key = $1', [dedupeKey]
    );
    if (existing.rows.length) return false;
    const payload = {
      osm_id: poi.id,
      osm_type: poi.type,
      natural: poi.natural || undefined,
      tourism: poi.tourism || undefined,
    };
    await client.query(`
      INSERT INTO agent_route_knowledge
        (route_dedupe_key, category, title, lat, lng,
         source_url, source_name, search_text, payload, source_hash, last_synced_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,NOW())
      ON CONFLICT (route_dedupe_key) DO NOTHING
    `, [
      dedupeKey, cat, title, poi.lat, poi.lng,
      `https://www.openstreetmap.org/${poi.type}/${poi.id}`,
      'openstreetmap.org', searchText,
      JSON.stringify(payload),
      crypto.createHash('md5').update(searchText).digest('hex'),
    ]);
    return true;
  } finally { client.release(); }
}

// ── Stats ─────────────────────────────────────────────────────
async function printStats() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT
        COUNT(*) total,
        COUNT(*) FILTER (WHERE lat IS NOT NULL) coords,
        COUNT(*) FILTER (WHERE source_name = 'openstreetmap.org') osm_imported
      FROM agent_route_knowledge
    `);
    const s = res.rows[0];
    console.log(`Total routes  : ${s.total}`);
    console.log(`With coords   : ${s.coords} (${Math.round(s.coords/s.total*100)}%)`);
    console.log(`OSM imported  : ${s.osm_imported}`);
  } finally { client.release(); }
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  if (STATS_ONLY) { await printStats(); await pool.end(); return; }

  console.log('OSM Coordinate Enricher for KamchatourHub');
  if (DRY_RUN)   console.log('DRY RUN — no DB writes');
  if (IMPORT_NEW) console.log('IMPORT NEW OSM POIs enabled');
  console.log('-'.repeat(55));

  const pois = await fetchOSMPois();
  if (!pois.length) { console.log('No POIs fetched, aborting.'); await pool.end(); return; }

  // Build normalised POI lookup
  const poisNorm = pois.map(p => ({ ...p, normName: norm(p.name) }));

  // ── Step 1: Enrich existing routes with coords ────────────
  const routes = await loadRoutesWithoutCoords();
  console.log(`\nRoutes without coords: ${routes.length}`);

  let matched = 0, skipped = 0;
  for (const route of routes) {
    const rNorm = norm(route.title);
    if (rNorm.length < 3) { skipped++; continue; }

    // Find best OSM match by normalised name distance
    let best = null, bestDist = 99;
    for (const poi of poisNorm) {
      if (!poi.normName) continue;
      // Quick length check before full lev
      if (Math.abs(poi.normName.length - rNorm.length) > 8) continue;
      const d = poi.normName === rNorm ? 0 : lev(rNorm, poi.normName);
      if (d < bestDist) { bestDist = d; best = poi; }
      if (d === 0) break;
    }

    // Accept if distance ≤ 1 (allows ё/е, single char endings like падежи)
    if (best && bestDist <= 1) {
      console.log(`  MATCH [d=${bestDist}] "${route.title.slice(0,45)}" → "${best.name}" (${best.lat},${best.lng})`);
      if (!DRY_RUN) await updateCoords(route.id, best.lat, best.lng, best.name);
      matched++;
    } else {
      skipped++;
    }
  }
  console.log(`\nCoord enrichment: ${matched} matched, ${skipped} skipped`);

  // ── Step 2: Import new high-value OSM POIs ────────────────
  if (IMPORT_NEW) {
    const HIGH_VALUE = new Set(['hot_spring','geyser','volcano','attraction','viewpoint','museum']);
    const newPois = pois.filter(p => HIGH_VALUE.has(p.natural) || HIGH_VALUE.has(p.tourism));
    console.log(`\nImporting ${newPois.length} high-value OSM POIs (hot_spring, geyser, volcano, attraction)...`);
    let imported = 0, dup = 0;
    for (const poi of newPois) {
      if (DRY_RUN) { console.log(`  [dry] ${poi.name} (${poi.natural || poi.tourism})`); imported++; continue; }
      const ok = await importOsmPoi(poi);
      if (ok) { imported++; console.log(`  + ${poi.name} (${poi.natural || poi.tourism})`); }
      else dup++;
    }
    console.log(`Imported: ${imported}, duplicates: ${dup}`);
  }

  console.log('\n' + '='.repeat(55));
  await printStats();
  await pool.end();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
