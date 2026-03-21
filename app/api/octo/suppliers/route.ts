/**
 * GET /api/octo/suppliers
 * OCTO — list suppliers (operators with published tours)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOctoAuth, applyOctoRateLimitHeaders } from '@/lib/octo/auth';
import { getSuppliers } from '@/lib/octo/service';
import { mapSupplier } from '@/lib/octo/mappers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await requireOctoAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!authResult.canReadProducts) {
    const response = NextResponse.json(
      { error: 'FORBIDDEN', errorMessage: 'API key lacks product read permission' },
      { status: 403 }
    );
    return applyOctoRateLimitHeaders(response, authResult);
  }

  const rows = await getSuppliers(authResult.operatorId);
  const response = NextResponse.json(rows.map(mapSupplier));
  return applyOctoRateLimitHeaders(response, authResult);
}
