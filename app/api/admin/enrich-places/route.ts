/**
 * POST /api/admin/enrich-places
 * Enriches one batch of place descriptions using AI (literary style).
 * Returns {done, total, results[]}. Call repeatedly until done === total.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { callAIFast } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Schema = z.object({
  batch:  z.number().int().min(1).max(50).default(20),
  force:  z.boolean().default(false),
});

const TYPE_RU: Record<string, string> = {
  volcano: 'вулкан', hot_spring: 'термальный источник', lake: 'озеро',
  waterfall: 'водопад', mountain: 'горный массив', bay: 'бухта',
  cape: 'мыс', river: 'река / каньон', cave: 'пещера', beach: 'пляж',
  viewpoint: 'смотровая площадка', island: 'остров', forest: 'природный парк',
  geyser: 'гейзерное поле', glacier: 'ледник', rock: 'скальный объект',
  historical: 'историческое место', other: 'природный объект',
};

const ECO_NOTE: Record<string, string> = {
  federal_reserve: 'Находится в Кроноцком государственном биосферном заповеднике.',
  natural_park:    'Территория природного парка Камчатки.',
  zakaznik:        'Государственный природный заказник.',
  UNESCO:          'Объект Всемирного природного наследия ЮНЕСКО «Вулканы Камчатки».',
};

function buildPrompt(p: {
  name: string; description: string | null; location_type: string | null;
  lat: number; lng: number; zone: string | null; district: string | null;
  eco_zone: string | null; altitude_m: number | null;
}): ChatMessage[] {
  const type    = TYPE_RU[p.location_type ?? 'other'] ?? 'природный объект';
  const ecoNote = p.eco_zone && ECO_NOTE[p.eco_zone] ? ECO_NOTE[p.eco_zone] : '';
  const altNote = p.altitude_m && p.altitude_m > 100 ? `Высота: ${p.altitude_m} м.` : '';
  const rawDesc = (p.description ?? '').replace(/<[^>]+>/g, '').slice(0, 600);

  return [
    {
      role: 'system',
      content:
        'Ты — автор путеводителя по дикой природе Камчатки. Стиль: литературный, точный, живой — как у Пришвина или Арсеньева. ' +
        'Запрещено: «обязательно посетите», «вас ждёт», «незабываемые», «уникальный», «красивый». ' +
        'Запрещено упоминать сайты, туроператоров, ссылки. ' +
        'Объём: 3–5 предложений (250–450 символов). Только русский текст, без кавычек и заголовков.',
    },
    {
      role: 'user',
      content:
        `Объект: ${p.name}\nТип: ${type}\n` +
        `Район: ${[p.zone, p.district].filter(Boolean).join(', ') || 'Камчатка'}\n` +
        `Координаты: ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}\n` +
        (altNote ? altNote + '\n' : '') +
        (ecoNote ? ecoNote + '\n' : '') +
        `Имеющееся описание: ${rawDesc || '(нет)'}\n\n` +
        'Напиши описание так, будто ты только что вернулся оттуда.',
    },
  ];
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdmin(req);
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const { batch, force } = Schema.parse(body);

  const condition = force
    ? 'is_visible = true'
    : `is_visible = true AND (
         description IS NULL
         OR length(description) < 250
         OR description ILIKE '%idilesom%'
         OR description ILIKE '%topkam%'
         OR description ILIKE '%openstreetmap%'
         OR description ILIKE '%wikipedia.org%'
         OR description ILIKE '%источник:%'
       )`;

  const { rows: pending } = await pool.query(
    `SELECT COUNT(*) AS cnt FROM places WHERE ${condition}`
  );
  const total = Number(pending[0].cnt);

  if (total === 0) {
    return NextResponse.json({ done: 0, total: 0, results: [], message: 'Все описания уже обогащены' });
  }

  const { rows } = await pool.query(`
    SELECT p.id, p.name, p.description, p.location_type,
           p.lat::float, p.lng::float, p.zone, p.district, p.eco_zone,
           sp.altitude_m::int AS altitude_m
    FROM places p
    LEFT JOIN location_safety_profile sp ON sp.agent_route_id = p.ark_id
    WHERE ${condition}
    ORDER BY p.location_type, p.name
    LIMIT $1
  `, [batch]);

  const results: { name: string; status: 'ok' | 'error'; chars?: number; error?: string }[] = [];

  for (const p of rows) {
    try {
      const messages = buildPrompt(p as Parameters<typeof buildPrompt>[0]);
      const text = (await callAIFast(messages)).trim().replace(/^["«»]|["«»]$/g, '').trim();

      if (text.length >= 80) {
        await pool.query(`UPDATE places SET description = $1 WHERE id = $2`, [text, p.id]);
        results.push({ name: p.name as string, status: 'ok', chars: text.length });
      } else {
        results.push({ name: p.name as string, status: 'error', error: `слишком короткий ответ (${text.length})` });
      }
    } catch (err) {
      results.push({ name: p.name as string, status: 'error', error: (err as Error).message.slice(0, 80) });
    }
  }

  const done = results.filter(r => r.status === 'ok').length;
  return NextResponse.json({ done, total, remaining: total - done, results });
}
