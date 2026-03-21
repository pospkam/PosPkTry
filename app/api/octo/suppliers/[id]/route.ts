/**
 * GET /api/octo/suppliers/[id]
 * OCTO — single supplier details
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOctoAuth, applyOctoRateLimitHeaders } from '@/lib/octo/auth';
import { getSupplierById } from '@/lib/octo/service';
import { mapSupplier } from '@/lib/octo/mappers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOctoAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!authResult.canReadProducts) {
    const response = NextResponse.json(
      { error: 'FORBIDDEN', errorMessage: 'API key lacks product read permission' },
      { status: 403 }
    );
    return applyOctoRateLimitHeaders(response, authResult);
  }

  const { id } = await params;
  const supplier = await getSupplierById(id);
  if (!supplier) {
    const response = NextResponse.json(
      { error: 'NOT_FOUND', errorMessage: 'Supplier not found' },
      { status: 404 }
    );
    return applyOctoRateLimitHeaders(response, authResult);
  }

  const response = NextResponse.json(mapSupplier(supplier));
  return applyOctoRateLimitHeaders(response, authResult);
}
