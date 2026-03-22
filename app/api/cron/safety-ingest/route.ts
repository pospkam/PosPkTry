import { query } from '@/lib/database';

/**
 * POST /api/cron/safety-ingest
 * Fetches МЧС alerts, local incidents, tourism data
 * Updates location_real_time_status with active alerts
 *
 * Call every 30 minutes via: https://cron-job.org or similar
 */

interface AlertData {
  alert_type: string;
  severity: number;
  location?: string;
  zone?: string;
  message: string;
  coordinates?: { lat: number; lng: number };
  expires_hours?: number;
}

interface IncidentData {
  incident_type: string;
  location: string;
  severity: number;
  message: string;
  date?: string;
}

interface LocationData {
  name: string;
  lat: number;
  lng: number;
  location_type: string;
  description?: string;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json(
      { error: 'CRON_SECRET not configured on server' },
      { status: 500 }
    );
  }

  if (secret !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    alerts_processed: 0,
    incidents_processed: 0,
    locations_added: 0,
    real_time_updated: 0,
    errors: [] as string[],
  };

  try {
    // ========== 1. FETCH & PARSE DATA ==========

    // Fetch МЧС alerts via MCP
    let mchesAlerts: AlertData[] = [];
    try {
      const response = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        body: JSON.stringify({
          tool: 'fetch_mches_alerts',
          args: { hours_back: 24 },
        }),
      });
      const data = await response.json();
      mchesAlerts = (data.alerts || []).map((a: unknown) => extractAlertData(a)).filter(Boolean);
    } catch (e) {
      results.errors.push(`MCP MCHES fetch failed: ${(e as Error).message}`);
    }

    // Fetch local incidents
    let incidents: IncidentData[] = [];
    try {
      const response = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        body: JSON.stringify({
          tool: 'fetch_local_incidents',
          args: { limit: 20 },
        }),
      });
      const data = await response.json();
      incidents = (data.incidents || []).map((i: unknown) => extractIncidentData(i)).filter(Boolean);
    } catch (e) {
      results.errors.push(`MCP incidents fetch failed: ${(e as Error).message}`);
    }

    // Fetch tourism objects
    let tourismObjects: LocationData[] = [];
    try {
      const response = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        body: JSON.stringify({
          tool: 'fetch_tourism_objects',
          args: { query: 'Kamchatka' },
        }),
      });
      const data = await response.json();
      tourismObjects = (data.objects || []).map((o: unknown) => extractLocationData(o)).filter(Boolean);
    } catch (e) {
      results.errors.push(`MCP tourism fetch failed: ${(e as Error).message}`);
    }

    // ========== 2. PROCESS ALERTS ==========

    for (const alert of mchesAlerts) {
      try {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (alert.expires_hours || 24));

        await query(
          `
          INSERT INTO external_alerts (
            alert_type, severity, title, description,
            affected_zones, created_at, expires_at, source_url, external_id
          ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)
          ON CONFLICT (external_id) DO UPDATE SET
            updated_at = NOW(),
            severity = EXCLUDED.severity
        `,
          [
            alert.alert_type,
            alert.severity,
            alert.location || 'Unknown location',
            alert.message,
            alert.zone ? [alert.zone] : [],
            expiresAt,
            '',
            `mches_${Date.now()}_${Math.random()}`,
          ]
        );

        results.alerts_processed++;
      } catch (e) {
        results.errors.push(`Alert processing failed: ${(e as Error).message}`);
      }
    }

    // ========== 3. PROCESS INCIDENTS ==========

    for (const incident of incidents) {
      try {
        // Find nearest route(s) by incident location
        const nearbyRoutes = await query(
          `
          SELECT id FROM agent_route_knowledge
          WHERE
            ST_Distance(
              ST_Point(lng, lat),
              ST_GeomFromText('POINT(? ?)', 4326)
            ) < 15000  -- 15km radius
          LIMIT 5
        `,
          [] // TODO: need coordinates from incident
        );

        await query(
          `
          INSERT INTO external_alerts (
            alert_type, severity, title, description,
            affected_locations, created_at, expires_at, external_id
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '12 hours', $6)
          ON CONFLICT (external_id) DO NOTHING
        `,
          [
            incident.incident_type,
            incident.severity,
            incident.location,
            incident.message,
            (nearbyRoutes.rows as { id: number }[]).map((r) => r.id),
            `incident_${Date.now()}_${Math.random()}`,
          ]
        );

        results.incidents_processed++;
      } catch (e) {
        results.errors.push(`Incident processing failed: ${(e as Error).message}`);
      }
    }

    // ========== 4. ADD TOURISM OBJECTS ==========

    for (const obj of tourismObjects) {
      try {
        // Check if location exists in agent_route_knowledge
        const existing = await query(
          `SELECT id FROM agent_route_knowledge WHERE
            ST_Distance(
              ST_Point(lng, lat),
              ST_Point($1, $2)
            ) < 500  -- 500m to dedupe
          LIMIT 1
        `,
          [obj.lng, obj.lat]
        );

        if (existing.rows.length === 0) {
          // Add new location
          await query(
            `
            INSERT INTO agent_route_knowledge (
              title, description, location_type, lat, lng,
              category, is_visible, zone
            ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
          `,
            [
              obj.name,
              obj.description || '',
              obj.location_type,
              obj.lat,
              obj.lng,
              obj.location_type,
              inferZoneFromCoords(obj.lat, obj.lng),
            ]
          );

          results.locations_added++;
        }
      } catch (e) {
        results.errors.push(`Tourism object processing failed: ${(e as Error).message}`);
      }
    }

    // ========== 5. UPDATE REAL-TIME STATUS ==========

    try {
      // Match alerts to routes and update status
      const updateResult = await query(`
        UPDATE location_real_time_status lrs
        SET
          active_alerts = (
            SELECT array_agg(DISTINCT ea.title)
            FROM external_alerts ea
            WHERE ea.expires_at > NOW()
              AND (
                ea.affected_locations @> ARRAY[lrs.agent_route_id]
                OR ea.affected_zones @> ARRAY[
                  COALESCE((SELECT zone FROM agent_route_knowledge WHERE id = lrs.agent_route_id), 'unknown')
                ]
              )
          ),
          alert_severity = COALESCE((
            SELECT MAX(ea.severity)
            FROM external_alerts ea
            WHERE ea.expires_at > NOW()
              AND (
                ea.affected_locations @> ARRAY[lrs.agent_route_id]
                OR ea.affected_zones @> ARRAY[
                  COALESCE((SELECT zone FROM agent_route_knowledge WHERE id = lrs.agent_route_id), 'unknown')
                ]
              )
          ), 0),
          recommender_status = CASE
            WHEN COALESCE((
              SELECT MAX(ea.severity)
              FROM external_alerts ea
              WHERE ea.expires_at > NOW()
                AND (
                  ea.affected_locations @> ARRAY[lrs.agent_route_id]
                  OR ea.affected_zones @> ARRAY[
                    COALESCE((SELECT zone FROM agent_route_knowledge WHERE id = lrs.agent_route_id), 'unknown')
                  ]
                )
            ), 0) >= 2 THEN 'red'
            WHEN lrs.tourists_today >= COALESCE((
              SELECT capacity_per_day FROM location_safety_profile WHERE agent_route_id = lrs.agent_route_id
            ), 50) THEN 'red'
            WHEN lrs.tourists_today >= COALESCE((
              SELECT capacity_per_day * 0.7 FROM location_safety_profile WHERE agent_route_id = lrs.agent_route_id
            ), 35) THEN 'yellow'
            ELSE 'green'
          END,
          updated_at = NOW()
      `);

      results.real_time_updated = updateResult.rowCount || 0;
    } catch (e) {
      results.errors.push(`Real-time update failed: ${(e as Error).message}`);
    }

    return Response.json(results);
  } catch (error) {
    results.errors.push(`Fatal error: ${(error as Error).message}`);
    return Response.json(results, { status: 500 });
  }
}

