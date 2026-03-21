/**
 * GET /api/octo/products/[id]
 * OCTO — single product details with options and units
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOctoAuth, applyOctoRateLimitHeaders } from '@/lib/octo/auth';
import { getProductById, getProductOptions } from '@/lib/octo/service';
import { mapProduct } from '@/lib/octo/mappers';

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
  const product = await getProductById(id);
  if (!product) {
    const response = NextResponse.json(
      { error: 'NOT_FOUND', errorMessage: 'Product not found' },
      { status: 404 }
    );
    return applyOctoRateLimitHeaders(response, authResult);
  }

  const options = await getProductOptions(id);
  const response = NextResponse.json(
    mapProduct(
      product as Parameters<typeof mapProduct>[0],
      options as Parameters<typeof mapProduct>[1]
    )
  );
  return applyOctoRateLimitHeaders(response, authResult);
}
