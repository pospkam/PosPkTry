/**
 * scripts/enrich-idilesom-descriptions.ts
 *
 * Rewrites short/generic descriptions for places imported from idilesom.com
 * using AI to produce rich, engaging travel-guide quality text in Russian.
 *
 * Usage:
 *   npx tsx scripts/enrich-idilesom-descriptions.ts --dry-run
 *   npx tsx scripts/enrich-idilesom-descriptions.ts --limit 20
 *   npx tsx scripts/enrich-idilesom-descriptions.ts
 */

import { pool } from '../lib/db-pool';
import { callAIFast } from '../lib/ai/providers';
import type { ChatMessage } from '../lib/ai/prompts';

const isDryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find(a => a.startsWith('--limit'));
const LIMIT = limitArg ? parseInt(limitArg.split(/[\s=]/)[1] ?? '30') : 30;
const DELAY_MS = 2500;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

interface Place {
  id: string;
  ark_id: string;
  name: string;
  description: string | null;
  location_type: string | null;
  lat: number;
  lng: number;
  zone: string | null;
  eco_zone: string | null;
}

async function loadPlaces(): Promise<Place[]> {
  const { rows } = await pool.query(`
    SELECT id, ark_id, name, description, location_type,
           lat::float, lng::float, zone, eco_zone
    FROM places
    WHERE is_visible = true
      AND source_name = 'idilesom.com'
      AND (
        description IS NULL
        OR length(description) < 200
        OR description ILIKE '%объект%'
        OR description ILIKE '%место%'
        OR description ILIKE '%посетить%'
      )
    ORDER BY name
    LIMIT $1
  `, [LIMIT]);
  return rows as Place[];
}

const ZONE_CONTEXT: Record<string, string> = {
  federal_reserve: 'Находится на территории Кроноцкого государственного заповедника.',
  natural_park: 'Находится на территории природного парка Камчатки.',
  zakaznik: 'Находится на территории государственного природного заказника.',
  UNESCO: 'Объект Всемирного природного наследия ЮНЕСКО «Вулканы Камчатки».',
};

const TYPE_CONTEXT: Record<string, string> = {
  volcano: 'Вулкан Камчатки',
  hot_spring: 'Термальный источник',
  lake: 'Озеро',
  waterfall: 'Водопад',
  mountain: 'Горный массив',
  bay: 'Бухта',
  cape: 'Мыс',
  river: 'Река',
  cave: 'Пещера',
  beach: 'Пляж',
  viewpoint: 'Смотровая площадка',
  island: 'Остров',
  forest: 'Природная территория',
  geyser: 'Гейзерное поле',
  glacier: 'Ледник',
  other: 'Природный объект',
};

function buildPrompt(place: Place): ChatMessage[] {
  const typeLabel = TYPE_CONTEXT[place.location_type ?? 'other'] ?? 'Природный объект';
  const zoneNote = place.eco_zone && ZONE_CONTEXT[place.eco_zone] ? ZONE_CONTEXT[place.eco_zone] : '';
  const rawDesc = (place.description ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 400);

  return [
    {
      role: 'system',
      content: `Ты — редактор контента для премиальной туристической платформы Камчатки.
Пиши описания мест в стиле лучших travel-гидов: живо, образно, с акцентом на уникальность природы Камчатки.
Не используй шаблонные фразы ("обязательно посетите", "вас ждёт", "не оставит равнодушным").
Пиши конкретно и точно. Русский язык, грамотно.
Объём: 3-4 предложения (200-350 символов).
Отвечай ТОЛЬКО текстом описания, без кавычек, без JSON, без пояснений.`,
    },
    {
      role: 'user',
      content: `Место: ${place.name}
Тип: ${typeLabel}
Район: ${place.zone ?? 'Камчатка'}
Координаты: ${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}
${zoneNote ? `Охрана: ${zoneNote}` : ''}
Исходное описание: ${rawDesc || '(нет данных)'}

Напиши новое описание места для туриста с рюкзаком.`,
    },
  ];
}

async function main() {
  const places = await loadPlaces();
  console.log(`Found ${places.length} places to enrich (limit=${LIMIT})`);
  if (isDryRun) console.log('[DRY RUN — no DB writes]');

  let ok = 0, errors = 0;

  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    process.stdout.write(`[${i + 1}/${places.length}] "${p.name.slice(0, 50)}" ... `);

    try {
      const messages = buildPrompt(p);
      const result = await callAIFast(messages);
      const newDesc = result.trim().replace(/^["«]|["»]$/g, '').trim();

      if (newDesc.length < 50) {
        process.stdout.write(`skip (too short: ${newDesc.length} chars)\n`);
        errors++;
      } else {
        if (!isDryRun) {
          await pool.query(
            `UPDATE places SET description = $1 WHERE id = $2`,
            [newDesc, p.id]
          );
        }
        process.stdout.write(`OK (${newDesc.length} chars)\n`);
        ok++;
      }
    } catch (err) {
      process.stdout.write(`ERROR: ${(err as Error).message.slice(0, 60)}\n`);
      errors++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nDone: ${ok} enriched, ${errors} errors`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
