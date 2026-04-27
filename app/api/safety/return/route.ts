import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

/**
 * POST /api/safety/return
 * Турист отмечает возврат с маршрута.
 * Останавливает эскалацию уведомлений.
 */
export async function POST(request: NextRequest) {
  let body: { registration_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { registration_id } = body;
  if (!registration_id) {
    return NextResponse.json({ success: false, error: 'registration_id required' }, { status: 400 });
  }

  // Проверяем что маршрут существует и не завершён
  const existing = await query(
    `SELECT id, route_name, leader_name, end_date, completed_at
     FROM route_registrations WHERE id = $1`,
    [registration_id]
  );

  if (existing.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Маршрут не найден' }, { status: 404 });
  }

  const route = existing.rows[0];
  if (route.completed_at) {
    return NextResponse.json({
      success: true,
      message: 'Возврат уже отмечен',
      already_completed: true,
    });
  }

  await query(
    `UPDATE route_registrations SET completed_at = now() WHERE id = $1`,
    [registration_id]
  );

  return NextResponse.json({
    success: true,
    message: `С возвращением! Маршрут "${route.route_name}" закрыт.`,
    route_name: route.route_name,
  });
}

/**
 * GET /api/safety/return?registration_id=xxx
 * Проверяет статус маршрута (для кнопки в PWA)
 */
export async function GET(request: NextRequest) {
  const registrationId = request.nextUrl.searchParams.get('registration_id');
  if (!registrationId) {
    return NextResponse.json({ success: false, error: 'registration_id required' }, { status: 400 });
  }

  const result = await query(
    `SELECT id, route_name, leader_name, start_date, end_date, completed_at, mchs_status
     FROM route_registrations WHERE id = $1`,
    [registrationId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Маршрут не найден' }, { status: 404 });
  }

  const route = result.rows[0];
  return NextResponse.json({
    success: true,
    route: {
      id: route.id,
      name: route.route_name,
      leader: route.leader_name,
      start_date: route.start_date,
      end_date: route.end_date,
      completed: !!route.completed_at,
      completed_at: route.completed_at,
      mchs_status: route.mchs_status,
    },
  });
}
