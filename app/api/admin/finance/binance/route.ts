import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import {
  getUsdtBalance,
  getDepositAddress,
  getDepositHistory,
  getUsdtRubRate,
  isBinanceConfigured,
} from '@/lib/payments/binance-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError instanceof NextResponse) return authError;

  if (!isBinanceConfigured()) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  try {
    const [balance, address, deposits, rate] = await Promise.all([
      getUsdtBalance(),
      getDepositAddress('TRC20'),
      getDepositHistory(10),
      getUsdtRubRate(),
    ]);

    return NextResponse.json({
      configured: true,
      balance,
      address,
      rate,
      recentDeposits: deposits,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.json({ configured: true, error: msg }, { status: 502 });
  }
}
