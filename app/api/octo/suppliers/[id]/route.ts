/**
 * GET /api/octo/suppliers/[id]
 * OCTO — single supplier details
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOctoAuth } from '@/lib/octo/auth';
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
    return NextResponse.json(
      { error: 'FORBIDDEN', errorMessage: 'API key lacks product read permission' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const supplier = await getSupplierById(id);
  if (!supplier) {
    return NextResponse.json(
      { error: 'NOT_FOUND', errorMessage: 'Supplier not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(mapSupplier(supplier));
}
