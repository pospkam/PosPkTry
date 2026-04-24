/**
 * Tochka Bank — SBP QR payments
 * Docs: https://developers.tochka.com/docs/tochka-api/
 *
 * Env vars (добавить в Timeweb):
 *   TOCHKA_CLIENT_ID      — из раздела "Интеграции" в ЛК Точки
 *   TOCHKA_CLIENT_SECRET  — оттуда же
 *   TOCHKA_MERCHANT_ID    — ID торговой точки в СБП (в ЛК Точки → СБП)
 *   TOCHKA_ACCOUNT_ID     — номер счёта/БИК: "40702810XXXXXXXXXX/044525104"
 */

const BASE = 'https://enter.tochka.com/uapi';
const TOKEN_URL = 'https://enter.tochka.com/connect/token';

// ── OAuth2 token cache ─────────────────────────────────────────────

let _token: string | null = null;
let _tokenExpiry = 0;

async function getAccessToken(): Promise<string | null> {
  if (_token && Date.now() < _tokenExpiry - 30_000) return _token;

  try {
    const clientId     = process.env.TOCHKA_CLIENT_ID;
    const clientSecret = process.env.TOCHKA_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      console.error('[tochka] TOCHKA_CLIENT_ID / TOCHKA_CLIENT_SECRET не заданы');
      return null;
    }

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
        scope:         'accounts sbp payments EditSBPData ReadSBPData',
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[tochka] OAuth error ${res.status}: ${err}`);
      return null;
    }

    const data = await res.json() as { access_token: string; expires_in: number };
    _token = data.access_token;
    _tokenExpiry = Date.now() + data.expires_in * 1000;
    return _token;
  } catch (err) {
    console.error('[tochka] getAccessToken failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Типы ──────────────────────────────────────────────────────────

export interface TochkaQRResult {
  qrId:     string;   // уникальный ID QR-кода в СБП
  qrCode:   string;   // base64-изображение QR
  qrLink:   string;   // ссылка для оплаты (открыть в приложении банка)
  payload:  string;   // строка СБП для ручного копирования
  expiresAt: Date;
}

export interface TochkaPaymentStatus {
  qrId:    string;
  status:  'pending' | 'paid' | 'expired' | 'cancelled';
  amount?: number;
  paidAt?: Date;
}

// ── Создать динамический QR-код для оплаты ─────────────────────────

export async function createSBPQR(opts: {
  amountRub:   number;   // сумма в рублях
  description: string;   // назначение платежа
  ttlMinutes?: number;   // время жизни QR (по умолчанию 60 мин)
  bookingId?:  number;   // для идентификации платежа
}): Promise<TochkaQRResult | null> {
  const merchantId = process.env.TOCHKA_MERCHANT_ID;
  const accountId  = process.env.TOCHKA_ACCOUNT_ID;
  if (!merchantId || !accountId) {
    console.error('[tochka] TOCHKA_MERCHANT_ID / TOCHKA_ACCOUNT_ID не заданы');
    return null;
  }

  const token = await getAccessToken();
  if (!token) return null;

  const ttl   = opts.ttlMinutes ?? 60;

  try {
    const body = {
      amount:      Math.round(opts.amountRub * 100), // в копейках
      currency:    'RUB',
      description: opts.description.slice(0, 140),
      ttl,
      ...(opts.bookingId ? { order: String(opts.bookingId) } : {}),
    };

    const res = await fetch(
      `${BASE}/sbp/v1.0/qr-code/merchant/${merchantId}/account/${encodeURIComponent(accountId)}`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
        },
        body:   JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`[tochka] QR error ${res.status}: ${err}`);
      return null;
    }

    const data = await res.json() as {
      qrcId:      string;
      image:      { content: string };  // base64 PNG
      payload:    string;               // СБП payload
      qrLink?:    string;
      expirationDate?: string;
    };

    const expiresAt = data.expirationDate
      ? new Date(data.expirationDate)
      : new Date(Date.now() + ttl * 60 * 1000);

    return {
      qrId:     data.qrcId,
      qrCode:   data.image.content,
      qrLink:   data.qrLink ?? `https://qr.nspk.ru/${data.qrcId}`,
      payload:  data.payload,
      expiresAt,
    };
  } catch (err) {
    console.error('[tochka] createSBPQR failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Статус платежа ─────────────────────────────────────────────────

export async function getSBPPaymentStatus(qrId: string): Promise<TochkaPaymentStatus | null> {
  const merchantId = process.env.TOCHKA_MERCHANT_ID;
  if (!merchantId) {
    console.error('[tochka] TOCHKA_MERCHANT_ID не задан');
    return null;
  }

  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(
      `${BASE}/sbp/v1.0/qr-code/merchant/${merchantId}/payment-status/${encodeURIComponent(qrId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal:  AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`[tochka] status error ${res.status}: ${err}`);
      return null;
    }

    const data = await res.json() as {
      qrcId:  string;
      status: string;
      amount?: number;
      transactionDate?: string;
    };

    const statusMap: Record<string, TochkaPaymentStatus['status']> = {
      'CREATED':   'pending',
      'OPERWAIT':  'pending',
      'PAID':      'paid',
      'EXPIRED':   'expired',
      'CANCELLED': 'cancelled',
      'REJECTED':  'cancelled',
    };

    return {
      qrId:    data.qrcId,
      status:  statusMap[data.status] ?? 'pending',
      amount:  data.amount ? data.amount / 100 : undefined,
      paidAt:  data.transactionDate ? new Date(data.transactionDate) : undefined,
    };
  } catch (err) {
    console.error('[tochka] getSBPPaymentStatus failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Проверка наличия конфига ───────────────────────────────────────

export function isTochkaConfigured(): boolean {
  return !!(
    process.env.TOCHKA_CLIENT_ID &&
    process.env.TOCHKA_CLIENT_SECRET &&
    process.env.TOCHKA_MERCHANT_ID &&
    process.env.TOCHKA_ACCOUNT_ID
  );
}
