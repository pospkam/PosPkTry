import type { Metadata } from 'next';
import { pool } from '@/lib/db-pool';
import { ChannelsDashboardClient } from './_ChannelsDashboardClient';

export const metadata: Metadata = { title: 'Каналы продаж | KamchatourHub' };

export const dynamic = 'force-dynamic';

async function getChannelStats() {
  const { rows: orders } = await pool.query<{
    channel: string;
    count: string;
    last_at: string | null;
  }>(`
    SELECT channel, count(*)::text, max(created_at)::text AS last_at
    FROM channel_orders
    GROUP BY channel
  `);

  const { rows: tours } = await pool.query<{
    total: string;
    with_tripster: string;
    with_avito: string;
    with_sputnik8: string;
  }>(`
    SELECT
      count(*)::text                                         AS total,
      count(*) FILTER (WHERE tripster_experience_id IS NOT NULL)::text AS with_tripster,
      count(*) FILTER (WHERE avito_listing_id IS NOT NULL)::text       AS with_avito,
      count(*) FILTER (WHERE sputnik8_product_id IS NOT NULL)::text    AS with_sputnik8
    FROM operator_tours
    WHERE is_active = true AND is_published = true AND deleted_at IS NULL
  `);

  return { orders, tours: tours[0] };
}

export default async function ChannelsPage() {
  const { orders, tours } = await getChannelStats();
  return <ChannelsDashboardClient orders={orders} tours={tours} />;
}
