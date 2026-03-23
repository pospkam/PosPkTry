/**
 * GET  /api/hub/admin/support/tickets — список тикетов поддержки
 * Фильтры: ?status=open&category=billing
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { listTickets } from '@/lib/support/ticket.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authOrResponse = await requireAdmin(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const { searchParams } = request.nextUrl;
  const status   = searchParams.get('status') ?? undefined;
  const category = searchParams.get('category') ?? undefined;

  const tickets = await listTickets({ status, category });
  return NextResponse.json({ success: true, data: tickets });
}
