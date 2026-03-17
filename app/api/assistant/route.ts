import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEPRECATED_MESSAGE =
  'Endpoint /api/assistant отключен. Используйте /api/ai/chat.';

export async function GET() {
  return NextResponse.json({ error: DEPRECATED_MESSAGE }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: DEPRECATED_MESSAGE }, { status: 410 });
}
