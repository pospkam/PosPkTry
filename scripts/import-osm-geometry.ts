/**
 * scripts/import-osm-geometry.ts
 *
 * Fetches real GPS track geometry from OpenStreetMap Overpass API
 * for kamchatka_routes that have no geometry yet.
 *
 * For each route (lat/lng center), queries Overpass for hiking/track paths
 * within a ~10km bounding box, picks the longest continuous way that starts
 * within 3km of the route center, and stores it as GeoJSON LineString.
 *
 * Usage:
 *   DATABASE_URL=<prod> npx tsx scripts/import-osm-geometry.ts
 *   DATABASE_URL=<prod> npx tsx scripts/import-osm-geometry.ts --dry-run
 *   DATABASE_URL=<prod> npx tsx scripts/import-osm-geometry.ts --limit 20
 */

import { pool } from '../lib/db-pool';

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const DELAY_MS = 1200; // stay well below Overpass rate limit
const RADIUS_DEG_LAT = 0.07; // ~8km
const RADIUS_DEG_LNG = 0.10; // ~8km at Kamchatka latitudes
const MAX_START_DIST_KM = 4; // path start must be within 4km of route center

const isDryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : 999;

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

// ─── Overpass query ───────────────────────────────────────────────────────────

interface OsmNode {
  lat: number;
  lon: number;
}

interface OsmWay {
  id: number;
  tags: Record<string, string>;
  geometry: OsmNode[];
}

async function fetchOsmWays(
  lat: number,
  lng: number,
): Promise<OsmWay[]> {
  const s = lat - RADIUS_DEG_LAT;
  const n = lat + RADIUS_DEG_LAT;
  const w = lng - RADIUS_DEG_LNG;
  const e = lng + RADIUS_DEG_LNG;

  const query = `[out:json][timeout:25];way["highway"~"path|track|footway"](${s},${w},${n},${e});out geom;`;

  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);

  const data = (await res.json()) as { elements: OsmWay[] };
  return (data.elements ?? []).filter((e) => e.geometry && e.geometry.length >= 3);
}

// ─── Pick best way ────────────────────────────────────────────────────────────

function pickBestWay(ways: OsmWay[], routeLat: number, routeLng: number): OsmWay | null {
  // Score: prefer ways whose first OR last node is close to route center, and are long
  const scored = ways.map((way) => {
    const first = way.geometry[0];
    const last = way.geometry[way.geometry.length - 1];
    const distFirst = distKm(routeLat, routeLng, first.lat, first.lon);
    const distLast = distKm(routeLat, routeLng, last.lat, last.lon);
    const startDist = Math.min(distFirst, distLast);
    return { way, startDist, nodeCount: way.geometry.length };
  });

  // Filter by start proximity
  const nearby = scored.filter((s) => s.startDist <= MAX_START_DIST_KM);
  if (nearby.length === 0) return null;

  // Among nearby, pick longest (most detailed)
  nearby.sort((a, b) => b.nodeCount - a.nodeCount);
  return nearby[0].way;
}

// ─── Convert to GeoJSON ───────────────────────────────────────────────────────

function wayToGeoJSON(way: OsmWay, routeLat: number, routeLng: number) {
  // Ensure the LineString starts nearest to the route center
  const first = way.geometry[0];
  const last = way.geometry[way.geometry.length - 1];
  const distFirst = distKm(routeLat, routeLng, first.lat, first.lon);
  const distLast = distKm(routeLat, routeLng, last.lat, last.lon);

  const coords =
    distLast < distFirst
      ? [...way.geometry].reverse().map((n) => [n.lon, n.lat])
      : way.geometry.map((n) => [n.lon, n.lat]);

  return { type: 'LineString', coordinates: coords };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { rows: routes } = await pool.query<{
    id: string;
    title: string;
    lat: string;
    lng: string;
  }>(`
    SELECT id, title, lat::text, lng::text
    FROM kamchatka_routes
    WHERE is_visible = true
      AND lat IS NOT NULL
      AND lng IS NOT NULL
      AND geometry IS NULL
    ORDER BY title
    LIMIT $1
  `, [LIMIT]);

  console.log(`Routes without geometry: ${routes.length}`);
  if (isDryRun) console.log('[dry-run mode — no DB writes]');

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < routes.length; i++) {
    const r = routes[i];
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lng);
    process.stdout.write(`[${i + 1}/${routes.length}] ${r.title.slice(0, 50).padEnd(50)} `);

    try {
      const ways = await fetchOsmWays(lat, lng);
      const best = pickBestWay(ways, lat, lng);

      if (!best) {
        process.stdout.write(`skip (0/${ways.length} ways in range)\n`);
        skipped++;
      } else {
        const geojson = wayToGeoJSON(best, lat, lng);
        const pts = geojson.coordinates.length;

        if (!isDryRun) {
          await pool.query(
            `UPDATE kamchatka_routes SET geometry = $1 WHERE id = $2`,
            [JSON.stringify(geojson), r.id],
          );
        }

        const name = best.tags?.name ?? 'unnamed';
        process.stdout.write(`OK (${pts} pts, way "${name}")\n`);
        imported++;
      }
    } catch (err) {
      process.stdout.write(`ERROR: ${(err as Error).message}\n`);
      errors++;
    }

    // Rate-limit pause (skip after last item)
    if (i < routes.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\nDone: ${imported} imported, ${skipped} skipped, ${errors} errors`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
