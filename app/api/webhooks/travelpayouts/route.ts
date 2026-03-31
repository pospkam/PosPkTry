/**
 * POST /api/webhooks/travelpayouts
 * Receive payout confirmations from TravelPayouts
 * Signature: X-Access-Token header verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

const TP_WEBHOOK_TOKEN = process.env.TRAVELPAYOUTS_WEBHOOK_TOKEN || '';

export async function POST(request: NextRequest) {
  // Verify signature
  const signature = request.headers.get('X-Access-Token');
  if (signature !== TP_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json() as {
      click_id?: string;
      partner?: string;
      currency?: string;
      revenue?: number;
      commission?: number;
      status?: 'approved' | 'pending' | 'declined';
      timestamp?: string;
    };

    // Log incoming payout
    if (data.commission && data.status === 'approved') {
      await pool.query(
        `INSERT INTO affiliate_payouts (partner, amount, currency, status, tp_click_id, received_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [data.partner || 'unknown', data.commission, data.currency || 'USD', 'approved', data.click_id || null]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('TravelPayouts webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
