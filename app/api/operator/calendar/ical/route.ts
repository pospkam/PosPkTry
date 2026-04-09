/**
 * GET /api/operator/calendar/ical
 * Экспорт подтверждённых бронирований оператора в формате RFC 5545 (.ics).
 * Совместим с Google Calendar, Apple Calendar, Outlook.
 *
 * Query params:
 *   months — кол-во месяцев вперёд (default: 3, max: 12)
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { requireOperator } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

interface BookingRow {
  id: string;
  tour_title: string;
  booking_date: string;
  participants: number;
  tourist_name: string | null;
  tourist_phone: string | null;
  final_price: string | null;
  booking_status: string;
  special_requests: string | null;
  created_at: Date;
}

function icalDate(dateStr: string): string {
  // YYYY-MM-DD → YYYYMMDD (all-day event)
  return dateStr.replace(/-/g, '');
}

function icalDateTime(dt: Date): string {
  return dt.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
}

function escapeIcal(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function foldLine(line: string): string {
  // RFC 5545: fold lines longer than 75 octets
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const lines: string[] = [];
  let pos = 0;
  let first = true;
  while (pos < line.length) {
    const chunk = line.slice(pos, pos + (first ? 75 : 74));
    lines.push(first ? chunk : ' ' + chunk);
    pos += first ? 75 : 74;
    first = false;
  }
  return lines.join('\r\n');
}

async function getOperatorId(userId: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT id, name FROM partners WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0]?.id ?? null;
}

async function getOperatorName(userId: string): Promise<string> {
  const { rows } = await pool.query(
    `SELECT name FROM partners WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return (rows[0]?.name as string | undefined) ?? 'Оператор';
}

export async function GET(request: NextRequest) {
  const authOrResponse = await requireOperator(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const operatorId = await getOperatorId(authOrResponse.userId);
  if (!operatorId) {
    return NextResponse.json({ success: false, error: 'Профиль оператора не найден' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const months = Math.min(12, Math.max(1, Number(searchParams.get('months') ?? '3')));

  const dateFrom = new Date().toISOString().slice(0, 10);
  const dateTo   = new Date(Date.now() + months * 30 * 86_400_000).toISOString().slice(0, 10);

  const { rows } = await pool.query<BookingRow>(
    `SELECT
       b.id::text,
       t.title            AS tour_title,
       b.booking_date::text,
       b.participants,
       b.tourist_name,
       b.tourist_phone,
       b.final_price,
       b.booking_status,
       b.special_requests,
       b.created_at
     FROM operator_bookings b
     JOIN operator_tours t ON b.operator_tour_id = t.id
     WHERE t.operator_id = $1
       AND b.booking_date >= $2
       AND b.booking_date <= $3
       AND b.booking_status IN ('confirmed', 'new', 'completed')
       AND b.deleted_at IS NULL
     ORDER BY b.booking_date ASC, b.created_at ASC`,
    [operatorId, dateFrom, dateTo]
  );

  const operatorName = await getOperatorName(authOrResponse.userId);
  const now = new Date();

  const STATUS_ICAL: Record<string, string> = {
    confirmed: 'CONFIRMED',
    new:       'TENTATIVE',
    completed: 'CONFIRMED',
  };

  const events = rows.map(b => {
    const status    = STATUS_ICAL[b.booking_status] ?? 'TENTATIVE';
    const summary   = escapeIcal(`${b.tour_title} — ${b.tourist_name ?? 'Гость'} (${b.participants} чел)`);
    const startDay  = icalDate(b.booking_date);
    const price     = b.final_price ? Number(b.final_price).toLocaleString('ru-RU') + ' ₽' : '';
    const descParts = [
      b.tourist_name  ? `Турист: ${b.tourist_name}` : '',
      b.tourist_phone ? `Тел: ${b.tourist_phone}`   : '',
      price           ? `Сумма: ${price}`            : '',
      b.special_requests ? `Запросы: ${b.special_requests}` : '',
    ].filter(Boolean);
    const description = escapeIcal(descParts.join('\\n'));

    return [
      'BEGIN:VEVENT',
      foldLine(`UID:booking-${b.id}@kamchatourhub`),
      foldLine(`DTSTART;VALUE=DATE:${startDay}`),
      foldLine(`DTEND;VALUE=DATE:${startDay}`),
      foldLine(`DTSTAMP:${icalDateTime(now)}`),
      foldLine(`CREATED:${icalDateTime(b.created_at)}`),
      foldLine(`SUMMARY:${summary}`),
      description ? foldLine(`DESCRIPTION:${description}`) : '',
      'LOCATION:Камчатка',
      `STATUS:${status}`,
      foldLine(`CATEGORIES:Туры\\,KamchatourHub`),
      'END:VEVENT',
    ].filter(Boolean).join('\r\n');
  });

  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KamchatourHub//TourCalendar//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldLine(`X-WR-CALNAME:Туры — ${escapeIcal(operatorName)}`),
    'X-WR-TIMEZONE:Asia/Kamchatka',
    'X-WR-CALDESC:Бронирования туров на KamchatourHub',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  const filename = `kamchatourhub-tours-${dateFrom}.ics`;

  return new NextResponse(calendar, {
    status: 200,
    headers: {
      'Content-Type':        'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  });
}
