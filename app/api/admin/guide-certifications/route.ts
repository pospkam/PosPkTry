import { safeMsg } from '@/lib/errors/sanitize';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { z } from 'zod';

const VerifyCertificationSchema = z.object({
  id: z.string().min(1, 'ID сертификата обязателен'),
  is_verified: z.boolean({ required_error: 'Поле is_verified обязательно' }),
});

export const dynamic = 'force-dynamic';

interface CertRow {
  id: string;
  guide_id: string;
  guide_name: string | null;
  guide_email: string | null;
  name: string;
  issuing_authority: string;
  issue_date: string | null;
  expiry_date: string | null;
  certificate_number: string | null;
  document_url: string | null;
  is_verified: boolean;
  created_at: string;
}

// GET /api/admin/guide-certifications — list all with guide info
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const verified = searchParams.get('verified'); // true | false | null=all

  try {
    const params: (string | boolean)[] = [];
    let where = '';
    if (verified === 'true') { where = 'WHERE gc.is_verified = true'; }
    else if (verified === 'false') { where = 'WHERE gc.is_verified = false'; }

    const result = await query<CertRow>(
      `SELECT gc.*, p.company_name as guide_name, u.email as guide_email
       FROM guide_certifications gc
       JOIN partners p ON gc.guide_id = p.id
       LEFT JOIN users u ON p.user_id = u.id
       ${where}
       ORDER BY gc.created_at DESC`,
      params
    );

    // Stats
    const statsResult = await query<{ total: string; verified: string; expired: string }>(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE is_verified = true) as verified,
         COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date < NOW()) as expired
       FROM guide_certifications`,
      []
    );

    return NextResponse.json({
      success: true,
      data: {
        items: result.rows,
        stats: statsResult.rows[0] ?? { total: '0', verified: '0', expired: '0' },
      },
    });
  } catch (error) {
    const msg = safeMsg(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PATCH /api/admin/guide-certifications — verify/unverify
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = VerifyCertificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' }, { status: 400 });
    }
    const { id, is_verified } = parsed.data;

    await query(
      `UPDATE guide_certifications SET is_verified = $1, updated_at = NOW() WHERE id = $2`,
      [is_verified, id]
    );

    return NextResponse.json({ success: true, message: is_verified ? 'Сертификат подтверждён' : 'Подтверждение снято' });
  } catch (error) {
    const msg = safeMsg(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
