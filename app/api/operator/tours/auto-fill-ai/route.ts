/**
 * POST /api/operator/tours/auto-fill-ai
 * AI agent to auto-fill missing tour fields based on existing data
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { requireOperator } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

interface TourData {
  id: string;
  title: string;
  description: string;
  activity_type: string;
  location_type: string;
  latitude?: number;
  longitude?: number;
}

interface AIFillResult {
  short_description?: string;
  difficulty?: string;
  included?: string[];
  not_included?: string[];
  what_to_bring?: string[];
  duration_hours?: number;
  duration_type?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

async function generateTourFills(tour: TourData): Promise<AIFillResult> {
  const kamchatkaLocations = `
Known Kamchatka fishing spots:
- Kurilskoye Lake (56.0333°N, 157.4667°E) — salmon, brown bears
- Ozernaya River (56.5000°N, 157.7500°E) — trout, scenic canyons
- Avacha River (53.0000°N, 158.6667°E) — salmon, thermal springs nearby
- Khalzhina River (56.8000°N, 160.5000°E) — spawning runs
- Avachinsky Volcano base (53.2533°N, 158.8361°E) — trekking with thermal springs
- Petropavlovsk-Kamchatsky harbor (53.0281°N, 158.6523°E) — boat trips, wildlife
- Three Volcanoes: Koryaksky (53.5081°N, 158.8722°E), Avachinsky, Kozelsky (53.2281°N, 158.8611°E)
- Geysers of Kamchatka (54.0°N, 160.0°E) — geothermal fields, hiking
- Nalychevo Valley (53.8000°N, 159.0000°E) — hot springs, salmon fishing`;

  const prompt = `You are an expert travel guide assistant for Kamchatka tours. Analyze this tour and generate realistic field values in JSON format.

Tour Information:
- Title: ${tour.title}
- Description: ${tour.description}
- Activity Type: ${tour.activity_type}
- Location Type: ${tour.location_type}

${kamchatkaLocations}

Generate the following JSON object with realistic values (respond ONLY with valid JSON, no markdown):
{
  "short_description": "One sentence summary (max 100 chars)",
  "difficulty": "easy|moderate|hard",
  "included": ["item1", "item2", "item3"],
  "not_included": ["item1", "item2"],
  "what_to_bring": ["item1", "item2", "item3", "item4"],
  "duration_hours": 4.5,
  "duration_type": "day|half_day|multi_day",
  "location_name": "Name of the specific place/lake/river/volcano",
  "latitude": 56.1234,
  "longitude": 159.5678,
  "notes": "Interesting fact or local knowledge about this tour"
}

Rules:
- difficulty: must be one of easy, moderate, hard
- duration_type: day (full day), half_day (2-4h), multi_day (3+ days)
- Generate realistic, specific items not generic ones
- Focus on what would be needed for this type of activity
- Keep arrays to 3-5 items max
- For fishing: include rod, license, waders, bait, etc
- For trekking: include water, sunscreen, proper shoes, etc
- location_name: choose a specific place from Kamchatka (lake, river, volcano, geysers)
- latitude/longitude: must be realistic Kamchatka coordinates (50-60°N, 155-165°E)
- notes: include useful local knowledge about the location or activity season`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  const responseText =
    data.content[0]?.type === 'text' ? data.content[0].text : '{}';

  // Parse JSON response
  const parsed = JSON.parse(responseText);

  return {
    short_description: parsed.short_description || undefined,
    difficulty: parsed.difficulty || undefined,
    included: parsed.included || undefined,
    not_included: parsed.not_included || undefined,
    what_to_bring: parsed.what_to_bring || undefined,
    duration_hours: parsed.duration_hours || undefined,
    duration_type: parsed.duration_type || undefined,
    location_name: parsed.location_name || undefined,
    latitude: parsed.latitude || undefined,
    longitude: parsed.longitude || undefined,
    notes: parsed.notes || undefined,
  };
}

export async function POST(request: NextRequest) {
  const userOrResponse = await requireOperator(request);
  if (userOrResponse instanceof NextResponse) {
    return userOrResponse;
  }

  const userId = userOrResponse.userId;

  try {
    const partnerRes = await pool.query<{ id: string }>(
      `SELECT id FROM partners WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    const operatorId = partnerRes.rows[0]?.id;
    if (!operatorId) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 403 });
    }

    const body = await request.json();
    const { tourId } = body;

    if (!tourId) {
      return NextResponse.json({ error: 'Missing tourId' }, { status: 400 });
    }

    // Get tour data
    const { rows: tours } = await pool.query<TourData>(
      `SELECT id, title, description, activity_type, location_type
       FROM operator_tours
       WHERE id = $1 AND operator_id = $2 AND deleted_at IS NULL`,
      [tourId, operatorId]
    );

    if (tours.length === 0) {
      return NextResponse.json(
        { error: 'Tour not found' },
        { status: 404 }
      );
    }

    const tour = tours[0];

    // Validate required fields exist
    if (!tour.title || !tour.description) {
      return NextResponse.json(
        {
          error: 'Tour must have title and description before AI fill',
        },
        { status: 400 }
      );
    }

    // Generate fills with AI
    const fills = await generateTourFills(tour);

    // Update tour with AI-generated data
    const updates: Record<string, string | number | boolean | null> = {};
    const values: (string | number | boolean | null | string[])[] = [];
    let paramIndex = 1;

    if (fills.short_description) {
      updates[`short_description`] = `$${paramIndex++}`;
      values.push(fills.short_description);
    }
    if (fills.difficulty) {
      updates[`difficulty`] = `$${paramIndex++}`;
      values.push(fills.difficulty);
    }
    if (fills.included) {
      updates[`included`] = `$${paramIndex++}`;
      values.push(fills.included);
    }
    if (fills.not_included) {
      updates[`not_included`] = `$${paramIndex++}`;
      values.push(fills.not_included);
    }
    if (fills.what_to_bring) {
      updates[`what_to_bring`] = `$${paramIndex++}`;
      values.push(fills.what_to_bring);
    }
    if (fills.duration_hours) {
      updates[`duration_hours`] = `$${paramIndex++}`;
      values.push(fills.duration_hours);
    }
    if (fills.duration_type) {
      updates[`duration_type`] = `$${paramIndex++}`;
      values.push(fills.duration_type);
    }
    if (fills.location_name) {
      updates[`location_name`] = `$${paramIndex++}`;
      values.push(fills.location_name);
    }
    if (fills.latitude) {
      updates[`latitude`] = `$${paramIndex++}`;
      values.push(fills.latitude);
    }
    if (fills.longitude) {
      updates[`longitude`] = `$${paramIndex++}`;
      values.push(fills.longitude);
    }
    if (fills.notes) {
      updates[`notes`] = `$${paramIndex++}`;
      values.push(fills.notes);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: true,
        data: { filled: 0, fills: {} },
      });
    }

    const setClause = Object.entries(updates)
      .map(([key, val]) => `${key} = ${val}`)
      .join(', ');

    values.push(tourId);
    const updateQuery = `
      UPDATE operator_tours
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING short_description, difficulty, included, not_included, what_to_bring, duration_hours, duration_type, location_name, latitude, longitude, notes
    `;

    const { rows: updated } = await pool.query(updateQuery, values);

    return NextResponse.json({
      success: true,
      data: {
        filled: Object.keys(updates).length,
        fills: {
          short_description: fills.short_description,
          difficulty: fills.difficulty,
          included: fills.included,
          not_included: fills.not_included,
          what_to_bring: fills.what_to_bring,
          duration_hours: fills.duration_hours,
          duration_type: fills.duration_type,
          location_name: fills.location_name,
          latitude: fills.latitude,
          longitude: fills.longitude,
          notes: fills.notes,
        },
      },
    });
  } catch (error) {

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'AI generated invalid response, please try again' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to auto-fill tour' },
      { status: 500 }
    );
  }
}
