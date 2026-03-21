/**
 * GET /api/octo/products
 * OCTO — list products (published operator tours)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOctoAuth, applyOctoRateLimitHeaders } from '@/lib/octo/auth';
import { getProducts, getProductOptions } from '@/lib/octo/service';
import { mapProduct } from '@/lib/octo/mappers';

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

  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get('supplierId');

  const rows = await getProducts(authResult.operatorId ?? supplierId);
  const products = await Promise.all(
    rows.map(async (row) => {
      const options = await getProductOptions(String(row.id));
      return mapProduct(row as unknown as Parameters<typeof mapProduct>[0], options as unknown as Parameters<typeof mapProduct>[1]);
    })
  );

  const response = NextResponse.json(products);
  return applyOctoRateLimitHeaders(response, authResult);
}
