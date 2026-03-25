/**
 * GET /api/setup-fishingkam-widget
 * One-time setup: enable widget for fishingkam partner.
 * Remove after use.
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(
      `UPDATE partners
       SET widget_enabled = true,
           widget_config = $1::jsonb,
           widget_domains = $2::text[]
       WHERE slug = 'fishingkam'
       RETURNING id, name, slug, widget_enabled`,
      [
        JSON.stringify({
          greeting: 'Привет! Я AI-помощник по турам на Камчатке. Подберу маршрут, расскажу о рыбалке, ценах и сезонах. Что вас интересует?',
          theme: 'light',
          accentColor: '#D44A0C',
        }),
        ['fishingkam.ru', 'www.fishingkam.ru'],
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Partner fishingkam not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, partner: result.rows[0] });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
