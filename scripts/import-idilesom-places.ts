/**
 * scripts/import-idilesom-places.ts
 *
 * Imports places from idilesom.com/kam/places that don't exist in our DB.
 * Matches by name similarity — skips places we already have.
 * Stores GPS track as kamchatka_routes geometry if available.
 *
 * Usage:
 *   npx tsx scripts/import-idilesom-places.ts --dry-run
 *   npx tsx scripts/import-idilesom-places.ts
 */

import { pool } from '../lib/db-pool';
import { createHash } from 'crypto';

const isDryRun = process.argv.includes('--dry-run');
const DELAY_MS = 700;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0',
  'Accept-Language': 'ru-RU,ru;q=0.9',
};

// ─── Fetch all place IDs ──────────────────────────────────────────────────────

async function fetchAllIds(): Promise<string[]> {
  const all = new Set<string>();
  const r1 = await fetch('https://idilesom.com/kam/places', { headers: HEADERS });
  const html = await r1.text();
  (html.match(/\/kam\/places\/(\d+)/g) ?? []).forEach(m => all.add(m.split('/').pop()!));

  for (let page = 2; page <= 30; page++) {
    await sleep(400);
    const res = await fetch(`https://idilesom.com/kam/places?page=${page}`, {
      headers: { ...HEADERS, 'X-Requested-With': 'XMLHttpRequest' },
    });
    const data = await res.json() as { empty?: boolean; list?: string };
    if (data.empty) break;
    (data.list?.match(/\/kam\/places\/(\d+)/g) ?? []).forEach(m => all.add(m.split('/').pop()!));
  }
  return [...all];
}

// ─── Scrape place page ────────────────────────────────────────────────────────

interface IdilesomPlace {
  id: string;
  title: string;
  description: string;
  lat: number | null;
  lng: number | null;
  locationType: string | null;
  sourceUrl: string;
  coordinates: number[][];  // GPS track
}

function detectLocationType(title: string, desc: string): string | null {
  const t = (title + ' ' + desc).toLowerCase();
  if (t.match(/вулкан|сопка|кратер/)) return 'volcano';
  if (t.match(/источник|термаль|гейзер|нарзан/)) return 'hot_spring';
  if (t.match(/озеро|лагуна/)) return 'lake';
  if (t.match(/водопад/)) return 'waterfall';
  if (t.match(/пляж/)) return 'beach';
  if (t.match(/бухта/)) return 'bay';
  if (t.match(/мыс/)) return 'cape';
  if (t.match(/река|ручей/)) return 'river';
  if (t.match(/пещер/)) return 'cave';
  if (t.match(/перевал|хребет|горн|гора|массив/)) return 'mountain';
  if (t.match(/смотров/)) return 'viewpoint';
  if (t.match(/остров/)) return 'island';
  if (t.match(/лес|парк|заповед/)) return 'forest';
  return 'other';
}

