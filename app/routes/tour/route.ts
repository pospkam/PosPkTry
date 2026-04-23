/**
 * GET /routes/tour — redirect to /marketplace
 * Legacy route redirect (301 permanent).
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const url = new URL('/marketplace', request.url);
  return NextResponse.redirect(url, 301);
}