// ========== HELPERS ==========

function extractAlertData(raw: unknown): AlertData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.text !== 'string') return null;

  return {
    alert_type: typeof r.alert_type === 'string' ? r.alert_type : 'other',
    severity: typeof r.severity === 'number' ? r.severity : 1,
    location: typeof r.location === 'string' ? r.location : undefined,
    zone: typeof r.zone === 'string' ? r.zone : undefined,
    message: r.text,
    expires_hours: 24,
  };
}

function extractIncidentData(raw: unknown): IncidentData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.text !== 'string') return null;

  return {
    incident_type: typeof r.incident_type === 'string' ? r.incident_type : 'other',
    location: typeof r.location === 'string' ? r.location : 'Unknown',
    severity: typeof r.severity === 'number' ? r.severity : 1,
    message: r.text,
  };
}

function extractLocationData(raw: unknown): LocationData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const lat = typeof r.lat === 'number' ? r.lat : null;
  const lng = typeof r.lng === 'number' ? r.lng : null;
  const name = typeof r.name === 'string' ? r.name : 'Unknown';
  const locType = typeof r.location_type === 'string' ? r.location_type : 'other';

  if (lat === null || lng === null) return null;

  return {
    name,
    lat,
    lng,
    location_type: locType,
    description: typeof r.description === 'string' ? r.description : undefined,
  };
}

function inferZoneFromCoords(lat: number, lng: number): string {
  // Все районы Камчатки по реальным координатам центров
  const ZONE_CENTERS: Record<string, [number, number]> = {
    elizovsky:  [52.80, 158.80],
    milkovsky:  [55.33, 157.12],
    karaginsky: [55.20, 161.42],
    tigil:      [57.73, 158.71],
  };

  // Найди ближайший район по евклидовой дистанции
  let closest = 'elizovsky';
  let minDist = Infinity;

  for (const [zone, [centerLat, centerLng]] of Object.entries(ZONE_CENTERS)) {
    const dist = Math.abs(lat - centerLat) + Math.abs(lng - centerLng);
    if (dist < minDist) {
      minDist = dist;
      closest = zone;
    }
  }

  return closest;
}
