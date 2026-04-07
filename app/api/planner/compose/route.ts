import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import { getSystemPrompt } from '@/lib/ai/prompts';
import type { ChatMessage } from '@/lib/ai/prompts';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

const plannerLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

const PlannerSchema = z.object({
  message: z.string().min(10).max(500),
  budget: z.number().optional(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!plannerLimiter.check(ip)) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте через минуту.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { message, budget } = PlannerSchema.parse(body);

    // STEP 1: Parse user request with AI
    const parsePrompt = `You are a Kamchatka tour expert. Parse this request and output ONLY valid JSON.

User request: "${message}"

OUTPUT ONLY VALID JSON with these fields (no other text):
{
  "duration_days": <number>,
  "activities": [<string>, ...],
  "preferred_zone": <string or null>,
  "adventure_level": "mild" | "moderate" | "extreme",
  "group_size": <number>
}

Choose activities from: fishing, trekking, helicopter, bears, thermal, snowmobile, boat

Example response:
{
  "duration_days": 3,
  "activities": ["fishing", "trekking"],
  "preferred_zone": null,
  "adventure_level": "moderate",
  "group_size": 2
}`;

    const parseMessages: ChatMessage[] = [
      { role: 'system', content: parsePrompt },
      { role: 'user', content: message },
    ];

    const parseResponse = await callAIWithModelDirect(parseMessages, getModelForAgent('planner'));
    if (!parseResponse) {
      return NextResponse.json({ error: 'AI parsing failed' }, { status: 500 });
    }

    let parsedRequest;
    try {
      const jsonMatch = parseResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      parsedRequest = JSON.parse(jsonMatch[0]);
    } catch (e) {
      return NextResponse.json({ error: 'Failed to parse request' }, { status: 400 });
    }

    // STEP 2: Query reference tours matching criteria
    let sql = `
      SELECT rt.*, o.company_name, o.rating
      FROM reference_tours rt
      JOIN operators o ON rt.operator_id = o.id
      WHERE activity_type = ANY($1)
    `;
    const params: any[] = [parsedRequest.activities];

    if (parsedRequest.preferred_zone) {
      sql += ` AND rt.zone = $${params.length + 1}`;
      params.push(parsedRequest.preferred_zone);
    }

    sql += ` ORDER BY o.rating DESC, rt.created_at DESC LIMIT 20`;

    const result = await query(sql, params);
    const availableTours = result.rows;

    if (!availableTours.length) {
      return NextResponse.json({
        success: true,
        warning: 'No matching tours found',
        suggestion: 'Try different activities or zones',
      });
    }

    // STEP 3: AI composes itinerary
    const toursList = availableTours
      .map((t: any) => {
        return `- ${t.activity_type.toUpperCase()} in ${t.zone} (${t.company_name}): ${t.price_per_person}₽ (${t.duration_hours}h, max ${t.max_participants} people)`;
      })
      .join('\n');

    const composePrompt = `You are a tour composer. Create a ${parsedRequest.duration_days}-day itinerary from available tours.

Available tours:
${toursList}

Requirements:
- Total days: ${parsedRequest.duration_days}
- Activities needed: ${parsedRequest.activities.join(', ')}
- Adventure level: ${parsedRequest.adventure_level}
- Group size: ${parsedRequest.group_size}
${budget ? `- Budget per person: ${budget}₽` : ''}

OUTPUT ONLY VALID JSON (no other text):
{
  "itinerary": [
    {
      "day": <number>,
      "activity": <string>,
      "zone": <string>,
      "duration_h": <number>,
      "price_per_person": <number>,
      "notes": <string>
    }
  ],
  "total_cost_per_person": <number>,
  "summary": <string>
}`;

    const composeMessages: ChatMessage[] = [
      { role: 'system', content: composePrompt },
      { role: 'user', content: 'Create the itinerary' },
    ];

    const composeResponse = await callAIWithModelDirect(composeMessages, getModelForAgent('planner'));
    let composedItinerary;

    try {
      const jsonMatch = composeResponse?.match(/\{[\s\S]*\}/) || null;
      if (!jsonMatch) throw new Error('No JSON in composition');
      composedItinerary = JSON.parse(jsonMatch[0]);
    } catch (e) {
      return NextResponse.json({ error: 'Failed to compose itinerary' }, { status: 400 });
    }

    // STEP 4: Save as draft
    const draftSql = `
      INSERT INTO composite_bookings
      (tourist_id, reference_tour_ids, itinerary, total_cost, status)
      VALUES ($1, $2, $3, $4, 'draft')
      RETURNING id
    `;

    const draftResult = await query(draftSql, [
      0, // Will be set when tourist books
      availableTours.map((t: any) => t.id),
      JSON.stringify(composedItinerary.itinerary),
      composedItinerary.total_cost_per_person || 0,
    ]);

    return NextResponse.json({
      success: true,
      draft_booking_id: draftResult.rows[0].id,
      itinerary: composedItinerary.itinerary,
      total_per_person: composedItinerary.total_cost_per_person,
      summary: composedItinerary.summary,
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to compose tour' },
      { status: 400 }
    );
  }
}
