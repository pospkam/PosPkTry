/**
 * POST /api/operator-agreements/content-consent
 * GET /api/operator-agreements/content-consent
 *
 * Управление согласием операторов на парсинг и публикацию контента
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';
import { requireRole } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const ContentConsentSchema = z.object({
  allow_parsing_website: z.boolean().default(false),
  allow_parsing_images: z.boolean().default(false),
  allow_parsing_reviews: z.boolean().default(false),
  allow_publication_tourhab: z.boolean().default(false),
  allow_publication_partners: z.boolean().default(false),
  allow_publication_social_media: z.boolean().default(false),
  content_usage_limit: z.enum(['unlimited', 'russian_market_only', 'exclude_competitors']).default('russian_market_only'),
});

// ── GET: Текущие согласия контент-партнёра ────────────────────────────────

export async function GET(req: NextRequest) {
  const authOrResponse = await requireRole(req, ['operator', 'admin']);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const userId = authOrResponse.id;

  try {
    // Найти партнёра по user_id
    const { rows: partners } = await pool.query(
      `SELECT id FROM partners WHERE admin_user_id = $1 LIMIT 1`,
      [userId]
    );

    if (!partners.length) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    const partnerId = partners[0].id;

    // Получить согласия
    const { rows } = await pool.query(
      `SELECT * FROM content_consents WHERE partner_id = $1`,
      [partnerId]
    );

    const consent = rows[0] || null;

    return NextResponse.json({
      success: true,
      partner_id: partnerId,
      consent,
      default_consent: {
        allow_parsing_website: true,
        allow_parsing_images: false,
        allow_parsing_reviews: false,
        allow_publication_tourhab: true,
        allow_publication_partners: false,
        allow_publication_social_media: false,
        content_usage_limit: 'russian_market_only',
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ── POST: Обновить согласия контента ──────────────────────────────────────

export async function POST(req: NextRequest) {
  const authOrResponse = await requireRole(req, ['operator', 'admin']);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const userId = authOrResponse.id;

  try {
    const body = await req.json();
    const parsed = ContentConsentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid consent data' },
        { status: 400 }
      );
    }

    // Найти партнёра
    const { rows: partners } = await pool.query(
      `SELECT id FROM partners WHERE admin_user_id = $1 LIMIT 1`,
      [userId]
    );

    if (!partners.length) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    const partnerId = partners[0].id;
    const consentData = parsed.data;

    // Обновить или создать согласие
    const result = await pool.query(
      `INSERT INTO content_consents
        (partner_id, allow_parsing_website, allow_parsing_images, allow_parsing_reviews,
         allow_publication_tourhab, allow_publication_partners, allow_publication_social_media,
         content_usage_limit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (partner_id) DO UPDATE SET
         allow_parsing_website = $2,
         allow_parsing_images = $3,
         allow_parsing_reviews = $4,
         allow_publication_tourhab = $5,
         allow_publication_partners = $6,
         allow_publication_social_media = $7,
         content_usage_limit = $8,
         consent_version = consent_version + 1,
         updated_at = NOW()
       RETURNING *`,
      [
        partnerId,
        consentData.allow_parsing_website,
        consentData.allow_parsing_images,
        consentData.allow_parsing_reviews,
        consentData.allow_publication_tourhab,
        consentData.allow_publication_partners,
        consentData.allow_publication_social_media,
        consentData.content_usage_limit,
      ]
    );

    // Логирование
    await pool.query(
      `INSERT INTO agreement_audit_log
        (partner_id, action, agreement_type, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        partnerId,
        'consent_updated',
        'content_consent',
        JSON.stringify(consentData),
      ]
    );

    return NextResponse.json({
      success: true,
      consent: result.rows[0],
      message: 'Согласие на парсинг обновлено',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
