#!/usr/bin/env npx ts-node
/**
 * Safety Layer Demo Scenario
 * Simulates real-world events:
 * 1. Tourism group books tour
 * 2. Group goes on route  
 * 3. Weather changes
 * 4. МЧС sends alert
 * 5. System responds (changes status, notifies tourists)
 * 6. Guide finishes tour
 */

import { pool } from '@/lib/db-pool';

const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(stage: string, msg: string) {
}

async function demo() {
  console.clear();

  try {
    // STEP 1: Get a real route
    log('STEP 1', 'Fetching a route from database...');
    const routeRes = await pool.query(`
      SELECT id, title, location_type FROM agent_route_knowledge
      WHERE is_visible = TRUE AND location_type = 'volcano'
      LIMIT 1
    `);
    const route = (routeRes.rows[0] as any);
    if (!route) throw new Error('No routes found');
    log('✓', `Found: "${route.title}" (${route.location_type})`);
    await sleep(2000);

    // STEP 2: Check safety profile
    log('STEP 2', 'Checking safety profile...');
    const safetyRes = await pool.query(`
      SELECT capacity_per_day, difficulty_level, hazard_types
      FROM location_safety_profile
      WHERE agent_route_id = $1
    `, [route.id]);
    const safety = (safetyRes.rows[0] as any);
    if (safety) {
      log('✓', `Capacity: ${safety.capacity_per_day}/day | Difficulty: ${safety.difficulty_level}/5 | Hazards: ${safety.hazard_types?.join(', ') || 'none'}`);
    }
    await sleep(2000);

    // STEP 3: Check current status
    log('STEP 3', 'Checking current real-time status...');
    const statusRes = await pool.query(`
      SELECT tourists_today, recommender_status, active_alerts, alert_severity
      FROM location_real_time_status
      WHERE agent_route_id = $1
    `, [route.id]);
    const status = (statusRes.rows[0] as any);
    const statusColor = status?.recommender_status === 'red' ? RED : status?.recommender_status === 'yellow' ? YELLOW : GREEN;
    log('✓', `Current: ${status?.tourists_today} tourists | Status: ${statusColor}${status?.recommender_status}${RESET} | Alerts: ${status?.alert_severity || 0}`);
    await sleep(2000);

    // STEP 4: Simulate МЧС alert
    log('STEP 4', 'Simulating МЧС alert (weather deteriorating)...');
    const alertId = `demo_${Date.now()}`;
    await pool.query(`
      INSERT INTO external_alerts (
        alert_type, severity, title, description,
        affected_zones, created_at, expires_at, external_id
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '1 hour', $6)
    `, [
      'weather',
      1,
      'Weather warning: Wind 40+ km/h, visibility <200m',
      'Mountain streams dangerous, recommend descend',
      ['avachinsky'],
      alertId,
    ]);
    log(`${YELLOW}!${RESET}`, `Alert created: "${RED}weather${RESET}" severity ${YELLOW}1${RESET}`);
    await sleep(2000);

    // STEP 5: Check system response (update real-time status)
    log('STEP 5', 'System updating real-time status...');
    const updatedStatusRes = await pool.query(`
      UPDATE location_real_time_status lrs
      SET
        active_alerts = ARRAY['Weather: wind 40+km/h'],
        alert_severity = 1,
        recommender_status = CASE
          WHEN alert_severity >= 2 THEN 'red'
          WHEN tourists_today > (capacity_per_day * 0.7) THEN 'yellow'
          ELSE CASE WHEN alert_severity > 0 THEN 'yellow' ELSE 'green' END
        END,
        updated_at = NOW()
      WHERE agent_route_id = $1
      RETURNING recommender_status, active_alerts, alert_severity
    `, [route.id]);
    
    const updated = (updatedStatusRes.rows[0] as any);
    log(`${YELLOW}!${RESET}`, `Real-time status changed to ${YELLOW}${updated.recommender_status}${RESET} (alert_severity: ${updated.alert_severity})`);
    await sleep(2000);

    // STEP 6: Show what tourists see (recommendation)
    log('STEP 6', 'Generating recommendation for new tourists...');
    const recommendRes = await pool.query(`
      SELECT title, location_type, capacity_per_day, tourists_today,
        recommender_status, alert_severity
      FROM location_real_time_status lrs
      LEFT JOIN agent_route_knowledge ark ON lrs.agent_route_id = ark.id
      WHERE lrs.agent_route_id = $1
    `, [route.id]);
    const recommended = (recommendRes.rows[0] as any);
    
    if (recommended?.alert_severity > 0) {
      log('⚠', `Tourist searching for routes → system HIDES this: "${RED}${recommended.title} — weather alert${RESET}"`);
      log('⚠', `System suggests alternatives: "Choose: Озеро Харчи (green) or Горячие источники (green)"`);
    } else {
      log('✓', `Tourists see: "${recommended.title}" (${GREEN}${recommended.recommender_status}${RESET})`);
    }
    await sleep(2000);

    // STEP 7: Clean up demo data
    log('STEP 7', 'Cleaning up demo data...');
    await pool.query(`DELETE FROM external_alerts WHERE external_id = $1`, [alertId]);
    log('✓', 'Demo alert removed');


    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

demo();
