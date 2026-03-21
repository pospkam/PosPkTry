/**
 * OCTO Notifications — webhook delivery
 *
 * Called fire-and-forget after booking state changes.
 * Logs result to octo_webhook_log.
 *
 * OCTO webhook events:
 *   booking:created   — ON_HOLD
 *   booking:confirmed — CONFIRMED
 *   booking:cancelled — CANCELLED
 *   booking:redeemed  — REDEEMED (tourist attended)
 *   booking:no_show   — NO_SHOW (tourist didn't attend)
 *   booking:expired   — EXPIRED (hold expired after 30 min)
 */

import { pool } from '@/lib/db-pool';
import crypto from 'crypto';

export type OctoWebhookEvent =
  | 'booking:created'
  | 'booking:confirmed'
  | 'booking:cancelled'
  | 'booking:redeemed'
  | 'booking:no_show'
  | 'booking:expired';

interface WebhookTarget {
  apiKeyId: string;
  webhookUrl: string;
  webhookSecret: string | null;
}

/**
 * Find all webhook targets for a given booking.
 * A booking belongs to an API key — we notify that key's webhook_url.
 */
async function getWebhookTargets(bookingId: string | number): Promise<WebhookTarget[]> {
  const { rows } = await pool.query<{
    api_key_id: string;
    webhook_url: string | null;
    webhook_secret: string | null;
  }>(
    `SELECT k.id AS api_key_id, k.webhook_url, k.webhook_secret
     FROM operator_bookings ob
     JOIN octo_api_keys k ON k.id = ob.octo_api_key_id
     WHERE ob.id = $1
       AND k.webhook_url IS NOT NULL
       AND k.is_active = TRUE`,
    [bookingId]
  );

  return rows
    .filter(r => r.webhook_url)
    .map(r => ({
      apiKeyId:      r.api_key_id,
      webhookUrl:    r.webhook_url!,
      webhookSecret: r.webhook_secret,
    }));
}

/**
 * Build HMAC-SHA256 signature for payload.
 * Header: X-OCTO-Signature: sha256=<hex>
 */
function sign(payload: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Send webhook to a single target. Returns { statusCode, success, durationMs }.
 */
async function deliver(
  url: string,
  secret: string | null,
  body: object
): Promise<{ statusCode: number | null; success: boolean; durationMs: number; responseBody: string }> {
  const payload = JSON.stringify(body);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent':   'TourHub-OCTO/1.0',
  };
  if (secret) {
    headers['X-OCTO-Signature'] = sign(payload, secret);
  }

  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });
    const responseBody = await res.text().catch(() => '');
    return {
      statusCode: res.status,
      success:    res.status >= 200 && res.status < 300,
      durationMs: Date.now() - start,
      responseBody: responseBody.slice(0, 500),
    };
  } catch {
    return {
      statusCode: null,
      success:    false,
      durationMs: Date.now() - start,
      responseBody: 'connection_error',
    };
  }
}

/**
 * Notify all webhook targets for a booking.
 * Fire-and-forget — caller should not await this in the hot path.
 */
export async function notifyOctoWebhooks(
  event: OctoWebhookEvent,
  bookingId: string | number,
  bookingPayload: object
): Promise<void> {
  let targets: WebhookTarget[];
  try {
    targets = await getWebhookTargets(bookingId);
  } catch {
    return; // Don't fail the main flow
  }

  if (targets.length === 0) return;

  const webhookBody = {
    event,
    timestamp: new Date().toISOString(),
    data: bookingPayload,
  };

  await Promise.allSettled(
    targets.map(async (target) => {
      const result = await deliver(target.webhookUrl, target.webhookSecret, webhookBody);

      // Log to DB
      await pool.query(
        `INSERT INTO octo_webhook_log
           (api_key_id, booking_id, event, url, status_code, success, request_body, response_body, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          target.apiKeyId,
          bookingId,
          event,
          target.webhookUrl,
          result.statusCode,
          result.success,
          JSON.stringify(webhookBody),
          result.responseBody,
          result.durationMs,
        ]
      ).catch(() => {}); // Don't fail on log error
    })
  );
}
