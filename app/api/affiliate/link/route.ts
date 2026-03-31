/**
 * POST /api/affiliate/link
 * Server-side proxy to TravelPayouts API.
 * Keeps API token secret, never exposed to client.
 *
 * Body: { url: string, sub_id?: string }
 * Response: { affiliate_url: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { toAffiliateLink } from '@/lib/services/travelpayouts';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  url:    z.string().url().max(2000),
  sub_id: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 });
  }

  const result = await toAffiliateLink(parsed.data.url, parsed.data.sub_id);
  return NextResponse.json({ affiliate_url: result.affiliate_url });
}
