import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEPRECATED_MESSAGE =
  'Legacy endpoint /api/chat отключен. Используйте /api/chat/conversations для user-to-user чатов и /api/ai/chat для AI-помощника.';

export async function GET() {
  return NextResponse.json({ error: DEPRECATED_MESSAGE }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: DEPRECATED_MESSAGE }, { status: 410 });
}