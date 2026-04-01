/**
 * GET /api/tours/export
 * Tour export feed for external platforms (Tripster, Sputnik8, GetYourGuide)
 *
 * Query params:
 *   ?operator=fishingkam     — filter by operator slug
 *   ?format=json|xml         — output format (default: json)
 *   ?lang=ru|en              — language (default: ru)
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

interface TourExportRow {
  id: string;
  name: string;
  description: string;
  price: string;
  duration: number;
  difficulty: string;
  category: string;
  max_group_size: number | null;
  min_group_size: number | null;
  op_name: string;
  op_slug: string;
  op_phone: string | null;
  op_email: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const operatorSlug = searchParams.get('operator');
  const format = searchParams.get('format') || 'json';

  const conditions = ['t.is_active = true', 'p.is_public = true', 'p.slug IS NOT NULL'];
  const params: unknown[] = [];

  if (operatorSlug) {
    conditions.push(`p.slug = $${params.length + 1}`);
    params.push(operatorSlug);
  }

  const result = await pool.query<TourExportRow>(
    `SELECT
       t.id,
       t.name,
       t.description,
       t.price::text,
       t.duration,
       t.difficulty,
       t.category,
       t.max_group_size,
       t.min_group_size,
       p.name as op_name,
       p.slug as op_slug,
       p.contact->>'phone' as op_phone,
       p.contact->>'email' as op_email
     FROM tours t
     JOIN partners p ON t.operator_id = p.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.name, t.name`,
    params
  );

  const tours = result.rows.map(t => ({
    id: t.id,
    title: t.name,
    description: t.description,
    price: {
      amount: parseFloat(t.price),
      currency: 'RUB',
      per: 'person',
    },
    duration: {
      hours: t.duration,
      days: Math.ceil(t.duration / 24),
    },
    difficulty: t.difficulty,
    category: t.category,
    group: {
      min: t.min_group_size || 1,
      max: t.max_group_size || 10,
    },
    location: {
      city: 'Петропавловск-Камчатский',
      region: 'Камчатский край',
      country: 'Россия',
      lat: 53.0475,
      lng: 158.6482,
    },
    operator: {
      name: t.op_name,
      slug: t.op_slug,
      phone: t.op_phone,
      email: t.op_email,
      url: `https://tourhab.ru/operators/${t.op_slug}`,
    },
    booking_url: `https://tourhab.ru/routes`,
    platform: 'tourhab.ru',
    updated_at: new Date().toISOString(),
  }));

  if (format === 'xml') {
    const xml = buildXML(tours);
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  return NextResponse.json({
    source: 'tourhab.ru',
    generated_at: new Date().toISOString(),
    total: tours.length,
    tours,
  }, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}

function buildXML(tours: ReturnType<typeof Array.prototype.map>): string {
  const items = (tours as {
    id: string;
    title: string;
    description: string;
    price: { amount: number; currency: string };
    duration: { hours: number; days: number };
    difficulty: string;
    operator: { name: string; url: string; phone: string | null; email: string | null };
    booking_url: string;
  }[]).map(t => `
    <tour>
      <id>${t.id}</id>
      <title><![CDATA[${t.title}]]></title>
      <description><![CDATA[${t.description || ''}]]></description>
      <price currency="${t.price.currency}">${t.price.amount}</price>
      <duration_hours>${t.duration.hours}</duration_hours>
      <duration_days>${t.duration.days}</duration_days>
      <difficulty>${t.difficulty}</difficulty>
      <operator>
        <name><![CDATA[${t.operator.name}]]></name>
        <url>${t.operator.url}</url>
        <phone>${t.operator.phone || ''}</phone>
        <email>${t.operator.email || ''}</email>
      </operator>
      <booking_url>${t.booking_url}</booking_url>
    </tour>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<tours generated="${new Date().toISOString()}" source="tourhab.ru">
  ${items}
</tours>`;
}
