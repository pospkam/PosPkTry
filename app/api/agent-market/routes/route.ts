/**
 * GET /api/agent-market/routes
 *
 * Платный публичный API для AI-агентов: данные маршрутов Камчатки за USDT.
 *
 * Без payment_id → 402 с инструкциями по оплате.
 * С подтверждённым payment_id → JSON маршрутов.
 *
 * Параметры:
 *   query       — фильтр по названию (опционально)
 *   limit       — кол-во маршрутов, макс 50 (по умолчанию 10)
 *   payment_id  — UUID полученный из предыдущего 402-ответа
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

const PRICE_USDT = '0.01';

function getWallet(): string {
  return process.env.AGENT_MARKET_WALLET ?? process.env.BINANCE_DEPOSIT_ADDRESS ?? '';
}

type PaymentRow = {
  payment_id: string;
  status: string;
  expires_at: string;
  wallet_to: string;
  price_usdt: string;
  query_params: Record<string, unknown>;
};

async function fetchPayment(paymentId: string): Promise<PaymentRow | null> {
  const { rows } = await pool.query<PaymentRow>(
    `SELECT payment_id, status, expires_at, wallet_to, price_usdt, query_params
     FROM agent_market_payments WHERE payment_id = $1`,
    [paymentId],
  );
  return rows[0] ?? null;
}

async function createPayment(query: string, limit: number): Promise<string> {
  const wallet = getWallet();
  const { rows } = await pool.query<{ payment_id: string }>(
    `INSERT INTO agent_market_payments (wallet_to, query_params)
     VALUES ($1, $2)
     RETURNING payment_id`,
    [wallet, JSON.stringify({ query, limit })],
  );
  return rows[0].payment_id;
}

async function expireStale(): Promise<void> {
  await pool.query(
    `UPDATE agent_market_payments SET status = 'expired'
     WHERE status = 'pending' AND expires_at < NOW()`,
  );
}

function make402(paymentId: string, wallet: string, hint?: string) {
  return NextResponse.json(
    {
      payment_required: true,
      price_usdt: PRICE_USDT,
      network: 'TRC20',
      wallet,
      payment_id: paymentId,
      expires_in_seconds: 600,
      instructions: [
        `1. Отправьте ${PRICE_USDT} USDT (TRC20) на адрес: ${wallet}`,
        `2. Повторите запрос с параметром: &payment_id=${paymentId}`,
        '3. После подтверждения оператором вы получите данные.',
      ],
      ...(hint ? { hint } : {}),
    },
    { status: 402 },
  );
}

type RouteRow = {
  id: string;
  title: string;
  difficulty: string | null;
  distance_km: number | null;
  duration_hours: number | null;
  activity_type: string | null;
  region: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
};

async function fetchRoutes(query: string, limit: number): Promise<RouteRow[]> {
  const { rows } = await pool.query<RouteRow>(
    `SELECT id, title, difficulty, distance_km, duration_hours,
            activity_type, region, description,
            (geometry->'coordinates'->0->>1)::float AS lat,
            (geometry->'coordinates'->0->>0)::float AS lng
     FROM v_kamchatka_routes_api
     WHERE ($1 = '' OR title ILIKE $2)
     ORDER BY title
     LIMIT $3`,
    [query, `%${query}%`, limit],
  );
  return rows;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('query') ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 50);
  const paymentId = searchParams.get('payment_id');

  void expireStale();

  if (paymentId) {
    const payment = await fetchPayment(paymentId);

    if (!payment) {
      const newId = await createPayment(query, limit);
      return make402(newId, getWallet(), 'payment_id не найден. Создан новый.');
    }

    if (payment.status === 'expired') {
      const newId = await createPayment(query, limit);
      return make402(newId, getWallet(), 'Платёж истёк. Создан новый.');
    }

    if (payment.status === 'pending') {
      return NextResponse.json(
        {
          payment_required: true,
          status: 'pending',
          payment_id: paymentId,
          wallet: payment.wallet_to,
          price_usdt: payment.price_usdt,
          message: 'Платёж ожидает подтверждения оператором. Повторите через 60 секунд.',
        },
        { status: 402 },
      );
    }

    // confirmed — return data
    const params = payment.query_params as { query?: string; limit?: number };
    const routes = await fetchRoutes(params.query ?? query, params.limit ?? limit);
    return NextResponse.json({
      source: 'Volcano OS / TourHab — Kamchatka Routes',
      payment_id: paymentId,
      count: routes.length,
      routes,
    });
  }

  // No payment_id — create and return 402
  const wallet = getWallet();
  if (!wallet) {
    return NextResponse.json(
      { error: 'Agent Market не настроен. Добавьте AGENT_MARKET_WALLET в env.' },
      { status: 503 },
    );
  }

  const newId = await createPayment(query, limit);
  return make402(newId, wallet);
}
