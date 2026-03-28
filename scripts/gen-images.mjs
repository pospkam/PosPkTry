/**
 * One-off script: batch AI image generation for all routes without images.
 * Runs directly against DB, no auth needed.
 * Usage: node scripts/gen-images.mjs
 */

import pg from 'pg';

const DB_URL = process.env.DATABASE_URL || 'postgresql://gen_user:b%3E%3DPHE1g40PUL%23@8ad609fcbfd2ad0bd069be47.twc1.net:5432/default_db?sslmode=no-verify';
const BATCH = parseInt(process.env.BATCH ?? '20', 10);

const pool = new pg.Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

const TYPE_PROMPTS = {
  volcano: 'dramatic aerial view of active Kamchatka volcano Russia, volcanic eruption with lava glow and ash column, pyroclastic flows, epic volcanic landscape, golden sunset light, National Geographic style',
  geyser: 'powerful geyser eruption in Valley of Geysers Kamchatka Russia, steam column against blue sky, colorful hydrothermal terraces with yellow and orange mineral deposits, crystal clear pools',
  hot_spring: 'natural hot spring thermal pool in Kamchatka wilderness Russia, turquoise steaming water surrounded by snow-capped volcanic mountains, untouched nature, morning mist',
  lake: 'pristine volcanic caldera lake in Kamchatka Russia, crystal clear turquoise water reflecting snow-capped peaks, wildflowers on shore, dramatic mountain backdrop, landscape photography',
  mountain: 'dramatic snow-capped volcanic mountain ridge in Kamchatka Russia, rocky peaks above clouds, alpine tundra with wildflowers, vast wilderness, golden hour',
  forest: 'ancient birch and pine forest in Kamchatka Russia, misty morning sunlight through trees, volcanic mountains visible in background, wild mushrooms and mosses, peaceful atmosphere',
  beach: 'dramatic black volcanic sand beach in Kamchatka Russia, powerful Pacific Ocean waves crashing on shore, volcanic cliffs, seabirds in flight, overcast dramatic sky',
  bay: 'Avacha Bay in Kamchatka Russia, calm water with snow-capped volcanic peaks reflection, sea otters floating, fishing boats, dramatic volcanic panorama',
  waterfall: 'powerful waterfall in Kamchatka wilderness Russia, cascading over volcanic basalt rocks, surrounded by lush green vegetation, rainbow in mist, dramatic lighting',
  rock: 'dramatic volcanic sea stacks and rock formations on Kamchatka Pacific coast Russia, crashing ocean waves, seabird colonies nesting on cliffs, dramatic stormy sky',
  island: 'remote volcanic island in Bering Sea near Kamchatka Russia, dramatic cliffs with seabird colonies, marine mammals on rocks, pristine wilderness',
  cape: 'dramatic volcanic cape on Kamchatka Pacific coast Russia, cliffs above ocean, lighthouse, stormy sea, rugged wilderness',
  viewpoint: 'panoramic viewpoint in Kamchatka Russia, breathtaking 360 degree vista of volcanic landscape, volcanic peaks stretching to horizon, clear blue sky, epic scale',
  museum: 'panoramic view of Petropavlovsk-Kamchatsky city Russia, Avacha Bay with volcanic peaks Avachinsky and Koryaksky in background, port and harbor, dramatic clouds',
  historical: 'historical stone monument in Petropavlovsk-Kamchatsky Russia, dramatic overcast sky, Soviet-era memorial architecture, coastal setting',
  settlement: 'traditional Itelmen indigenous village in Kamchatka Russia, wooden buildings, smoke from chimneys, volcanic mountains in background, authentic rural atmosphere',
  thermal: 'active geothermal field in Kamchatka Russia, boiling mud pools and steam vents, colorful sulfur deposits yellow and orange, volcanic landscape',
  other: 'scenic Kamchatka wilderness Russia, volcanic landscape with mountains, untouched nature, dramatic sky, landscape photography',
};
const BASE_STYLE = 'photorealistic landscape photography, 8K ultra-detailed, cinematic composition, no people, no text, no watermarks, no logos';

function buildPrompt(title, locationType, _description) {
  // Use only English type prompt — Pollinations rejects non-ASCII in URL
  const typePrompt = TYPE_PROMPTS[locationType ?? 'other'] ?? TYPE_PROMPTS.other;
  return `${typePrompt}, ${BASE_STYLE}`;
}

function routeSeed(routeId) {
  const hex = routeId.replace(/-/g, '').slice(0, 8);
  return parseInt(hex, 16) % 9_999_999;
}

function buildUrl(_prompt, seed) {
  return `https://picsum.photos/seed/${seed}/1280/720`;
}

async function fetchBytes(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TourHab/1.0' },
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const { rows: todo } = await pool.query(`
    SELECT ark.id, ark.title, ark.location_type, ark.description
    FROM agent_route_knowledge ark
    LEFT JOIN ai_route_images ari ON ari.route_id = ark.id
    WHERE ark.is_visible = TRUE AND ari.route_id IS NULL
    ORDER BY ark.location_type, ark.title
    LIMIT $1
  `, [BATCH]);

  console.log(`Found ${todo.length} routes without images (batch=${BATCH})`);

  let done = 0, failed = 0;
  for (const r of todo) {
    try {
      const prompt = buildPrompt(r.title, r.location_type, r.description);
      const seed = routeSeed(r.id);
      const url = buildUrl(prompt, seed);
      process.stdout.write(`  [${done + failed + 1}/${todo.length}] ${r.title.slice(0, 50)}... `);
      const imageData = await fetchBytes(url);
      await pool.query(
        `INSERT INTO ai_route_images (route_id, image_data, mime_type, prompt, model, width, height)
         VALUES ($1, $2, 'image/jpeg', $3, 'pollinations-flux', 1280, 720)
         ON CONFLICT (route_id) DO NOTHING`,
        [r.id, imageData, prompt],
      );
      done++;
      console.log(`OK (${Math.round(imageData.length / 1024)}KB)`);
    } catch (e) {
      failed++;
      console.log(`FAIL: ${e.message}`);
    }
  }

  // Check remaining
  const { rows: [{ remaining }] } = await pool.query(`
    SELECT COUNT(*)::int AS remaining
    FROM agent_route_knowledge ark
    LEFT JOIN ai_route_images ari ON ari.route_id = ark.id
    WHERE ark.is_visible = TRUE AND ari.route_id IS NULL
  `);

  console.log(`\nDone: ${done} | Failed: ${failed} | Remaining: ${remaining}`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
