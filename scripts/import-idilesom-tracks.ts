/**
 * scripts/import-idilesom-tracks.ts
 *
 * Scrapes GPS tracks from idilesom.com/kam/places and matches them to
 * kamchatka_routes by geographic proximity (nearest start point within 5km).
 * Stores real GPS tracks with elevation in kamchatka_routes.geometry.
 *
 * Usage:
 *   npx tsx scripts/import-idilesom-tracks.ts
 *   npx tsx scripts/import-idilesom-tracks.ts --dry-run
 *   npx tsx scripts/import-idilesom-tracks.ts --limit 50
 */

import { pool } from '../lib/db-pool';

const DELAY_MS = 600;
const MAX_MATCH_DIST_KM = 5;
const isDryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : 9999;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── Haversine ────────────────────────────────────────────────────────────────

function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Fetch all idilesom place IDs ─────────────────────────────────────────────

async function fetchAllPlaceIds(): Promise<string[]> {
  const all = new Set<string>();
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0',
    'Accept-Language': 'ru-RU,ru;q=0.9',
  };

  // Page 1 — regular HTML
  const r1 = await fetch('https://idilesom.com/kam/places', { headers });
  const html = await r1.text();
  (html.match(/\/kam\/places\/(\d+)/g) ?? []).forEach(m => all.add(m.split('/').pop()!));
  process.stdout.write(`  Page 1: ${all.size} ids\n`);

  // Pages 2+ — AJAX
  for (let page = 2; page <= 50; page++) {
    await sleep(DELAY_MS);
    const res = await fetch(`https://idilesom.com/kam/places?page=${page}`, {
      headers: { ...headers, 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
    });
    const data = await res.json() as { empty?: boolean; list?: string };
    if (data.empty) break;
    const ids = (data.list?.match(/\/kam\/places\/(\d+)/g) ?? []).map(m => m.split('/').pop()!);
    const before = all.size;
    ids.forEach(id => all.add(id));
    process.stdout.write(`  Page ${page}: +${all.size - before} (total ${all.size})\n`);
  }

  return [...all];
}

// ─── Scrape GPS track from place page ────────────────────────────────────────

interface PlaceTrack {
  id: string;
  title: string;
  lat: number;
  lng: number;
  // GeoJSON [lng, lat, ele?]
  coordinates: number[][];
}

async function scrapePlaceTrack(placeId: string): Promise<PlaceTrack | null> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0',
    'Accept-Language': 'ru-RU,ru;q=0.9',
  };

  const res = await fetch(`https://idilesom.com/kam/places/${placeId}`, { headers });
  if (!res.ok) return null;
  const html = await res.text();

  // Title
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  // Find coordinate arrays — idilesom embeds two formats:
  // Format A: [[lat,lng],[lat,lng],...] — for Leaflet polyline
  // Format B: [[lng,lat,ele],[lng,lat,ele],...] — for elevation profile
  // We prefer format B (has elevation, in GeoJSON order)
  const coordBlocks = html.match(/\[\s*\[\s*[\d.]+\s*,\s*[\d.]+[\s\S]*?\]\s*\]/g) ?? [];

  let bestCoords: number[][] = [];

  for (const block of coordBlocks) {
    try {
      const parsed = JSON.parse(block) as number[][];
      if (!Array.isArray(parsed) || parsed.length < 3) continue;
      if (!Array.isArray(parsed[0]) || parsed[0].length < 2) continue;

      // Determine format: if first element [0] > 90 → it's lng-first (format B, GeoJSON)
      const first = parsed[0];
      const isGeoJSON = Math.abs(first[0]) > 90;

      const coords: number[][] = isGeoJSON
        ? parsed.map(p => p.length >= 3 ? [p[0], p[1], p[2]] : [p[0], p[1]])
        : parsed.map(p => [p[1], p[0]]); // swap lat/lng to GeoJSON [lng, lat]

      if (coords.length > bestCoords.length) bestCoords = coords;
    } catch { /* skip malformed */ }
  }

  if (bestCoords.length < 3) return null;

  // Center point of track for matching
  const mid = bestCoords[Math.floor(bestCoords.length / 2)];
  const lng = mid[0];
  const lat = mid[1];

  return { id: placeId, title, lat, lng, coordinates: bestCoords };
}

