/**
 * GET  /api/max/setup  — проверить текущую подписку (webhook)
 * POST /api/max/setup  — зарегистрировать webhook в MAX
 * DELETE /api/max/setup — удалить webhook
 *
 * Admin-only. Docs: https://dev.max.ru/docs-api
 * MAX API: POST https://platform-api.max.ru/subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const MAX_API_BASE = 'https://platform-api.max.ru';

const UPDATE_TYPES = ['bot_started', 'message_created', 'message_callback'];

function getToken(): string | null {
  return process.env.MAX_BOT_TOKEN ?? null;
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: token,
  };
}

// ── GET: проверка текущего статуса подписки ──────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const token = getToken();
  if (!token) {
    return NextResponse.json({ error: 'MAX_BOT_TOKEN not set' }, { status: 500 });
  }

  // GET /subscriptions
  const res = await fetch(`${MAX_API_BASE}/subscriptions`, {
    method: 'GET',
    headers: authHeaders(token),
  });

  const data = await res.json().catch(() => ({}));

  // GET /me — информация о боте
  const meRes = await fetch(`${MAX_API_BASE}/me`, {
    method: 'GET',
    headers: authHeaders(token),
  });
  const meData = await meRes.json().catch(() => ({}));

  return NextResponse.json({
    ok: res.ok,
    bot: meData,
    subscriptions: data,
    expected_webhook: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tourhab.ru'}/api/max/kuzmich`,
  });
}

// ── POST: регистрация webhook ─────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const token = getToken();
  if (!token) {
    return NextResponse.json({ error: 'MAX_BOT_TOKEN not set' }, { status: 500 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? 'https://tourhab.ru';
  const webhookUrl = `${baseUrl}/api/max/kuzmich`;

  // POST /subscriptions — регистрация webhook
  const res = await fetch(`${MAX_API_BASE}/subscriptions`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      url: webhookUrl,
      update_types: UPDATE_TYPES,
    }),
  });

  const data = await res.json().catch(() => ({}));

  return NextResponse.json({
    ok: res.ok,
    status: res.status,
    webhook_url: webhookUrl,
    update_types: UPDATE_TYPES,
    response: data,
  });
}

// ── DELETE: удаление webhook ──────────────────────────────────────────────────

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const token = getToken();
  if (!token) {
    return NextResponse.json({ error: 'MAX_BOT_TOKEN not set' }, { status: 500 });
  }

  const res = await fetch(`${MAX_API_BASE}/subscriptions`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });

  const data = await res.json().catch(() => ({}));

  return NextResponse.json({
    ok: res.ok,
    status: res.status,
    response: data,
  });
}
