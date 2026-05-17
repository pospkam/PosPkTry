import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError instanceof NextResponse) return authError;

  const status = request.nextUrl.searchParams.get('status') ?? 'pending';

  const { rows } = await pool.query<{
    payment_id: string;
    query_type: string;
    query_params: Record<string, unknown>;
    price_usdt: string;
    wallet_to: string;
    tx_id: string | null;
    status: string;
    expires_at: string;
    created_at: string;
    confirmed_at: string | null;
    confirmed_by: string | null;
  }>(
    `SELECT payment_id, query_type, query_params, price_usdt, wallet_to,
            tx_id, status, expires_at, created_at, confirmed_at, confirmed_by
     FROM agent_market_payments
     WHERE ($1 = 'all' OR status = $1)
     ORDER BY created_at DESC
     LIMIT 100`,
    [status],
  );

  return NextResponse.json({ payments: rows, count: rows.length });
}

const ConfirmSchema = z.object({
  payment_id: z.string().uuid(),
  tx_id: z.string().optional(),
  confirmed_by: z.string().min(1).default('admin'),
});

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError instanceof NextResponse) return authError;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Невалидный JSON' }, { status: 400 });
  }

  const parsed = ConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ошибка валидации', details: parsed.error.flatten() }, { status: 422 });
  }

  const { payment_id, tx_id, confirmed_by } = parsed.data;

  const { rowCount } = await pool.query(
    `UPDATE agent_market_payments
     SET status = 'confirmed', confirmed_at = NOW(), confirmed_by = $2, tx_id = $3
     WHERE payment_id = $1 AND status = 'pending'`,
    [payment_id, confirmed_by, tx_id ?? null],
  );

  if (!rowCount) {
    return NextResponse.json({ error: 'Платёж не найден или уже обработан' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, payment_id, status: 'confirmed' });
}
