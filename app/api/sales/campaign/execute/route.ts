/**
 * POST /api/sales/campaign/execute
 * CEO Direct: Execute operator acquisition campaign with transparency
 * Returns all messages that will be sent
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { generateMessage } from '@/lib/sales/messages';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface OperatorTarget {
  telegram_handle: string;
  name: string;
  tours_count: number;
  category: 'fishing' | 'trekking' | 'wildlife' | 'thermal' | 'helicopter';
}

const OPERATORS_TO_CONTACT: OperatorTarget[] = [
  { telegram_handle: '@kamchatskaya_rybalka', name: 'Камчатская рыбалка', tours_count: 5, category: 'fishing' },
  { telegram_handle: '@vulkan_adventures', name: 'Вулканические приключения', tours_count: 8, category: 'trekking' },
  { telegram_handle: '@medvedi_kamchatki', name: 'Медведи Камчатки', tours_count: 3, category: 'wildlife' },
  { telegram_handle: '@geysery_tour', name: 'Гейзеры Камчатки', tours_count: 4, category: 'thermal' },
  { telegram_handle: '@helicopter_kamchatka', name: 'Вертолетные туры', tours_count: 2, category: 'helicopter' },
  { telegram_handle: '@kamchatka_fishing_pro', name: 'Pro Fishing Tours', tours_count: 6, category: 'fishing' },
  { telegram_handle: '@kamchatka_extreme', name: 'Экстремальные маршруты', tours_count: 7, category: 'trekking' },
  { telegram_handle: '@nature_kamchatka', name: 'Nature Tours Kamchatka', tours_count: 4, category: 'wildlife' },
  { telegram_handle: '@hot_springs_tour', name: 'Горячие источники плюс', tours_count: 5, category: 'thermal' },
  { telegram_handle: '@sky_adventures_kk', name: 'Sky Adventures', tours_count: 3, category: 'helicopter' }
];

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('X-CEO-Secret');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create campaign record
    const campaignResult = await pool.query(
      `INSERT INTO sales_campaigns (status, batch_size, sent_count, started_at)
       VALUES ('active', $1, $2, NOW())
       RETURNING id`,
      [OPERATORS_TO_CONTACT.length, 0]
    );

    const campaignId = campaignResult.rows[0]?.id;
    const messages = [];

    // Generate and log each message
    for (const operator of OPERATORS_TO_CONTACT) {
      const messageText = generateMessage({
        name: operator.name,
        tours_count: operator.tours_count,
        category: operator.category,
      });

      // Log to outreach table
      await pool.query(
        `INSERT INTO sales_outreach_log (campaign_id, operator_telegram, operator_name, message_text, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [campaignId, operator.telegram_handle, operator.name, messageText]
      );

      messages.push({
        to: operator.telegram_handle,
        name: operator.name,
        category: operator.category,
        message: messageText
      });

    }

    // Update campaign sent count
    await pool.query(
      `UPDATE sales_campaigns SET sent_count = $1 WHERE id = $2`,
      [OPERATORS_TO_CONTACT.length, campaignId]
    );

    return NextResponse.json({
      success: true,
      campaign_id: campaignId,
      status: 'active',
      operators_targeted: OPERATORS_TO_CONTACT.length,
      messages_ready: messages.length,
      next_step: 'Manually send via Telegram Bot API or notify team',
      timestamp: new Date().toISOString(),
      messages: messages.map(m => ({
        to: m.to,
        operator: m.name,
        preview: m.message.substring(0, 80) + '...'
      }))
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Campaign execution failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/sales/campaign/execute',
    method: 'POST',
    auth: 'X-CEO-Secret header (uses CRON_SECRET)',
    purpose: 'Launch operator acquisition campaign'
  });
}