async function scrapePage(id: string): Promise<IdilesomPlace | null> {
  const res = await fetch(`https://idilesom.com/kam/places/${id}`, { headers: HEADERS });
  if (!res.ok) return null;
  const html = await res.text();

  // Title from og:title
  const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/)?.[1]?.trim() ?? '';
  const titleFallback = html.match(/<title>([^<]+)/)?.[1]?.split(' Камчатский')[0]?.trim() ?? '';
  const title = ogTitle || titleFallback;
  if (!title) return null;

  // Description
  const ogDesc = html.match(/property="og:description"\s+content="([^"]+)"/)?.[1]?.trim() ?? '';
  const descBlocks = [...html.matchAll(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(t => t.length > 30);
  const description = descBlocks[0] || ogDesc || '';

  // Coordinates
  const latM = html.match(/"latitude"\s*:\s*([\d.]+)/);
  const lngM = html.match(/"longitude"\s*:\s*([\d.]+)/);
  const lat = latM ? parseFloat(latM[1]) : null;
  const lng = lngM ? parseFloat(lngM[1]) : null;

  // GPS track — find largest coordinate array
  const coordBlocks = html.match(/\[\s*\[\s*[\d.]+\s*,\s*[\d.]+[\s\S]*?\]\s*\]/g) ?? [];
  let coordinates: number[][] = [];
  for (const block of coordBlocks) {
    try {
      const parsed = JSON.parse(block) as number[][];
      if (!Array.isArray(parsed) || parsed.length < 3 || !Array.isArray(parsed[0])) continue;
      const isGeoJSON = Math.abs(parsed[0][0]) > 90;
      const coords = isGeoJSON
        ? parsed.map(p => p.length >= 3 ? [p[0], p[1], p[2]] : [p[0], p[1]])
        : parsed.map(p => [p[1], p[0]]);
      if (coords.length > coordinates.length) coordinates = coords;
    } catch { /* skip */ }
  }

  // Center from track if no explicit coords
  let finalLat = lat, finalLng = lng;
  if ((!finalLat || !finalLng) && coordinates.length > 0) {
    const mid = coordinates[Math.floor(coordinates.length / 2)];
    finalLng = mid[0]; finalLat = mid[1];
  }

  if (!finalLat || !finalLng) return null;

  const locationType = detectLocationType(title, description);

  return {
    id,
    title,
    description,
    lat: finalLat,
    lng: finalLng,
    locationType,
    sourceUrl: `https://idilesom.com/kam/places/${id}`,
    coordinates,
  };
}

// ─── Similarity check ─────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSimilar(a: string, b: string): boolean {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return true;
  // Check if key words overlap (3+ letter words)
  const wordsA = na.split(' ').filter(w => w.length >= 4);
  const wordsB = new Set(nb.split(' ').filter(w => w.length >= 4));
  const overlap = wordsA.filter(w => wordsB.has(w)).length;
  return overlap >= 2 || (wordsA.length === 1 && wordsB.has(wordsA[0]));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Load existing place names
  const { rows: existing } = await pool.query<{ name: string; ark_id: string }>(
    `SELECT name, ark_id::text FROM places WHERE is_visible = true`
  );
  const existingNames = existing.map(r => r.name);
  console.log(`Existing places: ${existingNames.length}`);

  console.log('Fetching idilesom IDs...');
  const ids = await fetchAllIds();
  console.log(`idilesom total: ${ids.length} places`);
  if (isDryRun) console.log('[DRY RUN]');

  let imported = 0, skipped = 0, noCoords = 0, errors = 0;

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    process.stdout.write(`[${i + 1}/${ids.length}] `);

    try {
      const place = await scrapePage(id);

      if (!place) {
        process.stdout.write(`no data\n`);
        noCoords++;
        await sleep(DELAY_MS);
        continue;
      }

      // Check for duplicate
      const dup = existingNames.find(n => isSimilar(n, place.title));
      if (dup) {
        process.stdout.write(`skip (exists: "${dup.slice(0, 40)}")\n`);
        skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      if (!isDryRun) {
        const arkId = createHash('md5').update(`idilesom-${id}`).digest('hex')
          .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

        await pool.query(`
          INSERT INTO places (
            ark_id, name, description, lat, lng,
            location_type, source_url, source_name, is_visible
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,'idilesom.com',true)
          ON CONFLICT DO NOTHING
        `, [arkId, place.title, place.description || null,
            place.lat, place.lng, place.locationType, place.sourceUrl]);

        // If has GPS track, also create a kamchatka_route entry
        if (place.coordinates.length >= 3) {
          const geojson = { type: 'LineString', coordinates: place.coordinates, source: 'idilesom' };
          await pool.query(`
            INSERT INTO kamchatka_routes (
              title, description, lat, lng, geometry,
              source_url, source_name, is_visible, dedupe_key
            ) VALUES ($1,$2,$3,$4,$5,$6,'idilesom.com',true,$7)
            ON CONFLICT (dedupe_key) DO NOTHING
          `, [place.title, place.description || null, place.lat, place.lng,
              JSON.stringify(geojson), place.sourceUrl, `idilesom:${id}`]);
        }

        existingNames.push(place.title);
      }

      const pts = place.coordinates.length;
      process.stdout.write(`NEW "${place.title.slice(0, 45)}" [${place.locationType}]${pts > 0 ? ` +${pts}pts` : ''}\n`);
      imported++;
    } catch (err) {
      process.stdout.write(`ERROR: ${(err as Error).message.slice(0, 60)}\n`);
      errors++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nDone: ${imported} new, ${skipped} existed, ${noCoords} no coords, ${errors} errors`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
