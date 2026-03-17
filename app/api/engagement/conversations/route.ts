import { NextResponse } from 'next/server'

const DEPRECATED_MESSAGE =
  'Endpoint /api/engagement/conversations отключен. Используйте /api/chat/conversations.'

export async function GET() {
  return NextResponse.json({ error: DEPRECATED_MESSAGE }, { status: 410 })
}

export async function POST() {
  return NextResponse.json({ error: DEPRECATED_MESSAGE }, { status: 410 })
}
