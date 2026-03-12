/**
 * Admin alerts — SQL-based anomaly detection.
 * Returns AdminAlert[] for the dashboard.
 */

import { query } from '@/lib/database';
import type { AdminAlert } from '@/types/admin';
import type {
  AlertBookingVolumeRow,
  AlertBadReviewBurstRow,
  AlertCancellationRateRow,
  TotalRow,
} from '@/lib/types/db-rows';

export async function getAdminAlerts(): Promise<AdminAlert[]> {
  const alerts: AdminAlert[] = [];
  const now = new Date();

  // 1. Падение бронирований >30% (7д vs 7д)
  try {
    const result = await query<AlertBookingVolumeRow>(
      `WITH current_week AS (
        SELECT COUNT(*) as cnt FROM bookings WHERE created_at >= NOW() - INTERVAL '7 days'
      ),
      previous_week AS (
        SELECT COUNT(*) as cnt FROM bookings
        WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'
      )
      SELECT c.cnt as current_count, p.cnt as previous_count
      FROM current_week c, previous_week p`,
      []
    );
    const row = result.rows[0];
    if (row) {
      const current = parseInt(row.current_count, 10);
      const previous = parseInt(row.previous_count, 10);
      if (previous > 0 && (previous - current) / previous > 0.3) {
        const dropPct = Math.round(((previous - current) / previous) * 100);
        alerts.push({
          id: `alert-booking-drop`,
          type: 'warning',
          title: 'Падение бронирований',
          message: `Бронирований за 7 дней: ${current} (−${dropPct}% к предыдущей неделе)`,
          timestamp: now,
          read: false,
          actionUrl: '/hub/admin/bookings',
          actionLabel: 'Смотреть бронирования',
        });
      }
    }
  } catch { /* skip */ }

  // 2. Неверифицированные партнёры >7 дней
  try {
    const result = await query<TotalRow>(
      `SELECT COUNT(*) as total FROM partners
       WHERE is_verified = false AND created_at < NOW() - INTERVAL '7 days'`,
      []
    );
    const count = parseInt(result.rows[0]?.total ?? '0', 10);
    if (count > 0) {
      alerts.push({
        id: `alert-unverified-partners`,
        type: 'info',
        title: 'Партнёры ждут верификации',
        message: `${count} партнёров ожидают верификации более 7 дней`,
        timestamp: now,
        read: false,
        actionUrl: '/hub/admin/content/partners',
        actionLabel: 'Верифицировать',
      });
    }
  } catch { /* skip */ }

  // 3. Активные туры без бронирований 30 дней
  try {
    const result = await query<TotalRow>(
      `SELECT COUNT(*) as total FROM tours
       WHERE is_active = true
         AND id NOT IN (
           SELECT DISTINCT tour_id FROM bookings
           WHERE created_at >= NOW() - INTERVAL '30 days' AND tour_id IS NOT NULL
         )`,
      []
    );
    const count = parseInt(result.rows[0]?.total ?? '0', 10);
    if (count > 0) {
      alerts.push({
        id: `alert-idle-tours`,
        type: 'warning',
        title: 'Туры без бронирований',
        message: `${count} активных туров не имели бронирований за 30 дней`,
        timestamp: now,
        read: false,
        actionUrl: '/hub/admin/content/tours',
        actionLabel: 'Смотреть туры',
      });
    }
  } catch { /* skip */ }

  // 4. Всплеск плохих отзывов (≥3 с rating≤2 за 7д на один тур)
  try {
    const result = await query<AlertBadReviewBurstRow>(
      `SELECT t.name as tour_name, COUNT(*) as bad_reviews
       FROM reviews r
       JOIN tours t ON r.tour_id = t.id
       WHERE r.rating <= 2 AND r.created_at >= NOW() - INTERVAL '7 days'
       GROUP BY t.id, t.name
       HAVING COUNT(*) >= 3
       LIMIT 5`,
      []
    );
    for (const row of result.rows) {
      alerts.push({
        id: `alert-bad-reviews-${row.tour_name}`,
        type: 'error',
        title: 'Всплеск негативных отзывов',
        message: `«${row.tour_name}»: ${row.bad_reviews} отзывов с оценкой ≤2 за неделю`,
        timestamp: now,
        read: false,
        actionUrl: '/hub/admin/content/reviews',
        actionLabel: 'Модерация',
      });
    }
  } catch { /* skip */ }

  // 5. Высокий % отмен у оператора (>30% при ≥5 bookings)
  try {
    const result = await query<AlertCancellationRateRow>(
      `SELECT p.company_name, p.id,
              COUNT(*) FILTER (WHERE b.status = 'cancelled') as cancelled,
              COUNT(*) as total
       FROM bookings b
       JOIN tours t ON b.tour_id = t.id
       JOIN partners p ON t.operator_id = p.id
       WHERE b.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY p.id, p.company_name
       HAVING COUNT(*) >= 5
         AND COUNT(*) FILTER (WHERE b.status = 'cancelled')::float / COUNT(*)::float > 0.3
       LIMIT 5`,
      []
    );
    for (const row of result.rows) {
      const rate = Math.round((parseInt(row.cancelled, 10) / parseInt(row.total, 10)) * 100);
      alerts.push({
        id: `alert-cancellation-${row.id}`,
        type: 'warning',
        title: 'Высокий % отмен',
        message: `${row.company_name}: ${rate}% отмен (${row.cancelled}/${row.total} за 30д)`,
        timestamp: now,
        read: false,
      });
    }
  } catch { /* skip */ }

  return alerts;
}