// ─── Match to kamchatka_routes ────────────────────────────────────────────────

interface OurRoute {
  id: string;
  title: string;
  lat: number;
  lng: number;
  hasRealGeometry: boolean;
}

async function loadOurRoutes(): Promise<OurRoute[]> {
  const { rows } = await pool.query<{
    id: string; title: string; lat: string; lng: string; geom_source: string | null;
  }>(`
    SELECT id, title, lat::text, lng::text,
           geometry->>'source' AS geom_source
    FROM kamchatka_routes
    WHERE is_visible = true
      AND lat IS NOT NULL AND lng IS NOT NULL
    ORDER BY title
  `);
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lng),
    hasRealGeometry: r.geom_source === 'idilesom' || r.geom_source === 'osm',
  }));
}

function findBestMatch(
  track: PlaceTrack,
  routes: OurRoute[],
): OurRoute | null {
  // Find the route whose center is closest to the track start/mid
  const startCoord = track.coordinates[0];
  const trackLat = startCoord[1];
  const trackLng = startCoord[0];

  let best: OurRoute | null = null;
  let bestDist = MAX_MATCH_DIST_KM;

  for (const r of routes) {
    if (r.hasRealGeometry) continue; // don't overwrite real tracks
    const d = distKm(trackLat, trackLng, r.lat, r.lng);
    if (d < bestDist) { bestDist = d; best = r; }
  }

  return best;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Loading our routes...');
  const ourRoutes = await loadOurRoutes();
  console.log(`  ${ourRoutes.length} routes total`);

  console.log('\nPhase 1: Collecting idilesom place IDs...');
  const allIds = await fetchAllPlaceIds();
  const ids = allIds.slice(0, LIMIT);
  console.log(`  ${ids.length} places to process`);
  if (isDryRun) console.log('  [DRY RUN]');

  let imported = 0, skipped = 0, noMatch = 0, errors = 0;

  console.log('\nPhase 2: Scraping tracks and matching...');
  for (let i = 0; i < ids.length; i++) {
    const placeId = ids[i];
    process.stdout.write(`[${i + 1}/${ids.length}] id=${placeId} `);

    try {
      const track = await scrapePlaceTrack(placeId);
      if (!track || track.coordinates.length < 3) {
        process.stdout.write(`skip (no track)\n`);
        skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      const match = findBestMatch(track, ourRoutes);
      if (!match) {
        process.stdout.write(`no match — "${track.title.slice(0, 40)}"\n`);
        noMatch++;
        await sleep(DELAY_MS);
        continue;
      }

      const geojson = {
        type: 'LineString',
        coordinates: track.coordinates,
        source: 'idilesom',
      };

      if (!isDryRun) {
        await pool.query(
          `UPDATE kamchatka_routes SET geometry = $1 WHERE id = $2`,
          [JSON.stringify(geojson), match.id],
        );
        // Mark as having real geometry so we don't overwrite it
        match.hasRealGeometry = true;
      }

      const pts = track.coordinates.length;
      const hasEle = track.coordinates[0].length >= 3;
      process.stdout.write(
        `OK — "${match.title.slice(0, 35)}" ← "${track.title.slice(0, 35)}" (${pts}pts${hasEle ? '+ele' : ''})\n`,
      );
      imported++;
    } catch (err) {
      process.stdout.write(`ERROR: ${(err as Error).message.slice(0, 80)}\n`);
      errors++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nDone: ${imported} imported, ${skipped} no track, ${noMatch} no match, ${errors} errors`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
