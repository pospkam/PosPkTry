/**
 * GET /api/channels/avito/feed
 * XML-фид для Авито Автозагрузки
 *
 * Регистрируй этот URL в личном кабинете Авито:
 *   Настройки → Автозагрузка → Добавить фид
 *   URL: https://tourhab.ru/api/channels/avito/feed
 *
 * Авито обновляет фид каждые 2-4 часа автоматически.
 */

import { pool } from '@/lib/db-pool';
import { generateAvitoXmlFeed } from '@/lib/channels/avito';
import type { ChannelTour } from '@/lib/channels/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query<{
      id: number; title: string; description: string | null;
      short_description: string | null; activity_type: string;
      location_name: string | null; latitude: number | null;
      longitude: number | null; base_price: string;
      max_participants: number; duration_hours: number | null;
      difficulty: string | null; photos: string[] | null;
      included: unknown; season_start: string | null;
      season_end: string | null; tripster_experience_id: string | null;
      avito_listing_id: string | null; sputnik8_product_id: string | null;
    }>(`
      SELECT
        ot.id, ot.title, ot.description, ot.short_description,
        ot.activity_type, ot.location_name, ot.latitude, ot.longitude,
        ot.base_price, ot.max_participants, ot.duration_hours,
        ot.difficulty, ot.photos, ot.included,
        ot.season_start::text, ot.season_end::text,
        ot.tripster_experience_id, ot.avito_listing_id, ot.sputnik8_product_id
      FROM operator_tours ot
      WHERE ot.is_active = true
        AND ot.is_published = true
        AND ot.deleted_at IS NULL
      ORDER BY ot.id
    `);

    const tours: ChannelTour[] = result.rows.map(r => ({
      id:                     r.id,
      title:                  r.title,
      description:            r.description,
      short_description:      r.short_description,
      activity_type:          r.activity_type ?? '',
      location_name:          r.location_name,
      latitude:               r.latitude ? Number(r.latitude) : null,
      longitude:              r.longitude ? Number(r.longitude) : null,
      base_price:             Number(r.base_price),
      max_participants:       r.max_participants,
      duration_hours:         r.duration_hours ? Number(r.duration_hours) : null,
      difficulty:             r.difficulty,
      photos:                 Array.isArray(r.photos) ? r.photos : [],
      included:               Array.isArray(r.included) ? r.included as string[] : [],
      season_start:           r.season_start,
      season_end:             r.season_end,
      tripster_experience_id: r.tripster_experience_id,
      avito_listing_id:       r.avito_listing_id,
      sputnik8_product_id:    r.sputnik8_product_id,
    }));

    const xml = generateAvitoXmlFeed(tours);

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',  // кешируем 1 час
      },
    });
  } catch (e) {
    return new Response(`<?xml version="1.0"?><error>${(e as Error).message}</error>`, {
      status: 500,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
