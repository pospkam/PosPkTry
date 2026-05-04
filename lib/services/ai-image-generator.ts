/**
 * AI Image Generator for TourHab routes.
 * Uses Pollinations.ai (free, no API key, Flux model) as the generation backend.
 * Downloaded images are stored as bytea in ai_route_images table.
 */

import { pool } from '@/lib/db-pool';

// ──────────────────────────────────────────────────────────────
// Prompt builder — English prompts for Kamchatka locations
// ──────────────────────────────────────────────────────────────

const TYPE_PROMPTS: Record<string, string> = {
  volcano:
    'dramatic aerial view of active Kamchatka volcano Russia, volcanic eruption with lava glow and ash column, pyroclastic flows, epic volcanic landscape, golden sunset light, National Geographic style',
  geyser:
    'powerful geyser eruption in Valley of Geysers Kamchatka Russia, steam column against blue sky, colorful hydrothermal terraces with yellow and orange mineral deposits, crystal clear pools',
  hot_spring:
    'natural hot spring thermal pool in Kamchatka wilderness Russia, turquoise steaming water surrounded by snow-capped volcanic mountains, untouched nature, morning mist',
  lake:
    'pristine volcanic caldera lake in Kamchatka Russia, crystal clear turquoise water reflecting snow-capped peaks, wildflowers on shore, dramatic mountain backdrop, landscape photography',
  mountain:
    'dramatic snow-capped volcanic mountain ridge in Kamchatka Russia, rocky peaks above clouds, alpine tundra with wildflowers, vast wilderness, golden hour',
  forest:
    'ancient birch and pine forest in Kamchatka Russia, misty morning sunlight through trees, volcanic mountains visible in background, wild mushrooms and mosses, peaceful atmosphere',
  beach:
    'dramatic black volcanic sand beach in Kamchatka Russia, powerful Pacific Ocean waves crashing on shore, volcanic cliffs, seabirds in flight, overcast dramatic sky',
  bay:
    'Avacha Bay in Kamchatka Russia, calm water with snow-capped volcanic peaks reflection, sea otters floating, fishing boats, dramatic volcanic panorama',
  waterfall:
    'powerful waterfall in Kamchatka wilderness Russia, cascading over volcanic basalt rocks, surrounded by lush green vegetation, rainbow in mist, dramatic lighting',
  rock:
    'dramatic volcanic sea stacks and rock formations on Kamchatka Pacific coast Russia, crashing ocean waves, seabird colonies nesting on cliffs, dramatic stormy sky',
  island:
    'remote volcanic island in Bering Sea near Kamchatka Russia, dramatic cliffs with seabird colonies, marine mammals on rocks, pristine wilderness',
  cape:
    'dramatic volcanic cape on Kamchatka Pacific coast Russia, cliffs above ocean, lighthouse, stormy sea, rugged wilderness',
  viewpoint:
    'panoramic viewpoint in Kamchatka Russia, breathtaking 360 degree vista of volcanic landscape, volcanic peaks stretching to horizon, clear blue sky, epic scale',
  museum:
    'panoramic view of Petropavlovsk-Kamchatsky city Russia, Avacha Bay with volcanic peaks Avachinsky and Koryaksky in background, port and harbor, dramatic clouds',
  historical:
    'historical stone monument in Petropavlovsk-Kamchatsky Russia, dramatic overcast sky, Soviet-era memorial architecture, coastal setting',
  settlement:
    'traditional Itelmen indigenous village in Kamchatka Russia, wooden buildings, smoke from chimneys, volcanic mountains in background, authentic rural atmosphere',
  thermal:
    'active geothermal field in Kamchatka Russia, boiling mud pools and steam vents, colorful sulfur deposits yellow and orange, volcanic landscape',
  other:
    'scenic Kamchatka wilderness Russia, volcanic landscape with mountains, untouched nature, dramatic sky, landscape photography',
};

const BASE_STYLE =
  'photorealistic landscape photography, 8K ultra-detailed, cinematic composition, no people, no text, no watermarks, no logos';

export function buildImagePrompt(
  title: string,
  locationType: string | null,
  description: string,
): string {
  const typePrompt = TYPE_PROMPTS[locationType ?? 'other'] ?? TYPE_PROMPTS.other;
  const descSnippet = description
    .replace(/<[^>]+>/g, '')
    .split(/[.!?]/)[0]
    .trim()
    .slice(0, 120);
  const namePart = title.trim().slice(0, 80);
  return `${typePrompt}, ${namePart}, ${descSnippet ? descSnippet + ', ' : ''}${BASE_STYLE}`;
}

// ──────────────────────────────────────────────────────────────
// Deterministic seed from route UUID (same route → same image)
// ──────────────────────────────────────────────────────────────

function routeSeed(routeId: string): number {
  const hex = routeId.replace(/-/g, '').slice(0, 8);
  return parseInt(hex, 16) % 9_999_999;
}

// ──────────────────────────────────────────────────────────────
// Pollinations.ai URL builder (free, Flux model, no API key)
// ──────────────────────────────────────────────────────────────

export function buildPollinationsUrl(
  prompt: string,
  seed: number,
  width = 1280,
  height = 720,
): string {
  const encodedPrompt = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;
}

// ──────────────────────────────────────────────────────────────
// Fetch image bytes from Pollinations
// ──────────────────────────────────────────────────────────────

async function fetchImageBytes(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TourHab/1.0 (+https://tourhab.ru)' },
    signal: AbortSignal.timeout(60_000), // 60s — first generation is slow
  });
  if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

// ──────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────

export interface GenerateResult {
  routeId: string;
  prompt: string;
  bytes: number;
  cached: boolean;
}

/** Generate and store AI image for a route. Idempotent — skips if already exists. */
export async function generateAndStoreRouteImage(
  routeId: string,
  title: string,
  locationType: string | null,
  description: string,
  force = false,
): Promise<GenerateResult> {
  // Check if already generated
  if (!force) {
    const { rows } = await pool.query(
      'SELECT id FROM ai_route_images WHERE route_id = $1',
      [routeId],
    );
    if (rows.length > 0) {
      return { routeId, prompt: '(cached)', bytes: 0, cached: true };
    }
  }

  const prompt = buildImagePrompt(title, locationType, description);
  const seed = routeSeed(routeId);
  const url = buildPollinationsUrl(prompt, seed);

  const imageData = await fetchImageBytes(url);

  await pool.query(
    `INSERT INTO ai_route_images (route_id, image_data, mime_type, prompt, model, width, height)
     VALUES ($1, $2, 'image/jpeg', $3, 'pollinations-flux', 1280, 720)
     ON CONFLICT (route_id) DO UPDATE
       SET image_data = EXCLUDED.image_data,
           prompt     = EXCLUDED.prompt,
           created_at = NOW()`,
    [routeId, imageData, prompt],
  );

  return { routeId, prompt, bytes: imageData.length, cached: false };
}

/** Check which visible routes already have AI images. */
export async function getRoutesWithoutImages(): Promise<
  Array<{ id: string; title: string; location_type: string | null; description: string }>
> {
  const { rows } = await pool.query(`
    SELECT ark.id, ark.title, ark.location_type, ark.description
    FROM agent_route_knowledge ark
    LEFT JOIN ai_route_images ari ON ari.route_id = ark.id
    WHERE ark.is_visible = TRUE
      AND ari.route_id IS NULL
      AND ark.lat IS NOT NULL
    ORDER BY ark.location_type, ark.title
    LIMIT 500
  `);
  return rows as Array<{ id: string; title: string; location_type: string | null; description: string }>;
}
