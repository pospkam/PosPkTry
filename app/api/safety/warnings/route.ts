import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getHazardSignals, getOverallDangerLevel } from '@/lib/safety/hazard-signals';

/**
 * GET /api/safety/warnings?route_id=XXX
 * GET /api/safety/warnings?tour_id=XXX
 *
 * Возвращает предупредительные сигналы для маршрута или тура.
 * Не запрещает — только предупреждает.
 * На основе реальных трагедий на Камчатке (2016-2025).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get('route_id');
    const tourId = searchParams.get('tour_id');

    if (!routeId && !tourId) {
      return NextResponse.json(
        { error: 'Укажите route_id или tour_id' },
        { status: 400 }
      );
    }

    let routeInfo: {
      location_type: string | null;
      activity_type: string | null;
      hazard_types: string[] | null;
      zone: string | null;
      title: string;
      is_open: boolean;
      alert_severity: number;
      alert_message: string | null;
    } | null = null;

    if (tourId) {
      // Получаем данные через тур → маршрут
      const res = await query<{
        title: string;
        location_type: string | null;
        activity_type: string | null;
        hazard_types: string[] | null;
        zone: string | null;
        is_open: boolean;
        alert_severity: number;
        alert_message: string | null;
      }>(
        `SELECT
           ot.title,
           ark.location_type,
           ark.activity_type,
           lsp.hazard_types,
           ark.zone,
           COALESCE(lrs.is_open, true) AS is_open,
           COALESCE(lrs.alert_severity, 0) AS alert_severity,
           lrs.alert_message
         FROM operator_tours ot
         LEFT JOIN agent_route_knowledge ark ON ot.agent_route_id = ark.id
         LEFT JOIN location_safety_profile lsp ON lsp.agent_route_id = ark.id
         LEFT JOIN location_real_time_status lrs ON lrs.agent_route_id = ark.id
         WHERE ot.id = $1 AND ot.deleted_at IS NULL
         LIMIT 1`,
        [tourId]
      );
      routeInfo = res.rows[0] ?? null;
    } else if (routeId) {
      const res = await query<{
        title: string;
        location_type: string | null;
        activity_type: string | null;
        hazard_types: string[] | null;
        zone: string | null;
        is_open: boolean;
        alert_severity: number;
        alert_message: string | null;
      }>(
        `SELECT
           ark.title,
           ark.location_type,
           ark.activity_type,
           lsp.hazard_types,
           ark.zone,
           COALESCE(lrs.is_open, true) AS is_open,
           COALESCE(lrs.alert_severity, 0) AS alert_severity,
           lrs.alert_message
         FROM agent_route_knowledge ark
         LEFT JOIN location_safety_profile lsp ON lsp.agent_route_id = ark.id
         LEFT JOIN location_real_time_status lrs ON lrs.agent_route_id = ark.id
         WHERE ark.id = $1
         LIMIT 1`,
        [routeId]
      );
      routeInfo = res.rows[0] ?? null;
    }

    if (!routeInfo) {
      return NextResponse.json(
        { error: 'Маршрут не найден' },
        { status: 404 }
      );
    }

    // Получаем предупредительные сигналы
    const signals = getHazardSignals({
      location_type: routeInfo.location_type ?? undefined,
      activity_type: routeInfo.activity_type ?? undefined,
      hazard_types: routeInfo.hazard_types ?? undefined,
      zone: routeInfo.zone ?? undefined,
    });

    const dangerLevel = getOverallDangerLevel({
      location_type: routeInfo.location_type ?? undefined,
      activity_type: routeInfo.activity_type ?? undefined,
      hazard_types: routeInfo.hazard_types ?? undefined,
      zone: routeInfo.zone ?? undefined,
    });

    // Активные алерты из danger_assessments
    let zoneRisk: { risk_score: number; risk_level: string; recommended_action: string } | null = null;
    if (routeInfo.zone) {
      const riskRes = await query<{
        risk_score: number; risk_level: string; recommended_action: string;
      }>(
        `SELECT risk_score, risk_level, recommended_action
         FROM danger_assessments
         WHERE zone = $1 AND expires_at > NOW()
         ORDER BY assessed_at DESC LIMIT 1`,
        [routeInfo.zone]
      );
      zoneRisk = riskRes.rows[0] ?? null;
    }

    // Контакты МЧС для зоны
    let emergencyContacts: Array<{ name: string; phone: string; type: string }> = [];
    if (routeInfo.zone) {
      const contactsRes = await query<{ name: string; phone: string; contact_type: string }>(
        `SELECT name, phone, contact_type
         FROM emergency_contacts
         WHERE zone = $1 OR zone = 'all'
         ORDER BY contact_type`,
        [routeInfo.zone]
      );
      emergencyContacts = contactsRes.rows.map(c => ({
        name: c.name,
        phone: c.phone,
        type: c.contact_type,
      }));
    }

    return NextResponse.json({
      route_title: routeInfo.title,
      is_open: routeInfo.is_open,
      danger_level: dangerLevel,
      alert_severity: routeInfo.alert_severity,
      alert_message: routeInfo.alert_message,
      zone_risk: zoneRisk,
      signals: signals.map(s => ({
        hazard: s.hazard,
        level: s.level,
        title: s.title,
        message: s.message,
        precautions: s.precautions,
        incident_ref: s.incident_ref,
        icon: s.icon,
      })),
      emergency_contacts: emergencyContacts,
      disclaimer: 'Платформа TourHab предупреждает об известных опасностях, но не несёт ответственность за решение о выходе на маршрут. Запрет маршрута возможен только при официальном закрытии зоны.',
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Ошибка получения предупреждений' },
      { status: 500 }
    );
  }
}
