import crypto from 'node:crypto';

const BASE = 'https://api.binance.com';

export interface DepositRecord {
  amount: string;
  coin: string;
  network: string;
  status: number; // 0=pending, 1=done
  address: string;
  txId: string;
  insertTime: number;
}

export interface UsdtBalance {
  free: string;
  locked: string;
  total: string;
}

export interface DepositAddress {
  address: string;
  tag: string;
  network: string;
}

function sign(query: string): string {
  const secret = process.env.BINANCE_API_SECRET;
  if (!secret) throw new Error('BINANCE_API_SECRET не настроен');
  return crypto.createHmac('sha256', secret).update(query).digest('hex');
}

async function binanceGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = process.env.BINANCE_API_KEY;
  if (!key) throw new Error('BINANCE_API_KEY не настроен');

  const ts = Date.now().toString();
  const qsBase = new URLSearchParams({ ...params, timestamp: ts }).toString();
  const sig = sign(qsBase);
  const url = `${BASE}${path}?${qsBase}&signature=${sig}`;

  const res = await fetch(url, {
    headers: { 'X-MBX-APIKEY': key },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Binance ${path}: HTTP ${res.status} — ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

export async function getUsdtBalance(): Promise<UsdtBalance> {
  const data = await binanceGet<{ balances: { asset: string; free: string; locked: string }[] }>(
    '/api/v3/account'
  );
  const usdt = data.balances.find((b) => b.asset === 'USDT') ?? { free: '0', locked: '0' };
  const free = parseFloat(usdt.free);
  const locked = parseFloat(usdt.locked);
  return {
    free: free.toFixed(2),
    locked: locked.toFixed(2),
    total: (free + locked).toFixed(2),
  };
}

export async function getDepositAddress(network: 'TRC20' | 'BEP20' = 'TRC20'): Promise<DepositAddress> {
  const data = await binanceGet<{ address: string; tag: string; coin: string; url: string }>(
    '/sapi/v1/capital/deposit/address',
    { coin: 'USDT', network }
  );
  return { address: data.address, tag: data.tag ?? '', network };
}

export async function getDepositHistory(limit = 10): Promise<DepositRecord[]> {
  const data = await binanceGet<DepositRecord[]>('/sapi/v1/capital/deposit/hisrec', {
    coin: 'USDT',
    limit: String(limit),
  });
  return Array.isArray(data) ? data : [];
}

export async function getUsdtRubRate(): Promise<number> {
  // Публичный endpoint — без подписи
  const key = process.env.BINANCE_API_KEY;
  if (!key) throw new Error('BINANCE_API_KEY не настроен');

  const res = await fetch(`${BASE}/api/v3/ticker/price?symbol=USDTRUB`, {
    headers: { 'X-MBX-APIKEY': key },
    cache: 'no-store',
  });
  if (!res.ok) return 0;
  const data = (await res.json()) as { price?: string };
  return data.price ? parseFloat(data.price) : 0;
}

export function isBinanceConfigured(): boolean {
  return Boolean(process.env.BINANCE_API_KEY && process.env.BINANCE_API_SECRET);
}
