import { safeMsg } from '@/lib/errors/sanitize';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

interface BookingLogRow {
  id: string;
  booking_id: string;
  from_status: string;
  to_status: string;
  changed_by: string;
  changer_name: string | null;
  changer_email: string | null;
  comment: string | null;
  created_at: string;
}

// GET /api/bookings/[id]/logs — booking status change history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id: bookingId } = await params;

  try {
    const result = await query<BookingLogRow>(
      `SELECT bl.*, u.name as changer_name, u.email as changer_email
       FROM booking_logs bl
       LEFT JOIN users u ON bl.changed_by = u.id
       WHERE bl.booking_id = $1
       ORDER BY bl.created_at ASC`,
      [bookingId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    const msg = safeMsg(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
