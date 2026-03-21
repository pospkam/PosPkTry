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
  console.log(`${BOLD}${CYAN}=== KamchatourHub Safety Dashboard ===${RESET}`);
  console.log(`Live: ${new Date().toLocaleTimeString()}\n`);

  try {
    // 1. ALERTS
    console.log(`${BOLD}1. ACTIVE ALERTS${RESET}`);
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
      console.log(`${GREEN}✓ No active alerts${RESET}\n`);
    } else {
      const criticalCount = alerts.rows.filter((r: { severity: number }) => r.severity >= 2).length;
      const warningCount = alerts.rows.filter((r: { severity: number }) => r.severity === 1).length;

      console.log(`${RED}Critical: ${criticalCount}${RESET} | ${YELLOW}Warning: ${warningCount}${RESET}\n`);

      for (const alert of alerts.rows as any[]) {
        const icon = alert.severity >= 2 ? RED + '🔴' : YELLOW + '🟡';
        const zone = alert.affected_zones?.join(', ') || 'unknown';
        const routes = alert.route_count || '?';
        const expiresIn = Math.round((new Date(alert.expires_at).getTime() - Date.now()) / (1000 * 60));

        console.log(
          `${icon} ${RESET}${alert.title.padEnd(25)} | Type: ${alert.alert_type.padEnd(10)} | Zones: ${zone.padEnd(15)} | Routes: ${routes} | Expire: ${expiresIn}m`
        );
      }
    }

    // 2. CAPACITY STATUS
    console.log(`\n${BOLD}2. LOCATION CAPACITY${RESET}`);
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
      console.log(`${GREEN}✓ All locations green${RESET}\n`);
    } else {
      const reds = capacity.rows.filter((r) => r.recommender_status === 'red').length;
      const yellows = capacity.rows.filter((r) => r.recommender_status === 'yellow').length;

      console.log(`${RED}Full: ${reds}${RESET} | ${YELLOW}Warning: ${yellows}${RESET}\n`);
      console.log(
        `${BOLD}Location${RESET.padEnd(30)} | ${BOLD}Status${RESET} | ${BOLD}Tourists${RESET} | ${BOLD}Available${RESET} | ${BOLD}Fill%${RESET}`
      );
      console.log('─'.repeat(95));

      for (const row of capacity.rows as any[]) {
        const statusIcon =
          row.recommender_status === 'red'
            ? RED + '🔴'
            : row.recommender_status === 'yellow'
              ? YELLOW + '🟡'
              : GREEN + '🟢';

        console.log(
          `${row.title.substring(0, 28).padEnd(30)} | ${statusIcon} ${RESET}${row.recommender_status.padEnd(8)} | ${String(row.tourists_today).padEnd(8)} | ${String(row.available).padEnd(9)} | ${String(row.fill_percent).padEnd(5)}%`
        );
      }
    }

    // 3. LIVE GROUPS (if table exists)
    console.log(`\n${BOLD}3. LIVE GROUPS${RESET}`);
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
        console.log(`${YELLOW}⚠ No live groups (table may be empty)${RESET}\n`);
      } else {
        console.log(`${CYAN}${groups.rows.length} groups tracked${RESET}\n`);
        for (const group of groups.rows as any[]) {
          const minsAgo = Math.round((Date.now() - new Date(group.last_update).getTime()) / (1000 * 60));
          console.log(
            `  Booking ${group.booking_id} | ${group.latitude.toFixed(4)}, ${group.longitude.toFixed(4)} | Last: ${minsAgo}m ago`
          );
        }
      }
    } catch (e) {
      console.log(`${YELLOW}⚠ Live tracking not yet active${RESET}\n`);
    }

    // 4. STATISTICS
    console.log(`\n${BOLD}4. STATISTICS${RESET}`);
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM location_real_time_status) as total_routes,
        (SELECT SUM(tourists_today) FROM location_real_time_status) as tourists_today,
        (SELECT COUNT(*) FROM external_alerts WHERE expires_at > NOW()) as active_alerts,
        (SELECT COUNT(*) FROM location_real_time_status WHERE recommender_status = 'red') as red_locations,
        (SELECT COUNT(*) FROM location_real_time_status WHERE recommender_status = 'yellow') as yellow_locations
    `);

    const row = stats.rows[0] as any;
    console.log(`Total routes: ${BOLD}${row.total_routes}${RESET}`);
    console.log(`Tourists today: ${BOLD}${row.tourists_today || 0}${RESET}`);
    console.log(`Active alerts: ${BOLD}${RED}${row.active_alerts}${RESET}`);
    console.log(`Red locations: ${BOLD}${RED}${row.red_locations}${RESET}`);
    console.log(`Yellow locations: ${BOLD}${YELLOW}${row.yellow_locations}${RESET}`);

    console.log(`\n${CYAN}Updating in 5 seconds... (Ctrl+C to stop)${RESET}`);

    await new Promise((resolve) => setTimeout(resolve, 5000));
    getSafety();
  } catch (error) {
    console.error(`${RED}Error:${RESET}`, error);
    process.exit(1);
  }
}

// Start
getSafety();
