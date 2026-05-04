/**
 * scripts/enrich-place-descriptions.ts
 *
 * Rewrites descriptions for ALL visible places in literary, nature-writing style.
 * Removes any mention of source sites, tour operators, commercial language.
 *
 * Usage:
 *   npx tsx scripts/enrich-place-descriptions.ts --dry-run
 *   npx tsx scripts/enrich-place-descriptions.ts --limit 50
 *   npx tsx scripts/enrich-place-descriptions.ts              (all places)
 *   npx tsx scripts/enrich-place-descriptions.ts --force      (rewrite even long descriptions)
 */

import { pool } from '../lib/db-pool';
import { callAIFast } from '../lib/ai/providers';
import type { ChatMessage } from '../lib/ai/prompts';

const isDryRun  = process.argv.includes('--dry-run');
const isForce   = process.argv.includes('--force');
const limitArg  = process.argv.find(a => a.startsWith('--limit'));
const LIMIT     = limitArg ? parseInt(limitArg.split(/[\s=]/)[1] ?? '9999') : 9999;
const DELAY_MS  = 2200;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

interface Place {
  id: string;
  name: string;
  description: string | null;
  location_type: string | null;
  lat: number;
  lng: number;
  zone: string | null;
  district: string | null;
  eco_zone: string | null;
  altitude_m: number | null;
}

async function loadPlaces(): Promise<Place[]> {
  // If --force: all visible places
  // Default: only those without description or with short/generic descriptions
  const condition = isForce
    ? 'p.is_visible = true'
    : `p.is_visible = true AND (
        p.description IS NULL
        OR length(p.description) < 250
        OR p.description ILIKE '%idilesom%'
        OR p.description ILIKE '%topkam%'
        OR p.description ILIKE '%openstreetmap%'
        OR p.description ILIKE '%wikipedia%'
        OR p.description ILIKE '%visitkamchatka%'
        OR p.description ILIKE '%источник:%'
        OR p.description ILIKE '%источник данных%'
      )`;

  const { rows } = await pool.query(`
    SELECT p.id, p.name, p.description, p.location_type,
           p.lat::float, p.lng::float, p.zone, p.district,
           p.eco_zone,
           sp.altitude_m::int AS altitude_m
    FROM places p
    LEFT JOIN location_safety_profile sp ON sp.agent_route_id = p.ark_id
    WHERE ${condition}
    ORDER BY p.location_type, p.name
    LIMIT $1
  `, [LIMIT]);
  return rows as Place[];
}

const TYPE_RU: Record<string, string> = {
  volcano:    'вулкан',
  hot_spring: 'термальный источник',
  lake:       'озеро',
  waterfall:  'водопад',
  mountain:   'горный массив / хребет',
  bay:        'бухта',
  cape:       'мыс',
  river:      'река / каньон',
  cave:       'пещера',
  beach:      'пляж',
  viewpoint:  'смотровая площадка',
  island:     'остров',
  forest:     'природная территория / парк',
  geyser:     'гейзерное поле',
  glacier:    'ледник',
  rock:       'скальный объект',
  historical: 'историческое место',
  museum:     'музей',
  thermal:    'термальная зона',
  other:      'природный объект',
};

const ECO_NOTE: Record<string, string> = {
  federal_reserve: 'Находится в Кроноцком государственном биосферном заповеднике.',
  natural_park:    'Территория природного парка Камчатки.',
  zakaznik:        'Государственный природный заказник — место нереста лосося и зимовки медведей.',
  UNESCO:          'Объект Всемирного природного наследия ЮНЕСКО «Вулканы Камчатки».',
};

function buildPrompt(p: Place): ChatMessage[] {
  const type = TYPE_RU[p.location_type ?? 'other'] ?? 'природный объект';
  const ecoNote = p.eco_zone && ECO_NOTE[p.eco_zone] ? ECO_NOTE[p.eco_zone] : '';
  const altNote = p.altitude_m && p.altitude_m > 100 ? `Высота: ${p.altitude_m} м.` : '';
  const rawDesc = (p.description ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 600);

  return [
    {
      role: 'system',
      content: `Ты — автор путеводителя по дикой природе Камчатки. Пишешь для туристов с рюкзаком, которые хотят знать правду о месте — не рекламу.

Стиль: литературный, точный, живой. Как у Пришвина или Арсеньева — конкретные образы, чувство места, без клише.
Запрещено: "обязательно посетите", "вас ждёт", "незабываемые впечатления", "туристическая жемчужина", "уникальный", "красивый".
Запрещено упоминать любые сайты, источники, туроператоров, ссылки.
Объём: 3–5 предложений (250–450 символов).
Язык: только русский. Отвечай ТОЛЬКО текстом описания — без кавычек, без JSON, без заголовков.`,
    },
    {
      role: 'user',
      content: `Объект: ${p.name}
Тип: ${type}
Район: ${[p.zone, p.district].filter(Boolean).join(', ') || 'Камчатка'}
Координаты: ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}
${altNote}
${ecoNote}
Имеющееся описание: ${rawDesc || '(нет данных)'}

Напиши описание этого места так, как будто ты только что вернулся оттуда.`,
    },
  ];
}

async function main() {
  const places = await loadPlaces();
  console.log(`Places to enrich: ${places.length}${isForce ? ' (--force)' : ''}`);
  if (isDryRun) console.log('[DRY RUN — no writes]');

  let ok = 0, skipped = 0, errors = 0;

  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    process.stdout.write(`[${i + 1}/${places.length}] ${p.name.slice(0, 55).padEnd(55)} `);

    try {
      const messages = buildPrompt(p);
      const text = (await callAIFast(messages)).trim().replace(/^["«»"]|["«»"]$/g, '').trim();

      if (text.length < 80) {
        process.stdout.write(`skip (${text.length} chars)\n`);
        skipped++;
      } else {
        if (!isDryRun) {
          await pool.query(`UPDATE places SET description = $1 WHERE id = $2`, [text, p.id]);
        }
        process.stdout.write(`OK ${text.length}c\n`);
        ok++;
      }
    } catch (err) {
      process.stdout.write(`ERR: ${(err as Error).message.slice(0, 50)}\n`);
      errors++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nDone: ${ok} written, ${skipped} skipped, ${errors} errors`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
