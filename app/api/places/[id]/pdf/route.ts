/**
 * GET /api/places/[id]/pdf
 *
 * Генерирует офлайн-карточку места в формате PDF (A4, ч/б).
 * Содержит: название, GPS, опасности, снаряжение, телефоны МЧС, QR-код.
 * Работает без интернета после скачивания.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { generatePlaceCardPDF } from '@/lib/pdf/place-card-generator';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || id.length < 10) {
    return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });
  }

  try {
    const result = await query(
      `SELECT
         p.id,
         p.ark_id,
         p.name,
         p.location_type,
         p.lat,
         p.lng,
         p.zone,
         p.description,
         sp.altitude_m,
         sp.difficulty_level,
         sp.hazard_types,
         sp.required_gear,
         sp.open_from_date,
         sp.open_to_date,
         sp.registration_required,
         sp.phone_ranger_mches,
         sp.nearest_medical_km,
         sp.sat_communicator_required
       FROM places p
       LEFT JOIN location_safety_profile sp ON sp.agent_route_id = p.ark_id
       WHERE (p.ark_id::text = $1 OR p.id = $1)
         AND p.is_visible = true`,
      [id],
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Место не найдено' }, { status: 404 });
    }

    const r = result.rows[0];

    const pdfBuffer = await generatePlaceCardPDF({
      id:                     r.id as string,
      name:                   r.name as string,
      locationType:           r.location_type as string | null,
      lat:                    Number(r.lat),
      lng:                    Number(r.lng),
      zone:                   r.zone as string | null,
      altitudeM:              r.altitude_m != null ? Number(r.altitude_m) : null,
      difficultyLevel:        r.difficulty_level as string | null,
      hazardTypes:            r.hazard_types as string[] | null,
      requiredGear:           r.required_gear as string[] | null,
      openFromDate:           r.open_from_date as string | null,
      openToDate:             r.open_to_date as string | null,
      registrationRequired:   r.registration_required as boolean | null,
      phoneRangerMches:       r.phone_ranger_mches as string | null,
      nearestMedicalKm:       r.nearest_medical_km != null ? Number(r.nearest_medical_km) : null,
      satCommunicatorRequired: r.sat_communicator_required as boolean | null,
      description:            r.description as string | null,
    });

    const slug = (r.name as string)
      .toLowerCase()
      .replace(/[^а-яёa-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="place-${slug}.pdf"`,
        'Content-Length':      String(pdfBuffer.length),
        'Cache-Control':       'public, max-age=3600',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ошибка генерации PDF' },
      { status: 500 },
    );
  }
}
