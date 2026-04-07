/**
 * POST /api/sales/campaign/launch
 * CEO Action: Launch operator acquisition campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { launchSalesCampaign } from '@/lib/sales/bot-ceo';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('X-CEO-Secret');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { batch_size } = await req.json();
    const batchSize = Math.min(batch_size || 10, 50); // Max 50 per campaign

    const result = await launchSalesCampaign(batchSize);

    return NextResponse.json({
      success: result.success,
      campaign_status: 'active',
      sent: result.sent,
      failed: result.failed,
      timestamp: new Date().toISOString()
    });
  } catch (err) {

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Campaign launch failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'CEO Sales Campaign API',
    usage: 'POST with X-CEO-Secret header',
    payload: { batch_size: 10 }
  });
}
