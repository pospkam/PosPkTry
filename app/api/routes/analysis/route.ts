/**
 * GET /api/routes/analysis
 *
 * Анализ маршрутов и связь с местами:
 * - География: какие туры на каких местах
 * - Популярность: бронирования по местам
 * - Вместимость: загруженность мест
 * - Алерты: проблемные места
 * - Рекомендации: что развивать
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

interface LocationAnalysis {
  location_id: string;
  location_name: string;
  location_type: string;
  zone: string;
  lat: number;
  lng: number;
  tours_count: number;
  active_tours: number;
  total_bookings: number;
  capacity_per_day: number;
  utilization_pct: number;
  difficulty_levels: string[];
  activity_types: string[];
  operators_count: number;
  avg_price: number;
  safety_alerts: string[];
  status: 'available' | 'crowded' | 'closed' | 'warning';
  recommendations: string[];
}

interface AnalysisResult {
  timestamp: string;
  total_locations: number;
  total_tours: number;
  total_bookings: number;
  locations: LocationAnalysis[];
  summary: {
    most_popular: string;
    most_crowded: string;
    most_expensive: string;
    needs_operators: string[];
    critical_alerts: string[];
  };
}

export async function GET(req: NextRequest) {
  try {
    // ─── 1. Get all locations (places) ──────────────────────────────────

    const locationsQuery = await pool.query(`
      SELECT DISTINCT
        ark.id as location_id,
        ark.title as location_name,
        ark.location_type,
        ark.zone,
        ark.lat,
        ark.lng,
        COUNT(DISTINCT ot.id) as tours_count,
        COUNT(DISTINCT CASE WHEN ot.is_active = true THEN ot.id END) as active_tours,
        COALESCE(lsp.capacity_per_day, 50) as capacity_per_day,
        COALESCE(SUM(b.id), 0) as total_bookings,
        ARRAY_AGG(DISTINCT COALESCE(ot.difficulty, '')) FILTER (WHERE ot.difficulty IS NOT NULL) as difficulty_levels,
        ARRAY_AGG(DISTINCT COALESCE(ot.activity_type, '')) FILTER (WHERE ot.activity_type IS NOT NULL) as activity_types,
        COUNT(DISTINCT ot.operator_id) as operators_count,
        ROUND(AVG(COALESCE(ot.base_price, 0))::numeric, 0) as avg_price
      FROM agent_route_knowledge ark
      LEFT JOIN operator_tours ot ON
        (ark.location_type = ot.location_type OR
         (ABS(ark.lat - ot.lat) < 0.5 AND ABS(ark.lng - ot.lng) < 0.5))
      LEFT JOIN location_safety_profile lsp ON lsp.agent_route_id = ark.id
      LEFT JOIN bookings b ON b.tour_id = ot.id AND b.created_at > NOW() - INTERVAL '30 days'
      GROUP BY ark.id, ark.title, ark.location_type, ark.zone, ark.lat, ark.lng, lsp.capacity_per_day
      ORDER BY total_bookings DESC
    `);

    // ─── 2. Get safety alerts ──────────────────────────────────────────

    const alertsQuery = await pool.query(`
      SELECT
        lrt.agent_route_id,
        lrt.active_alerts,
        lrt.alert_severity,
        lrt.tourists_today
      FROM location_real_time_status lrt
      WHERE lrt.active_alerts IS NOT NULL AND array_length(lrt.active_alerts, 1) > 0
    `);

    const alertsMap = new Map(
      alertsQuery.rows.map(row => [row.agent_route_id, row])
    );

    // ─── 3. Build analysis ────────────────────────────────────────────

    const locations: LocationAnalysis[] = locationsQuery.rows.map(row => {
      const alerts = alertsMap.get(row.location_id);
      const totalCapacity = row.capacity_per_day * 30; // 30 days
      const utilizationPct = totalCapacity > 0
        ? Math.round((row.total_bookings / totalCapacity) * 100)
        : 0;

      let status: 'available' | 'crowded' | 'closed' | 'warning' = 'available';
      const recs: string[] = [];

      if (alerts?.alert_severity === 'critical') {
        status = 'closed';
        recs.push(`⛔ КРИТИЧНО: ${alerts.active_alerts.join(', ')}`);
      } else if (utilizationPct > 80) {
        status = 'crowded';
        recs.push(`⚠️ Перегруз ${utilizationPct}% вместимости — рекомендуем поднять цены или добавить слоты`);
      } else if (utilizationPct < 30 && row.active_tours > 0) {
        status = 'warning';
        recs.push(`📉 Низкая занятость ${utilizationPct}% — нужна маркетинг или новые операторы`);
      }

      if (row.active_tours === 0 && row.tours_count > 0) {
        recs.push(`❌ Нет активных туров — ${row.tours_count} скрыто`);
      }

      if (row.operators_count === 0 && row.tours_count === 0) {
        recs.push(`🆕 Отличное место без туров — ищем операторов`);
      }

      if (row.avg_price > 50000 && utilizationPct < 50) {
        recs.push(`💰 Высокая цена + низкая занятость — рассмотреть снижение`);
      }

      return {
        location_id: row.location_id,
        location_name: row.location_name,
        location_type: row.location_type,
        zone: row.zone,
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        tours_count: parseInt(row.tours_count),
        active_tours: parseInt(row.active_tours),
        total_bookings: parseInt(row.total_bookings),
        capacity_per_day: parseInt(row.capacity_per_day),
        utilization_pct: utilizationPct,
        difficulty_levels: row.difficulty_levels.filter((x: string) => x),
        activity_types: row.activity_types.filter((x: string) => x),
        operators_count: parseInt(row.operators_count),
        avg_price: parseInt(row.avg_price),
        safety_alerts: alerts?.active_alerts ?? [],
        status,
        recommendations: recs,
      };
    });

    // ─── 4. Generate summary ──────────────────────────────────────────

    const mostPopular = locations.reduce((a, b) =>
      a.total_bookings > b.total_bookings ? a : b
    );
    const mostCrowded = locations.reduce((a, b) =>
      a.utilization_pct > b.utilization_pct ? a : b
    );
    const mostExpensive = locations.reduce((a, b) =>
      a.avg_price > b.avg_price ? a : b
    );

    const needsOperators = locations
      .filter(l => l.tours_count === 0 && l.location_type)
      .map(l => `${l.location_name} (${l.location_type})`)
      .slice(0, 5);

    const criticalAlerts = locations
      .filter(l => l.status === 'closed')
      .map(l => `${l.location_name}: ${l.safety_alerts.join(', ')}`)
      .slice(0, 5);

    const result: AnalysisResult = {
      timestamp: new Date().toISOString(),
      total_locations: locations.length,
      total_tours: locations.reduce((sum, l) => sum + l.tours_count, 0),
      total_bookings: locations.reduce((sum, l) => sum + l.total_bookings, 0),
      locations,
      summary: {
        most_popular: `${mostPopular.location_name} (${mostPopular.total_bookings} брони)`,
        most_crowded: `${mostCrowded.location_name} (${mostCrowded.utilization_pct}% занято)`,
        most_expensive: `${mostExpensive.location_name} (${mostExpensive.avg_price}₽ в среднем)`,
        needs_operators: needsOperators,
        critical_alerts: criticalAlerts,
      },
    };

    return NextResponse.json({ success: true, data: result });

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('Routes analysis error:', error);
    return NextResponse.json(
      { success: false, error },
      { status: 500 }
    );
  }
}
