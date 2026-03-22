#!/usr/bin/env npx ts-node
/**
 * Safety Dashboard CLI
 * Real-time view of Safety Layer from PostgreSQL
 * Shows actual alerts, capacity, groups live
 */

import { pool } from '@/lib/db-pool';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';

async function getSafety() {
  console.clear();

  try {
    // 1. ALERTS
    const alerts = await pool.query(`
      SELECT 
        id, 
        alert_type, 
        severity,
        title, 
        affected_zones,
        array_length(affected_locations, 1) as route_count,
        expires_at
      FROM external_alerts
      WHERE expires_at > NOW()
      ORDER BY severity DESC, created_at DESC
      LIMIT 10
    `);

    if (alerts.rows.length === 0) {
    } else {
      const criticalCount = alerts.rows.filter((r: { severity: number }) => r.severity >= 2).length;
      const warningCount = alerts.rows.filter((r: { severity: number }) => r.severity === 1).length;


      for (const alert of alerts.rows as any[]) {
        const icon = alert.severity >= 2 ? RED + '🔴' : YELLOW + '🟡';
        const zone = alert.affected_zones?.join(', ') || 'unknown';
        const routes = alert.route_count || '?';
        const expiresIn = Math.round((new Date(alert.expires_at).getTime() - Date.now()) / (1000 * 60));

          `${icon} ${RESET}${alert.title.padEnd(25)} | Type: ${alert.alert_type.padEnd(10)} | Zones: ${zone.padEnd(15)} | Routes: ${routes} | Expire: ${expiresIn}m`
        );
      }
    }

    // 2. CAPACITY STATUS
    const capacity = await pool.query(`
      SELECT
        ark.title,
        lsp.capacity_per_day,
        lrs.tourists_today,
        lrs.recommender_status,
        COALESCE(lsp.capacity_per_day, 50) - COALESCE(lrs.tourists_today, 0) as available,
        ROUND(100.0 * COALESCE(lrs.tourists_today, 0) / NULLIF(COALESCE(lsp.capacity_per_day, 50), 0), 1) as fill_percent
      FROM location_real_time_status lrs
      LEFT JOIN agent_route_knowledge ark ON lrs.agent_route_id = ark.id
      LEFT JOIN location_safety_profile lsp ON lsp.agent_route_id = lrs.agent_route_id
      WHERE lrs.tourists_today > 0 OR lrs.recommender_status != 'green'
      ORDER BY COALESCE(lrs.tourists_today, 0) DESC
      LIMIT 12
    `);

    if (capacity.rows.length === 0) {
    } else {
      const reds = capacity.rows.filter((r) => r.recommender_status === 'red').length;
      const yellows = capacity.rows.filter((r) => r.recommender_status === 'yellow').length;

        `${BOLD}Location${RESET.padEnd(30)} | ${BOLD}Status${RESET} | ${BOLD}Tourists${RESET} | ${BOLD}Available${RESET} | ${BOLD}Fill%${RESET}`
      );

      for (const row of capacity.rows as any[]) {
        const statusIcon =
          row.recommender_status === 'red'
            ? RED + '🔴'
            : row.recommender_status === 'yellow'
              ? YELLOW + '🟡'
              : GREEN + '🟢';

          `${row.title.substring(0, 28).padEnd(30)} | ${statusIcon} ${RESET}${row.recommender_status.padEnd(8)} | ${String(row.tourists_today).padEnd(8)} | ${String(row.available).padEnd(9)} | ${String(row.fill_percent).padEnd(5)}%`
        );
      }
    }

    // 3. LIVE GROUPS (if table exists)
    try {
      const groups = await pool.query(`
        SELECT
          booking_id,
          COUNT(*) as updates,
          MAX(created_at) as last_update,
          latitude,
          longitude
        FROM group_live_telemetry
        WHERE created_at > NOW() - INTERVAL '2 hours'
        GROUP BY booking_id, latitude, longitude
        LIMIT 10
      `);

      if (groups.rows.length === 0) {
      } else {
        for (const group of groups.rows as any[]) {
          const minsAgo = Math.round((Date.now() - new Date(group.last_update).getTime()) / (1000 * 60));
            `  Booking ${group.booking_id} | ${group.latitude.toFixed(4)}, ${group.longitude.toFixed(4)} | Last: ${minsAgo}m ago`
          );
        }
      }
    } catch (e) {
    }

    // 4. STATISTICS
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM location_real_time_status) as total_routes,
        (SELECT SUM(tourists_today) FROM location_real_time_status) as tourists_today,
        (SELECT COUNT(*) FROM external_alerts WHERE expires_at > NOW()) as active_alerts,
        (SELECT COUNT(*) FROM location_real_time_status WHERE recommender_status = 'red') as red_locations,
        (SELECT COUNT(*) FROM location_real_time_status WHERE recommender_status = 'yellow') as yellow_locations
    `);

    const row = stats.rows[0] as any;


    await new Promise((resolve) => setTimeout(resolve, 5000));
    getSafety();
  } catch (error) {
    process.exit(1);
  }
}

// Start
getSafety();
